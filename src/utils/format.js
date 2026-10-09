// App-wide display formatting: money (AUD unless told otherwise), percentages, months.

export const moneyFmt = (ccy, digits) =>
  new Intl.NumberFormat(ccy === "USD" ? "en-US" : "en-AU", {
    style: "currency",
    currency: ccy || "AUD",
    maximumFractionDigits: digits,
  });
export const fmt = (n, ccy) => moneyFmt(ccy, 0).format(Number(n) || 0);
export const fmt2 = (n, ccy) => moneyFmt(ccy, 2).format(Number(n) || 0);
export const qtyFmt = (q) =>
  (Number(q) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const todayIso = () => new Date().toISOString().slice(0, 10);
const MONTHS = [
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
];
/** "2026-03-01" -> "Mar 26", for chart axes where the full ISO date is noise. */
export const monthShort = (iso) => {
  const [y, m] = String(iso).split("-");
  return `${MONTHS[Number(m) - 1] || "?"} ${String(y).slice(2)}`;
};
/** "2026-03-01" -> "Mar 2026", for tooltip headings. */
export const monthLong = (iso) => {
  const [y, m] = String(iso).split("-");
  return `${MONTHS[Number(m) - 1] || "?"} ${y}`;
};
// Signed, for movements ("+3.2%"). Use `share` for proportions, where a leading
// plus would be nonsense.
export const pct = (n) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
export const share = (n) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);
export const compact = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
};
/** compact() as dollars: "$12k", "$1.2M". */
export const compactMoney = (n) => `$${compact(n)}`;
