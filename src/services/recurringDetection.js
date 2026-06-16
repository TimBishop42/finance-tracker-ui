import { classifyMerchant } from "./merchantKnowledge";

function median(arr) {
  if (!arr.length) return 1;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, a) => s + (a - mean) ** 2, 0) / arr.length);
}

function cv(arr) {
  if (arr.length < 2) return 1;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return mean > 0 ? stddev(arr) / mean : 1;
}

// Known payment cadences. tolerance is the fraction the gap can deviate from
// the ideal and still count as a match. minTxns is the minimum number of
// transactions required before we trust the pattern. minAvgAmount filters out
// small-ticket noise (coffee, snacks, etc.) at each cadence.
const INTERVALS = [
  { name: "annual", days: 365, tolerance: 0.22, minTxns: 2, minAvgAmount: 15 },
  {
    name: "semi-annual",
    days: 182,
    tolerance: 0.22,
    minTxns: 2,
    minAvgAmount: 15,
  },
  {
    name: "quarterly",
    days: 91,
    tolerance: 0.25,
    minTxns: 3,
    minAvgAmount: 15,
  },
  { name: "monthly", days: 30, tolerance: 0.35, minTxns: 3, minAvgAmount: 15 },
  // bi-weekly needs a higher amount floor because it is easy to confuse with
  // consistent-but-mundane spend (coffee shop twice a month, etc.)
  { name: "bi-weekly", days: 14, tolerance: 0.3, minTxns: 4, minAvgAmount: 25 },
];

// Last transaction must have occurred within (interval days × this) to be
// considered still active.
const RECENCY_MULTIPLIER = 1.8;

// Amount coefficient-of-variation below which we call something a subscription.
// Relaxed from the old 0.10 to tolerate minor annual price increases.
const SUBSCRIPTION_CV_THRESHOLD = 0.15;

// Maximum day-of-month standard deviation for a bill to appear on the calendar.
const MAX_DAY_STDDEV = 10;

/**
 * Given a sorted list of Date objects, compute consecutive gaps in days,
 * normalise any "double gaps" (a skipped payment), and return the best-fitting
 * interval pattern together with match statistics.
 *
 * Returns null when no interval reaches 60 % gap coverage.
 */
function detectInterval(dates) {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort((a, b) => a - b);
  const rawGaps = [];
  for (let i = 1; i < sorted.length; i++) {
    rawGaps.push((sorted[i] - sorted[i - 1]) / 86_400_000);
  }

  let best = null;
  let bestScore = 0;

  for (const interval of INTERVALS) {
    if (sorted.length < interval.minTxns) continue;

    const { days, tolerance } = interval;
    const lo = days * (1 - tolerance);
    const hi = days * (1 + tolerance);
    const lo2 = days * 2 * (1 - tolerance * 0.6);
    const hi2 = days * 2 * (1 + tolerance * 0.6);

    // A gap of roughly 2× the base interval means one payment was missed;
    // fold it back to the base so the stats remain meaningful.
    const normGaps = rawGaps.map((g) => (g >= lo2 && g <= hi2 ? g / 2 : g));
    const matching = normGaps.filter((g) => g >= lo && g <= hi);
    const matchFraction = matching.length / normGaps.length;

    if (matchFraction < 0.6) continue;

    const gapCv = cv(normGaps);
    const gapMean = normGaps.reduce((a, b) => a + b, 0) / normGaps.length;
    // Higher match fraction and lower gap variance → better score
    const score = matchFraction * (1 - Math.min(gapCv, 1));

    if (score > bestScore) {
      bestScore = score;
      best = { ...interval, matchFraction, gapCv, gapMean };
    }
  }

  return best;
}

