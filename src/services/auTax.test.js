import {
  incomeTax,
  lito,
  medicareLevy,
  medicareLevySurcharge,
  helpRepayment,
  superFromIncome,
  calcTakeHome,
  perPeriod,
} from "./auTax";

describe("auTax FY2025-26", () => {
  test("income tax matches ATO bracket boundaries", () => {
    expect(incomeTax(18200)).toBeCloseTo(0, 2);
    expect(incomeTax(45000)).toBeCloseTo(4288, 2);
    expect(incomeTax(135000)).toBeCloseTo(31288, 2);
    expect(incomeTax(190000)).toBeCloseTo(51638, 2);
    expect(incomeTax(100000)).toBeCloseTo(20788, 2);
  });

  test("LITO phase-out", () => {
    expect(lito(30000)).toBe(700);
    expect(lito(45000)).toBeCloseTo(325, 2);
    expect(lito(66667)).toBeCloseTo(0, 1);
    expect(lito(80000)).toBe(0);
  });

  test("Medicare levy: nil below threshold, full 2% well above, shade-in between", () => {
    expect(medicareLevy(25000)).toBe(0);
    expect(medicareLevy(100000)).toBeCloseTo(2000, 2);
    const shade = medicareLevy(30000); // between 28011 and ~35014
    expect(shade).toBeGreaterThan(0);
    expect(shade).toBeLessThan(0.02 * 30000);
  });

  test("MLS: applies only without hospital cover and above threshold", () => {
    expect(
      medicareLevySurcharge(120000, { hasHospitalCover: true }).amount,
    ).toBe(0);
    expect(
      medicareLevySurcharge(90000, { hasHospitalCover: false }).amount,
    ).toBe(0); // below single $101k
    const t1 = medicareLevySurcharge(110000, { hasHospitalCover: false });
    expect(t1.rate).toBe(0.01); // $101,001–$118,000 → 1%
    const t2 = medicareLevySurcharge(120000, { hasHospitalCover: false });
    expect(t2.rate).toBe(0.0125); // $118,001–$158,000 → 1.25%
  });

  test("MLS family threshold rises with dependants", () => {
    const single = medicareLevySurcharge(150000, { hasHospitalCover: false });
    expect(single.rate).toBeGreaterThan(0); // 150k > 101k single
    const family = medicareLevySurcharge(150000, {
      hasHospitalCover: false,
      isFamily: true,
      dependents: 2,
    });
    expect(family.amount).toBe(0); // 150k < 202k family threshold
    expect(family.freeThreshold).toBe(202000 + 1500); // +$1,500 for the 2nd child
  });

  test("HELP repayment new marginal system", () => {
    expect(helpRepayment(60000)).toBe(0);
    expect(helpRepayment(67000)).toBe(0);
    expect(helpRepayment(100000)).toBeCloseTo(0.15 * (100000 - 67000), 2);
    expect(helpRepayment(125000)).toBeCloseTo(8700, 2);
    expect(helpRepayment(100000, { hasDebt: false })).toBe(0);
  });

  test("super includes vs excludes", () => {
    expect(
      superFromIncome(100000, { includesSuper: false, sgRate: 0.12 })
        .superAmount,
    ).toBeCloseTo(12000, 2);
    const inc = superFromIncome(112000, { includesSuper: true, sgRate: 0.12 });
    expect(inc.cashSalary).toBeCloseTo(100000, 2);
    expect(inc.superAmount).toBeCloseTo(12000, 2);
  });

  test("worked example: $100k excludes super, resident, no HELP, has cover", () => {
    const r = calcTakeHome({
      incomeAmount: 100000,
      frequency: "annual",
      includesSuper: false,
      sgRate: 12,
      hasHospitalCover: true,
    });
    expect(r.cashSalary).toBeCloseTo(100000, 2);
    expect(r.incomeTax).toBeCloseTo(20788, 2);
    expect(r.medicare).toBeCloseTo(2000, 2);
    expect(r.mls.amount).toBe(0);
    expect(r.totalTax).toBeCloseTo(22788, 2);
    expect(r.netAnnual).toBeCloseTo(77212, 2);
    expect(r.totalSuper).toBeCloseTo(12000, 2);
    expect(perPeriod(r.netAnnual, "monthly")).toBeCloseTo(6434.33, 1);
    expect(perPeriod(r.netAnnual, "weekly")).toBeCloseTo(1484.85, 1);
  });

  test("salary sacrifice reduces taxable income and adds to super", () => {
    const r = calcTakeHome({
      incomeAmount: 100000,
      includesSuper: false,
      sgRate: 12,
      salarySacrifice: 10000,
      salarySacrificeFrequency: "annual",
      hasHospitalCover: true,
    });
    expect(r.taxableIncome).toBeCloseTo(90000, 2);
    expect(r.totalSuper).toBeCloseTo(12000 + 10000, 2);
  });
});
