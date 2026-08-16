// Expands option/RSU grants into a forward vesting schedule for the equity-comp
// drill-down. Pure functions, no React — the chart that consumes them can't be
// asserted on in jsdom (recharts renders nothing at zero size), so the logic is
// tested here instead.
//
// Totals are anchored to the server: `vestedTranches` decides which tranches
// have vested, so client-side date math only ever decides which bucket a bar
// lands in. Drift in the date maths can shift a bar; it cannot corrupt a total.

/**
 * Add whole months to a yyyy-MM-dd date, clamping the day to the target month's
 * length — matching java.time.LocalDate.plusMonths, which the server uses to
 * lay out tranches. A naive Date#setMonth rolls 31 Jan + 1 month into 3 March
 * and would desync the two.
 */
export function addMonthsClamped(iso, months) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12; // 0-based month, always 0..11
  const daysInMonth = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, daysInMonth);
  const p = (n, w) => String(n).padStart(w, "0");
  return `${p(ny, 4)}-${p(nm + 1, 2)}-${p(nd, 2)}`;
}

// Value of one unit in the display currency. vested+unvested display values
// cover the whole grant, so dividing by quantity gives a per-unit figure that
// already carries the multiplier and the FX conversion — no need to re-derive
// either on the client.
function displayPerUnit(g) {
  const qty = Number(g.quantity) || 0;
  if (qty <= 0) return 0;
  const total =
    (Number(g.vestedValueDisplay) || 0) + (Number(g.unvestedValueDisplay) || 0);
  return total / qty;
}

/** Every tranche of one grant, as { date, quantity, value, vested }. */
export function grantTranches(g) {
  if (!g?.vestStartDate) return [];
  const qty = Number(g.quantity) || 0;
  const perUnit = displayPerUnit(g);
  const total = Number(g.totalTranches) || 0;
  const vestedCount = Number(g.vestedTranches) || 0;

  // The server treats a grant with no tranche count as fully vested on day one.
  if (total <= 0) {
    return [
      {
        date: g.vestStartDate,
        quantity: qty,
        value: qty * perUnit,
        vested: true,
      },
    ];
  }

  const interval = Math.max(1, Number(g.vestIntervalMonths) || 0);
  const trancheQty = qty / total;
  const out = [];
  for (let i = 1; i <= total; i++) {
    out.push({
      date: addMonthsClamped(g.vestStartDate, (i - 1) * interval),
      quantity: trancheQty,
      value: trancheQty * perUnit,
      vested: i <= vestedCount,
    });
  }
  return out;
}

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const name = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][m - 1];
  return `${name} ${String(y).slice(2)}`;
};

/**
 * Roll every grant's tranches into month buckets for the timeline chart.
 *
 * Grants worth nothing today (expired, or no underlying price) are left out
 * rather than drawn as zero bars — they would stretch the axis across dates
 * carrying no value. The count comes back as `skipped` so the UI can say so.
 */
export function buildVestingSchedule(grants) {
  const buckets = new Map();
  let skipped = 0;

  (grants || []).forEach((g) => {
    const tranches = grantTranches(g);
    if (!tranches.length) return;
    if (!tranches.some((t) => t.value > 0)) {
      skipped += 1;
      return;
    }
    tranches.forEach((t) => {
      const ym = t.date.slice(0, 7);
      const b = buckets.get(ym) || { month: ym, vested: 0, scheduled: 0 };
      if (t.vested) b.vested += t.value;
      else b.scheduled += t.value;
      buckets.set(ym, b);
    });
  });

  const rows = [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      ...b,
      vested: Math.round(b.vested * 100) / 100,
      scheduled: Math.round(b.scheduled * 100) / 100,
      label: monthLabel(b.month),
    }));

  return { rows, skipped };
}

/** The soonest upcoming vest across all grants, or null if everything has vested. */
export function nextVestAcrossGrants(grants) {
  return (
    (grants || [])
      .filter((g) => g.nextVestDate)
      .map((g) => ({
        date: g.nextVestDate,
        value: Number(g.nextVestValueDisplay) || 0,
        name: g.name || g.underlyingTicker,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  );
}

/**
 * That asset class's value across snapshots.
 *
 * Points whose breakdown is null are dropped, not zeroed: those snapshots
 * predate breakdown capture, so their value for this class is unknown and
 * plotting a zero would invent a dip that never happened. A present breakdown
 * missing this class IS a real zero — runSnapshot omits zero-valued classes.
 */
export function categoryHistory(snapshots, assetClass) {
  const all = snapshots || [];
  const rows = all
    .filter((s) => s.breakdown != null)
    .map((s) => ({
      date: s.asOfDate,
      value: Number(s.breakdown[assetClass]) || 0,
    }));
  return { rows, skipped: all.length - rows.length };
}

/** Timeframe options for the net-worth chart. `months: null` means everything. */
export const SNAPSHOT_RANGES = [
  { key: "6M", label: "6M", months: 6 },
  { key: "1Y", label: "1Y", months: 12 },
  { key: "5Y", label: "5Y", months: 60 },
  { key: "MAX", label: "Max", months: null },
];

/**
 * Snapshots falling inside a timeframe. Dates are yyyy-MM-dd so a string
 * comparison against the cutoff is a correct chronological one.
 */
export function snapshotsInRange(snapshots, months, today) {
  const all = snapshots || [];
  if (months == null) return all;
  const cutoff = addMonthsClamped(today, -months);
  return all.filter((s) => String(s.asOfDate) >= cutoff);
}

/** How many snapshots each timeframe would show, keyed by range. */
export function countByRange(snapshots, today) {
  const out = {};
  SNAPSHOT_RANGES.forEach((r) => {
    out[r.key] = snapshotsInRange(snapshots, r.months, today).length;
  });
  return out;
}

/**
 * Every asset class's value at each snapshot, shaped for a stacked area chart.
 *
 * Same rule as {@link categoryHistory}: snapshots without a breakdown are
 * dropped (unknown), while a class absent from a breakdown that IS present is a
 * real zero. Classes are ordered largest-last so the biggest band sits at the
 * top of the stack and the small ones stay legible along the baseline.
 *
 * With `asPercent`, each row is normalised to 100 — that shows allocation drift
 * even while the portfolio total is growing.
 */
export function allocationHistory(snapshots, asPercent) {
  const all = snapshots || [];
  const withBreakdown = all.filter((s) => s.breakdown != null);

  const totals = new Map();
  withBreakdown.forEach((s) =>
    Object.entries(s.breakdown).forEach(([k, v]) =>
      totals.set(k, (totals.get(k) || 0) + (Number(v) || 0)),
    ),
  );
  const classes = [...totals.keys()].sort(
    (a, b) => totals.get(a) - totals.get(b),
  );

  const rows = withBreakdown.map((s) => {
    const row = { date: s.asOfDate };
    const total = classes.reduce(
      (a, c) => a + (Number(s.breakdown[c]) || 0),
      0,
    );
    classes.forEach((c) => {
      const v = Number(s.breakdown[c]) || 0;
      row[c] = asPercent ? (total > 0 ? (v / total) * 100 : 0) : v;
    });
    return row;
  });

  return { rows, classes, skipped: all.length - withBreakdown.length };
}
