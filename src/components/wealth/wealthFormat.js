// Shared formatting helpers for the wealth pages (Total Wealth + Kids' Portfolios).

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

// Asset-class names and colours, shared by every wealth view so a class looks the same everywhere.
export const CLASS_LABELS = {
  CASH: "Cash & Savings",
  SHARES: "Shares & ETFs",
  OPTIONS: "Equity Comp",
  SUPER: "Superannuation",
  PROPERTY: "Property",
  OTHER_ASSET: "Other Assets",
  LIABILITY: "Liabilities",
};
export const CLASS_COLORS = {
  CASH: "#26a69a",
  SHARES: "#42a5f5",
  OPTIONS: "#ec407a",
  SUPER: "#7e57c2",
  PROPERTY: "#ef6c00",
  OTHER_ASSET: "#8d6e63",
  LIABILITY: "#ef5350",
};
export const classLabel = (c) => CLASS_LABELS[c] || c;
export const classColor = (c) => CLASS_COLORS[c] || "#90a4ae";
