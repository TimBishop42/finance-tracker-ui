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
export const pct = (n) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
export const compact = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
};
