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
