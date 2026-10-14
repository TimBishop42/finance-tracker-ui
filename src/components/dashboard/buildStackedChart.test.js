import { buildStackedChart } from "./AggregateData";

const month = (name, values) => ({
  month: name,
  totalMonthlySpend: Object.values(values).reduce((s, v) => s + v, 0),
  categoryValues: Object.entries(values).map(([category, value]) => ({
    category,
    value,
  })),
});

test("each month shows only its own top N; zero spend never shows", () => {
  const { categories, data, hasOther } = buildStackedChart(
    [
      month("JAN", { A: 100, B: 50, C: 10, Zero: 0 }),
      month("FEB", { A: 80, C: 60, B: 5, Zero: 0 }),
    ],
    2,
  );
  expect(data[0]).toEqual({ month: "JAN", A: 100, B: 50, __other: 10 });
  expect(data[1]).toEqual({ month: "FEB", A: 80, C: 60, __other: 5 });
  // Series = anything that made some month's top N, biggest first.
  expect(categories).toEqual(["A", "C", "B"]);
  expect(hasOther).toBe(true);
});

test("a real category named Other doesn't collide with the bucket", () => {
  const { data } = buildStackedChart(
    [month("JAN", { Other: 40, A: 50, B: 10 })],
    2,
  );
  expect(data[0]).toEqual({ month: "JAN", A: 50, Other: 40, __other: 10 });
});
