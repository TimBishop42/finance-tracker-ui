// Australian personal income-tax / take-home-pay calculations.
// FY-keyed so future years drop in. General information for FY2025-26 — NOT
// financial or tax advice; thresholds change yearly.

export const FY_DEFAULT = "2025-26";

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// --- Resident income tax brackets (cumulative, upper-bound form) ---
// Lowest marginal rate is legislated to fall to 15% (FY2026-27) and 14%
// (FY2027-28); add those keys when supporting future years.
const TAX_BRACKETS = {
  "2025-26": [
    { upTo: 18200, rate: 0 },
    { upTo: 45000, rate: 0.16 },
    { upTo: 135000, rate: 0.3 },
    { upTo: 190000, rate: 0.37 },
    { upTo: Infinity, rate: 0.45 },
  ],
};

export function incomeTax(taxable, fy = FY_DEFAULT) {
  const brackets = TAX_BRACKETS[fy] || TAX_BRACKETS[FY_DEFAULT];
  const ti = Math.max(0, num(taxable));
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    if (ti > b.upTo) {
      tax += (b.upTo - lower) * b.rate;
      lower = b.upTo;
    } else {
      tax += (ti - lower) * b.rate;
      break;
    }
  }
  return tax;
}

// "Not claiming the tax-free threshold" — approximate by also taxing the first
// $18,200 at the lowest marginal rate (real PAYG withholding differs slightly).
export function incomeTaxNoTaxFreeThreshold(taxable, fy = FY_DEFAULT) {
  return (
    incomeTax(taxable, fy) + 0.16 * Math.min(Math.max(0, num(taxable)), 18200)
  );
}

// --- Low Income Tax Offset (FY2025-26) — reduces income tax only ---
export function lito(taxable) {
  const ti = Math.max(0, num(taxable));
  if (ti <= 37500) return 700;
  if (ti <= 45000) return Math.max(0, 700 - 0.05 * (ti - 37500));
  if (ti <= 66667) return Math.max(0, 325 - 0.015 * (ti - 45000));
  return 0;
}

// --- Medicare levy (FY2025-26) ---
const MEDICARE = {
  rate: 0.02,
  singleLower: 28011, // no levy below this
  familyLower: 47238, // family (couple/with dependants) lower threshold
  familyChildIncrement: 4216, // per dependent child, added to the family lower threshold
};

// Standard 2% with a 10c/$ shade-in above the lower threshold. For families we
// only know one income, so we test against the individual's taxable income
// (a simplification — true test uses combined family income).
export function medicareLevy(
  taxable,
  { isFamily = false, dependents = 0 } = {},
) {
  const ti = Math.max(0, num(taxable));
  const lower = isFamily
    ? MEDICARE.familyLower +
      MEDICARE.familyChildIncrement * Math.max(0, num(dependents))
    : MEDICARE.singleLower;
  if (ti <= lower) return 0;
  const shadeIn = 0.1 * (ti - lower);
  const full = MEDICARE.rate * ti;
  return Math.min(full, shadeIn);
}

// --- Medicare Levy Surcharge (FY2025-26) — only without private hospital cover ---
const MLS = {
  single: [
    { upTo: 101000, rate: 0 },
    { upTo: 118000, rate: 0.01 },
    { upTo: 158000, rate: 0.0125 },
    { upTo: Infinity, rate: 0.015 },
  ],
  familyBase: [
    { upTo: 202000, rate: 0 },
    { upTo: 236000, rate: 0.01 },
    { upTo: 316000, rate: 0.0125 },
    { upTo: Infinity, rate: 0.015 },
  ],
  childIncrement: 1500, // per dependent child AFTER the first
};

export function mlsThresholds({ isFamily = false, dependents = 0 } = {}) {
  const inc = isFamily
    ? MLS.childIncrement * Math.max(0, num(dependents) - 1)
    : 0;
  const table = isFamily ? MLS.familyBase : MLS.single;
  return table.map((t) => ({
    rate: t.rate,
    upTo: t.upTo === Infinity ? Infinity : t.upTo + inc,
  }));
}

