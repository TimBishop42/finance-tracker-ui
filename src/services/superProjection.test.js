import { projectSuper, minDrawdownRate } from "./superProjection";

describe("superProjection", () => {
  test("with zero return/fees/tax, balance grows by exactly the contributions", () => {
    const { summary } = projectSuper({
      currentAge: 30,
      retirementAge: 40, // 10 years
      endAge: 40, // no drawdown
      startingBalance: 10000,
      monthlyContribution: 1000,
      contributionGrowthPct: 0,
      returnAccumPct: 0,
      earningsTaxAccumPct: 0,
      applyContribTax: false,
      feePct: 0,
      feeFixedAnnual: 0,
      insuranceAnnual: 0,
      inflationPct: 0,
    });
    // 10000 start + 1000 * 12 * 10 years = 130000
    expect(summary.balanceAtRetirementNominal).toBeCloseTo(130000, 2);
  });

  test("15% contributions tax reduces effective contributions", () => {
    const base = {
      currentAge: 30,
      retirementAge: 31,
      endAge: 31,
      startingBalance: 0,
      monthlyContribution: 1000,
      contributionGrowthPct: 0,
      returnAccumPct: 0,
      earningsTaxAccumPct: 0,
      feePct: 0,
      feeFixedAnnual: 0,
      insuranceAnnual: 0,
      inflationPct: 0,
    };
    const taxed = projectSuper({ ...base, applyContribTax: true });
    const untaxed = projectSuper({ ...base, applyContribTax: false });
    expect(untaxed.summary.balanceAtRetirementNominal).toBeCloseTo(12000, 2);
    expect(taxed.summary.balanceAtRetirementNominal).toBeCloseTo(
      12000 * 0.85,
      2,
    );
  });

  test("real equals nominal when inflation is zero", () => {
    const { series } = projectSuper({ inflationPct: 0 });
    for (const p of series) {
      expect(p.balanceReal).toBeCloseTo(p.balanceNominal, 4);
    }
  });

  test("real is below nominal once inflation is positive", () => {
    const { summary } = projectSuper({
      inflationPct: 2.5,
      currentAge: 35,
      retirementAge: 65,
    });
    expect(summary.balanceAtRetirementReal).toBeLessThan(
      summary.balanceAtRetirementNominal,
    );
  });

  test("flags depletion when drawdown vastly exceeds the balance", () => {
    const { summary } = projectSuper({
      currentAge: 60,
      retirementAge: 60,
      endAge: 90,
      startingBalance: 100000,
      monthlyContribution: 0,
      returnRetirePct: 0,
      desiredAnnualDrawdown: 50000, // depletes in ~2 years
      useStatutoryMin: false,
      indexDrawdownToInflation: false,
      feePct: 0,
      feeFixedAnnual: 0,
    });
    expect(summary.moneyLasts).toBe(false);
    expect(summary.depletionAge).not.toBeNull();
    expect(summary.depletionAge).toBeLessThan(63);
  });

  test("statutory minimum first-year income matches balance x age rate", () => {
    const { summary } = projectSuper({
      currentAge: 60,
      retirementAge: 60,
      endAge: 90,
      useStatutoryMin: true,
    });
    const expected = summary.balanceAtRetirementNominal * minDrawdownRate(60); // 4%
    expect(summary.firstYearIncomeNominal).toBeCloseTo(expected, 2);
  });

  test("statutory drawdown rates step up with age", () => {
    expect(minDrawdownRate(60)).toBe(0.04);
    expect(minDrawdownRate(70)).toBe(0.05);
    expect(minDrawdownRate(77)).toBe(0.06);
    expect(minDrawdownRate(96)).toBe(0.14);
  });
});
