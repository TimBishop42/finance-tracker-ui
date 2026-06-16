// Superannuation / retirement projection engine (pure functions).
//
// Models the two phases of a super balance:
//   1. Accumulation — you contribute and the balance grows (15% contributions
//      tax + ~7% effective earnings tax in accumulation, fees, insurance).
//   2. Drawdown — an account-based pension: you draw an income and the
//      remaining balance keeps growing (0% earnings tax in pension phase).
//
// All figures are general illustrative projections based on user assumptions —
// NOT financial advice. Defaults are AU 2025-26 seed values (editable).

// Statutory minimum drawdown rates for an account-based pension (balance at
// 1 July x % each year). Standard (post-COVID) rates.
export const STATUTORY_MIN_DRAWDOWN = [
  { maxAge: 64, rate: 0.04 },
  { maxAge: 74, rate: 0.05 },
  { maxAge: 79, rate: 0.06 },
  { maxAge: 84, rate: 0.07 },
  { maxAge: 89, rate: 0.09 },
  { maxAge: 94, rate: 0.11 },
  { maxAge: Infinity, rate: 0.14 },
];

export function minDrawdownRate(age) {
  for (const band of STATUTORY_MIN_DRAWDOWN) {
    if (age <= band.maxAge) return band.rate;
  }
  return 0.14;
}

// AU 2025-26 seed defaults (all editable in the UI).
export const DEFAULT_SUPER_INPUTS = {
  // You & timeline
  currentAge: 35,
  retirementAge: 60, // preservation age is 60 for anyone born after 1 Jul 1964
  endAge: 90, // plan-to age (projection horizon)
  // Accumulation
  startingBalance: 50000,
  monthlyContribution: 1500, // net or gross depending on the tax toggle below
  contributionGrowthPct: 3.7, // wage inflation — grows contributions each year
  returnAccumPct: 7.5, // gross return before fees/tax (MoneySmart docs ~8%)
  earningsTaxAccumPct: 7, // ~7% effective earnings tax in accumulation (0 = model a net return)
  applyContribTax: true, // apply 15% contributions tax (entered contributions are pre-tax/concessional)
  feePct: 0.7, // annual % fee on balance
  feeFixedAnnual: 74, // annual fixed admin fee ($)
  insuranceAnnual: 0, // annual insurance premium ($)
  // Drawdown
  desiredAnnualDrawdown: 60000,
  useStatutoryMin: false, // draw the legislated minimum % instead of a fixed amount
  indexDrawdownToInflation: true, // grow the desired drawdown by inflation each year
  returnRetirePct: 6.0, // gross return in retirement (usually more conservative)
  // Global
  inflationPct: 2.5, // CPI — used for the real / "today's dollars" toggle
  displayMode: "real", // "real" (today's dollars) | "nominal"
};

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const monthlyRate = (annualPct) =>
  Math.pow(1 + num(annualPct) / 100, 1 / 12) - 1;

/**
 * Project a super balance through accumulation and drawdown.
 * @returns {{ series: Array, summary: Object }}
 *   series: one point per year of age, with nominal + real balances and any withdrawal.
 *   summary: headline figures (balance at retirement, income, depletion age, ...).
 */
export function projectSuper(input) {
  const i = { ...DEFAULT_SUPER_INPUTS, ...input };

  const currentAge = Math.max(0, Math.round(num(i.currentAge, 0)));
  const retirementAge = Math.max(
    currentAge,
    Math.round(num(i.retirementAge, currentAge)),
  );
  const endAge = Math.max(
    retirementAge,
    Math.round(num(i.endAge, retirementAge)),
  );

  const inflation = num(i.inflationPct) / 100;
  const realFactor = (age) => 1 / Math.pow(1 + inflation, age - currentAge);

  const rmAccum = monthlyRate(i.returnAccumPct);
  const rmRetire = monthlyRate(i.returnRetirePct);
  const feeMonthly = num(i.feePct) / 100 / 12;
  const feeFixedMonthly = num(i.feeFixedAnnual) / 12;
  const insuranceMonthly = num(i.insuranceAnnual) / 12;
  const earningsTaxAccum = num(i.earningsTaxAccumPct) / 100;
  const contribTaxRate = i.applyContribTax ? 0.15 : 0;

  const series = [];
  let balance = Math.max(0, num(i.startingBalance));
  let totalContributions = 0;

  const pushPoint = (age, withdrawalNominal = 0) => {
    const rf = realFactor(age);
    series.push({
      age,
      balanceNominal: balance,
      balanceReal: balance * rf,
      withdrawalNominal,
      withdrawalReal: withdrawalNominal * rf,
      phase:
        age < retirementAge
          ? "accumulation"
          : age === retirementAge
            ? "retirement"
            : "drawdown",
    });
  };

  pushPoint(currentAge);

  // --- Accumulation phase ---
  let contribMonthly = Math.max(0, num(i.monthlyContribution));
  for (let age = currentAge; age < retirementAge; age++) {
    for (let m = 0; m < 12; m++) {
      const contrib = contribMonthly * (1 - contribTaxRate);
      balance += contrib;
      totalContributions += contrib;

      const grossGrowth = balance * rmAccum;
      balance += grossGrowth - grossGrowth * earningsTaxAccum;

      balance -= balance * feeMonthly;
      balance -= feeFixedMonthly;
      balance -= insuranceMonthly;
      if (balance < 0) balance = 0;
    }
    contribMonthly *= 1 + num(i.contributionGrowthPct) / 100;
    pushPoint(age + 1);
  }

  const balanceAtRetirement = balance;

  // --- Drawdown phase (account-based pension; 0% earnings tax) ---
  let depletionAge = null;
  let desired = Math.max(0, num(i.desiredAnnualDrawdown));
  let firstYearWithdrawal = 0;

  for (let age = retirementAge; age < endAge; age++) {
    const withdrawalThisYear = i.useStatutoryMin
      ? balance * minDrawdownRate(age)
      : desired;
    if (age === retirementAge) firstYearWithdrawal = withdrawalThisYear;

    const monthlyW = withdrawalThisYear / 12;
    let depleted = false;
    for (let m = 0; m < 12; m++) {
      balance -= monthlyW;
      if (balance <= 0) {
        balance = 0;
        depletionAge = age + (m + 1) / 12;
        depleted = true;
        break;
      }
      balance += balance * rmRetire; // pension phase: no earnings tax
      balance -= balance * feeMonthly;
      balance -= feeFixedMonthly;
      if (balance < 0) balance = 0;
    }

    pushPoint(age + 1, withdrawalThisYear);
    if (depleted) break;
    if (i.indexDrawdownToInflation && !i.useStatutoryMin) {
      desired *= 1 + inflation;
    }
  }

  const rfRet = realFactor(retirementAge);
  const summary = {
    currentAge,
    retirementAge,
    endAge,
    balanceAtRetirementNominal: balanceAtRetirement,
    balanceAtRetirementReal: balanceAtRetirement * rfRet,
    firstYearIncomeNominal: firstYearWithdrawal,
    firstYearIncomeReal: firstYearWithdrawal * rfRet,
    monthlyIncomeNominal: firstYearWithdrawal / 12,
    monthlyIncomeReal: (firstYearWithdrawal / 12) * rfRet,
    depletionAge,
    moneyLasts: depletionAge === null,
    lastsUntilAge: depletionAge === null ? endAge : Math.floor(depletionAge),
    totalContributions,
  };

  return { series, summary };
}