/**
 * Detects recurring merchants from a flat transaction list.
 *
 * Improvements over the previous calendar-month-based algorithm:
 *  - Analyses actual time gaps between consecutive transactions, not calendar
 *    month buckets — catches annual subscriptions and tolerates missed months.
 *  - Integrates the merchant knowledge base (merchantKnowledge.js) to
 *    pre-classify known subscriptions and bills, and to hard-exclude noisy
 *    everyday merchants (coffee, groceries, fast food, petrol).
 *  - Relaxed amount CV threshold (0.15 vs 0.10) catches subscriptions that
 *    have had a small annual price increase.
 *  - Per-cadence minimum average-amount floor prevents short-interval patterns
 *    (bi-weekly) from surfacing cheap recurring spend.
 *
 * Each returned entry has:
 *   name, key, count, distinctMonths, monthsRange, avg, total, cv,
 *   intervalName, category, lastDate, predictedDay, dayStddev,
 *   isSubscription, isBill, knowledgeSource, knowledgeType, transactions
 *
 * @param {Array} txns            Raw transaction objects
 * @param {Array} customMerchants User-defined rules [{merchantPattern, merchantType}]
 */
export function detectRecurring(txns, customMerchants = []) {
  const groups = {};
  txns.forEach((t) => {
    const key = (t.businessName || "").trim().toUpperCase();
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  return Object.entries(groups)
    .flatMap(([key, items]) => {
      const merchantName = items[0].businessName || key;
      const knowledge = classifyMerchant(merchantName, customMerchants);

      // Hard-exclude everyday noise regardless of transaction pattern
      if (knowledge.type === "noise") return [];

      const dates = items
        .map((t) =>
          t.transactionDateTime ? new Date(t.transactionDateTime) : null,
        )
        .filter(Boolean);

      if (dates.length < 2) return [];

      const intervalMatch = detectInterval(dates);
      const isKnown =
        knowledge.type === "subscription" || knowledge.type === "bill";

      // Unknown merchants with no detectable cadence are excluded
      if (!intervalMatch && !isKnown) return [];

      const amounts = items.map((t) => parseFloat(t.amount || 0));
      const total = amounts.reduce((a, b) => a + b, 0);
      const avg = total / amounts.length;

      const minAmount = intervalMatch?.minAvgAmount ?? 15;
      if (avg < minAmount) return [];

      const lastDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      const firstDate = new Date(Math.min(...dates.map((d) => d.getTime())));

      // Must have a transaction within the expected next cycle window
      const expectedNextDays =
        (intervalMatch?.days ?? 365) * RECENCY_MULTIPLIER;
      const recencyCutoffMs = Date.now() - expectedNextDays * 86_400_000;
      if (lastDate.getTime() < recencyCutoffMs) return [];

      const monthSet = new Set(
        dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`),
      );
      const monthsRange =
        (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
        lastDate.getMonth() -
        firstDate.getMonth() +
        1;

      const amountCv = cv(amounts);
      const days = dates.map((d) => d.getDate());
      const predictedDay = median(days);
      const dayStddev = stddev(days);

      const isSubscription =
        knowledge.type === "subscription" ||
        (knowledge.type !== "bill" && amountCv < SUBSCRIPTION_CV_THRESHOLD);

      const isMonthlyOrShorter =
        intervalMatch?.name === "monthly" ||
        intervalMatch?.name === "bi-weekly";
      const isBill =
        knowledge.type === "bill" ||
        (isMonthlyOrShorter && dayStddev <= MAX_DAY_STDDEV);

      const catCount = {};
      items.forEach((t) => {
        catCount[t.category] = (catCount[t.category] || 0) + 1;
      });
      const topCat = Object.entries(catCount).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];

      return [
        {
          name: merchantName,
          key,
          count: items.length,
          distinctMonths: monthSet.size,
          monthsRange,
          avg,
          total,
          cv: amountCv,
          intervalName: intervalMatch?.name ?? (isKnown ? "known" : null),
          category: topCat,
          lastDate,
          predictedDay,
          dayStddev,
          isSubscription,
          isBill,
          knowledgeSource: knowledge.source,
          knowledgeType: knowledge.type,
          transactions: items,
        },
      ];
    })
    .sort((a, b) => b.total - a.total);
}