// MLS is a flat % of income for the applicable tier (not marginal).
export function medicareLevySurcharge(
  income,
  { hasHospitalCover = false, isFamily = false, dependents = 0 } = {},
) {
  const table = mlsThresholds({ isFamily, dependents });
  const inc = Math.max(0, num(income));
  let rate = 0;
  for (const t of table) {
    if (inc <= t.upTo) {
      rate = t.rate;
      break;
    }
  }
  // The first non-zero band's lower bound is the surcharge-free threshold.
  const freeThreshold = table[0].upTo;
  if (hasHospitalCover) {
    return { rate: 0, amount: 0, freeThreshold, thresholds: table };
  }
  return { rate, amount: rate * inc, freeThreshold, thresholds: table };
}

// --- HELP/STSL compulsory repayment (FY2025-26 new marginal system) ---
export function helpRepayment(repaymentIncome, { hasDebt = true } = {}) {
  if (!hasDebt) return 0;
  const ri = Math.max(0, num(repaymentIncome));
  if (ri <= 67000) return 0;
  if (ri <= 125000) return 0.15 * (ri - 67000);
  if (ri <= 179285) return 8700 + 0.17 * (ri - 125000);
  return 0.1 * ri;
}

// --- Superannuation ---
export function superFromIncome(
  amount,
  { includesSuper = false, sgRate = 0.12 } = {},
) {
  const a = Math.max(0, num(amount));
  if (includesSuper) {
    const cash = a / (1 + sgRate);
    return { cashSalary: cash, superAmount: a - cash };
  }
  return { cashSalary: a, superAmount: a * sgRate };
}

const PERIODS = { annual: 1, monthly: 12, fortnightly: 26, weekly: 52 };
export const CONCESSIONAL_CAP = 30000;

/**
 * Full take-home calculation. All money fields in the result are ANNUAL.
 * Use perPeriod(value, "monthly"|"fortnightly"|"weekly") to break down.
 */
export function calcTakeHome(input, fy = FY_DEFAULT) {
  const {
    incomeAmount = 0,
    frequency = "annual",
    includesSuper = false,
    sgRate = 12,
    salarySacrifice = 0,
    salarySacrificeFrequency = "annual",
    claimTaxFreeThreshold = true,
    hasHelpDebt = false,
    hasHospitalCover = false,
    isFamily = false,
    dependents = 0,
  } = input;

  const sg = num(sgRate) / 100;
  const grossAnnual = num(incomeAmount) * (PERIODS[frequency] || 1);
  const { cashSalary, superAmount: sgSuper } = superFromIncome(grossAnnual, {
    includesSuper,
    sgRate: sg,
  });

  const sacrificeAnnual =
    num(salarySacrifice) * (salarySacrificeFrequency === "monthly" ? 12 : 1);
  const sacrifice = Math.min(Math.max(0, sacrificeAnnual), cashSalary);

  const taxableIncome = Math.max(0, cashSalary - sacrifice);

  const taxBeforeOffset = claimTaxFreeThreshold
    ? incomeTax(taxableIncome, fy)
    : incomeTaxNoTaxFreeThreshold(taxableIncome, fy);
  const litoAmount = lito(taxableIncome);
  const incomeTaxAfterOffset = Math.max(0, taxBeforeOffset - litoAmount);

  const medicare = medicareLevy(taxableIncome, { isFamily, dependents });
  const mls = medicareLevySurcharge(taxableIncome, {
    hasHospitalCover,
    isFamily,
    dependents,
  });
  const help = helpRepayment(taxableIncome, { hasDebt: hasHelpDebt });

  const totalTax = incomeTaxAfterOffset + medicare + mls.amount + help;
  const netAnnual = Math.max(0, cashSalary - sacrifice - totalTax);

  // Concessional contributions (SG + salary sacrifice) are taxed 15% inside the
  // fund, so the amount that actually lands in super is the gross less that tax.
  const totalSuper = sgSuper + sacrifice;
  const superContributionsTax = totalSuper * 0.15;
  const netSuper = totalSuper - superContributionsTax;

  return {
    grossAnnual,
    cashSalary,
    taxableIncome,
    incomeTax: incomeTaxAfterOffset,
    lito: litoAmount,
    medicare,
    mls, // { rate, amount, freeThreshold, thresholds }
    help,
    totalTax,
    netAnnual,
    sgSuper,
    sacrifice,
    totalSuper,
    superContributionsTax,
    netSuper,
    concessionalCap: CONCESSIONAL_CAP,
    concessionalExceeded: totalSuper > CONCESSIONAL_CAP,
    isFamily,
    dependents: num(dependents),
  };
}

export function perPeriod(annualValue, frequency) {
  return num(annualValue) / (PERIODS[frequency] || 1);
}
