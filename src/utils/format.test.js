import { fmt, fmt2, compactMoney, pct } from "./format";

test("money formats as AUD, whole dollars or cents, with the sign in front", () => {
  expect(fmt(1234.56)).toBe("$1,235");
  expect(fmt2(1234.5)).toBe("$1,234.50");
  expect(fmt2(-12.5)).toBe("-$12.50");
  expect(fmt(null)).toBe("$0");
  expect(fmt(10, "USD")).toBe("$10");
});

test("compactMoney abbreviates for chart axes", () => {
  expect(compactMoney(950)).toBe("$950");
  expect(compactMoney(12_400)).toBe("$12k");
  expect(compactMoney(1_250_000)).toBe("$1.3M");
});

test("pct is signed for movements", () => {
  expect(pct(3.21)).toBe("+3.2%");
  expect(pct(-1)).toBe("-1.0%");
  expect(pct(null)).toBe("—");
});
