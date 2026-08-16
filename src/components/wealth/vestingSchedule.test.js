import {
  addMonthsClamped,
  grantTranches,
  buildVestingSchedule,
  nextVestAcrossGrants,
  categoryHistory,
  snapshotsInRange,
  countByRange,
  allocationHistory,
} from "./vestingSchedule";

// The tranche dates here mirror OptionValuationServiceTest.java — if the two
// ever disagree the timeline stops lining up with the vested/unvested split.

describe("addMonthsClamped", () => {
  test("matches LocalDate.plusMonths for the quarterly base case", () => {
    expect(addMonthsClamped("2025-01-01", 0)).toBe("2025-01-01");
    expect(addMonthsClamped("2025-01-01", 3)).toBe("2025-04-01");
    expect(addMonthsClamped("2025-01-01", 9)).toBe("2025-10-01");
  });

  test("clamps to the end of a shorter month rather than rolling over", () => {
    // Naive setMonth would give 3 March here; LocalDate gives 28 Feb.
    expect(addMonthsClamped("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29"); // leap year
    expect(addMonthsClamped("2025-01-31", 3)).toBe("2025-04-30");
    expect(addMonthsClamped("2025-08-31", 1)).toBe("2025-09-30");
  });

  test("crosses year boundaries", () => {
    expect(addMonthsClamped("2025-11-15", 3)).toBe("2026-02-15");
    expect(addMonthsClamped("2025-12-01", 12)).toBe("2026-12-01");
    expect(addMonthsClamped("2025-10-31", 16)).toBe("2027-02-28");
  });
});

describe("grantTranches", () => {
  // 400 units, quarterly over 4 tranches, 2 vested — the server's fixture.
  const grant = {
    quantity: 400,
    totalTranches: 4,
    vestedTranches: 2,
    vestIntervalMonths: 3,
    vestStartDate: "2025-01-01",
    vestedValueDisplay: 8000,
    unvestedValueDisplay: 8000,
  };

  test("lays tranches out on the server's schedule", () => {
    expect(grantTranches(grant).map((t) => t.date)).toEqual([
      "2025-01-01",
      "2025-04-01",
      "2025-07-01",
      "2025-10-01",
    ]);
  });

  test("classifies vested tranches from the server count, not from dates", () => {
    expect(grantTranches(grant).map((t) => t.vested)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  test("tranche values reconcile with the server's vested/unvested totals", () => {
    const t = grantTranches(grant);
    const vested = t.filter((x) => x.vested).reduce((a, x) => a + x.value, 0);
    const unvested = t
      .filter((x) => !x.vested)
      .reduce((a, x) => a + x.value, 0);
    expect(vested).toBeCloseTo(grant.vestedValueDisplay, 2);
    expect(unvested).toBeCloseTo(grant.unvestedValueDisplay, 2);
  });

  test("a grant with no tranche count is fully vested at the start date", () => {
    const t = grantTranches({ ...grant, totalTranches: 0 });
    expect(t).toHaveLength(1);
    expect(t[0].vested).toBe(true);
    expect(t[0].quantity).toBe(400);
  });

  test("a null vest interval behaves as monthly, like Math.max(1, interval)", () => {
    const t = grantTranches({ ...grant, vestIntervalMonths: null });
    expect(t.map((x) => x.date)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
      "2025-04-01",
    ]);
  });

  test("returns nothing without a start date", () => {
    expect(grantTranches({ ...grant, vestStartDate: null })).toEqual([]);
  });
});

describe("buildVestingSchedule", () => {
  const grant = (over) => ({
    quantity: 400,
    totalTranches: 4,
    vestedTranches: 2,
    vestIntervalMonths: 3,
    vestStartDate: "2025-01-01",
    vestedValueDisplay: 8000,
    unvestedValueDisplay: 8000,
    ...over,
  });

  test("buckets tranches by month and splits vested from scheduled", () => {
    const { rows } = buildVestingSchedule([grant()]);
    expect(rows.map((r) => r.month)).toEqual([
      "2025-01",
      "2025-04",
      "2025-07",
      "2025-10",
    ]);
    expect(rows[0]).toMatchObject({ vested: 4000, scheduled: 0 });
    expect(rows[2]).toMatchObject({ vested: 0, scheduled: 4000 });
  });

  test("merges grants that vest in the same month", () => {
    const { rows } = buildVestingSchedule([grant(), grant({ id: 2 })]);
    expect(rows).toHaveLength(4);
    expect(rows[0].vested).toBe(8000);
  });

  test("worthless grants are excluded and counted, not drawn as zero bars", () => {
    const worthless = grant({
      vestedValueDisplay: 0,
      unvestedValueDisplay: 0,
      vestStartDate: "2031-01-01",
    });
    const { rows, skipped } = buildVestingSchedule([grant(), worthless]);
    expect(skipped).toBe(1);
    // The expired grant's far-future dates don't stretch the axis.
    expect(rows.every((r) => r.month < "2031")).toBe(true);
  });

  test("labels months for the axis", () => {
    const { rows } = buildVestingSchedule([grant()]);
    expect(rows[0].label).toBe("Jan 25");
    expect(rows[3].label).toBe("Oct 25");
  });
});

describe("nextVestAcrossGrants", () => {
  test("picks the soonest upcoming vest", () => {
    const next = nextVestAcrossGrants([
      { name: "B", nextVestDate: "2026-12-01", nextVestValueDisplay: 10 },
      { name: "A", nextVestDate: "2026-09-01", nextVestValueDisplay: 20 },
    ]);
    expect(next).toMatchObject({ date: "2026-09-01", value: 20, name: "A" });
  });

  test("is null once everything has vested", () => {
    expect(
      nextVestAcrossGrants([{ name: "A", nextVestDate: null }]),
    ).toBeNull();
  });
});

describe("categoryHistory", () => {
  test("treats a class absent from a present breakdown as a real zero", () => {
    const { rows, skipped } = categoryHistory(
      [
        { asOfDate: "2026-04-01", breakdown: { SHARES: 100 } },
        { asOfDate: "2026-05-01", breakdown: { SHARES: 100, OPTIONS: 50 } },
      ],
      "OPTIONS",
    );
    expect(rows).toEqual([
      { date: "2026-04-01", value: 0 },
      { date: "2026-05-01", value: 50 },
    ]);
    expect(skipped).toBe(0);
  });

  test("drops snapshots with no breakdown instead of inventing a zero", () => {
    const { rows, skipped } = categoryHistory(
      [
        { asOfDate: "2026-03-01", breakdown: null },
        { asOfDate: "2026-04-01", breakdown: { OPTIONS: 50 } },
      ],
      "OPTIONS",
    );
    expect(rows).toEqual([{ date: "2026-04-01", value: 50 }]);
    expect(skipped).toBe(1);
  });
});

describe("snapshotsInRange", () => {
  const TODAY = "2026-08-15";
  const snaps = [
    { asOfDate: "2019-01-01" }, // 7 years back
    { asOfDate: "2023-01-01" }, // 3.5 years back
    { asOfDate: "2026-01-01" }, // 7 months back
    { asOfDate: "2026-05-01" }, // 3 months back
    { asOfDate: "2026-08-01" }, // this month
  ];
  const dates = (r) => r.map((s) => s.asOfDate);

  test("6M keeps only the last six months", () => {
    expect(dates(snapshotsInRange(snaps, 6, TODAY))).toEqual([
      "2026-05-01",
      "2026-08-01",
    ]);
  });

  test("1Y reaches back past the turn of the year", () => {
    expect(dates(snapshotsInRange(snaps, 12, TODAY))).toEqual([
      "2026-01-01",
      "2026-05-01",
      "2026-08-01",
    ]);
  });

  test("5Y excludes anything older", () => {
    expect(dates(snapshotsInRange(snaps, 60, TODAY))).toEqual([
      "2023-01-01",
      "2026-01-01",
      "2026-05-01",
      "2026-08-01",
    ]);
  });

  test("Max keeps everything", () => {
    expect(snapshotsInRange(snaps, null, TODAY)).toHaveLength(5);
  });

  test("a snapshot exactly on the cutoff is included", () => {
    expect(
      snapshotsInRange([{ asOfDate: "2026-02-15" }], 6, TODAY),
    ).toHaveLength(1);
  });

  test("handles no snapshots", () => {
    expect(snapshotsInRange(null, 6, TODAY)).toEqual([]);
  });
});

describe("allocationHistory", () => {
  const snaps = [
    { asOfDate: "2026-03-01", breakdown: null },
    { asOfDate: "2026-04-01", breakdown: { CASH: 300, SHARES: 100 } },
    {
      asOfDate: "2026-05-01",
      breakdown: { CASH: 600, SHARES: 200, OPTIONS: 200 },
    },
  ];

  test("emits one row per snapshot with every class present", () => {
    const { rows, classes } = allocationHistory(snaps, false);
    expect(rows).toHaveLength(2);
    expect(classes.sort()).toEqual(["CASH", "OPTIONS", "SHARES"]);
    // A class absent from a present breakdown is a real zero, so the stack
    // stays continuous rather than breaking the band.
    expect(rows[0]).toEqual({
      date: "2026-04-01",
      CASH: 300,
      SHARES: 100,
      OPTIONS: 0,
    });
  });

  test("orders classes smallest-first so big bands sit on top", () => {
    const { classes } = allocationHistory(snaps, false);
    expect(classes[classes.length - 1]).toBe("CASH");
  });

  test("normalises each row to 100 in share mode", () => {
    const { rows } = allocationHistory(snaps, true);
    expect(rows[0].CASH).toBeCloseTo(75);
    expect(rows[0].SHARES).toBeCloseTo(25);
    rows.forEach((r) => {
      const total = ["CASH", "SHARES", "OPTIONS"].reduce((a, c) => a + r[c], 0);
      expect(total).toBeCloseTo(100);
    });
  });

  test("skips snapshots with no breakdown rather than charting a zero stack", () => {
    expect(allocationHistory(snaps, false).skipped).toBe(1);
  });

  test("handles an empty history", () => {
    expect(allocationHistory([], false)).toEqual({
      rows: [],
      classes: [],
      skipped: 0,
    });
  });
});

describe("countByRange", () => {
  test("reports how much history each timeframe would show", () => {
    const counts = countByRange(
      [{ asOfDate: "2019-01-01" }, { asOfDate: "2026-05-01" }],
      "2026-08-15",
    );
    expect(counts).toEqual({ "6M": 1, "1Y": 1, "5Y": 1, MAX: 2 });
  });
});
