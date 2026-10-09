import React, { useState, useEffect, useMemo } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Tab,
  Tabs,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip as MuiTooltip,
  Drawer,
  Divider,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Slider } from "@mui/material";
import {
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import RestClient from "../../rest/CategoryClient";
import { getMaxSpendValue } from "../../services/finance-service";
import { useTransactions } from "../../services/useTransactions";
import TransactionTable from "../transactions/TransactionTable";
import TransactionEditDialog from "../transactions/TransactionEditDialog";
import { fmt, fmt2, compactMoney } from "../../utils/format";

const MONTHS_UPPER = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const MONTHS_SHORT = [
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

// 1-based month number for a DisplayMonth, from its category values' enum name or `month`.
function monthNumberOf(m) {
  const raw = m?.categoryValues?.[0]?.month ?? m?.month;
  if (typeof raw === "number") return raw;
  const idx = MONTHS_UPPER.indexOf(String(raw).toUpperCase());
  return idx >= 0 ? idx + 1 : null;
}

const budgetColor = (pct) => {
  if (pct <= 75) return "success";
  if (pct <= 90) return "warning";
  return "error";
};

const CHART_COLORS = [
  "#1976d2",
  "#388e3c",
  "#f57c00",
  "#7b1fa2",
  "#c62828",
  "#00838f",
  "#5d4037",
  "#455a64",
];

const TOP_N = 6;

// Chronological key for a DisplayMonth; the API's `month` field is a bare
// enum name ("JULY"), not a "Jul 2026"-style string.
const monthKey = (m) => (m?.year ?? 0) * 12 + (monthNumberOf(m) ?? 0);

// "Jul 25" — compact column label with the year, since the API month has none.
const monthLabel = (m) => {
  const num = monthNumberOf(m);
  const mon = num ? MONTHS_SHORT[num - 1] : m?.month;
  return m?.year ? `${mon} ${String(m.year).slice(-2)}` : mon;
};

const getCatValue = (monthData, category) => {
  const found = (monthData.categoryValues || []).find(
    (c) => c.category === category,
  );
  return found ? found.value : 0;
};

// Sequential blue ramp for the breakdown table. Light mode reuses the
// SpendingHeatmap ramp; dark mode is its own ramp where low values recede
// into the dark surface instead of glowing lighter than it.
const HEAT_FILLS = {
  light: ["#c6e5ff", "#79b8ff", "#1976d2", "#0d47a1"],
  dark: ["#0d2b52", "#0d47a1", "#1565c0", "#1976d2"],
};
// Ink per bin — every pairing holds ≥ 4.5:1 text contrast on its fill.
const HEAT_INKS = {
  light: ["rgba(0, 0, 0, 0.87)", "rgba(0, 0, 0, 0.87)", "#fff", "#fff"],
  dark: ["#fff", "#fff", "#fff", "#fff"],
};

// Categories under this share of total spend collapse into the "Other" row.
const SMALL_CAT_SHARE = 0.02;

const applySort = (rows, sortKey, sortDir) => {
  const dir = sortDir === "asc" ? 1 : -1;
  const valueOf = (row) => {
    if (sortKey === "total") return row.total;
    if (sortKey === "delta") return row.delta ?? -Infinity;
    if (sortKey.startsWith("m:")) return row.values[Number(sortKey.slice(2))];
    return 0;
  };
  return [...rows].sort((a, b) =>
    sortKey === "category"
      ? dir * a.category.localeCompare(b.category)
      : dir * (valueOf(a) - valueOf(b)),
  );
};

function HeatCell({ value, bin, mode, tooltip, onClick }) {
  if (!(value > 0)) {
    return (
      <TableCell align="right">
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      </TableCell>
    );
  }
  return (
    <MuiTooltip title={tooltip} arrow>
      <TableCell
        align="right"
        onClick={onClick}
        sx={{
          bgcolor: HEAT_FILLS[mode][bin],
          color: HEAT_INKS[mode][bin],
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          border: "1px solid",
          borderColor: "background.paper",
          ...(onClick && {
            cursor: "pointer",
            "&:hover": {
              outline: "2px solid currentColor",
              outlineOffset: -2,
            },
          }),
        }}
      >
        {fmt(value)}
      </TableCell>
    </MuiTooltip>
  );
}

function DeltaCell({ delta }) {
  if (delta === null || delta === 0) {
    return (
      <TableCell align="right">
        <Typography variant="body2" color="text.disabled">
          {delta === 0 ? "±$0" : "—"}
        </Typography>
      </TableCell>
    );
  }
  const up = delta > 0;
  return (
    <TableCell
      align="right"
      sx={{
        color: up ? "error.main" : "success.main",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {up ? "↑" : "↓"}
      {fmt(Math.abs(delta))}
    </TableCell>
  );
}

function MonthlyTab({ maxSpendValue }) {
  const theme = useTheme();
  const [aggregateData, setAggregateData] = useState([]);
  const [monthRange, setMonthRange] = useState(6);

  // Drill-down: click a category × month cell → transactions for that slice.
  const { transactions, update, remove, recategoriseMerchant } =
    useTransactions();
  const [categories, setCategories] = useState([]);
  const [drill, setDrill] = useState(null); // { category, monthNum, year, label }
  const [editTarget, setEditTarget] = useState(null);

  // Breakdown table: sort order and "Other" (small categories) expansion.
  const [sortKey, setSortKey] = useState("total"); // 'category' | 'total' | 'delta' | 'm:<idx>'
  const [sortDir, setSortDir] = useState("desc");
  const [otherOpen, setOtherOpen] = useState(false);

  useEffect(() => {
    RestClient.get("/finance/get-categories")
      .then((r) => setCategories(r.data || []))
      .catch((e) => console.error("Failed to load categories", e));
  }, []);

  const openDrill = (category, monthData) => {
    const monthNum = monthNumberOf(monthData);
    if (!monthNum || !monthData.year) return;
    setDrill({
      category,
      monthNum,
      year: monthData.year,
      label: `${MONTHS_SHORT[monthNum - 1]} ${monthData.year}`,
    });
  };

  const drillTransactions = useMemo(() => {
    if (!drill) return [];
    return transactions
      .filter((t) => {
        if (t.category !== drill.category) return false;
        // Match the server's spend aggregation: only EXPENSE (or legacy
        // untyped) rows feed the cell, so INCOME/NEUTRAL stay out of the drill.
        if (t.transactionType && t.transactionType.toUpperCase() !== "EXPENSE")
          return false;
        const ms = Number(t.transactionDateTime);
        if (!Number.isFinite(ms)) return false;
        const d = new Date(ms);
        return (
          d.getFullYear() === drill.year && d.getMonth() + 1 === drill.monthNum
        );
      })
      .sort(
        (a, b) => (b.transactionDateTime || 0) - (a.transactionDateTime || 0),
      );
  }, [drill, transactions]);

  const drillTopMerchants = useMemo(() => {
    const totals = {};
    drillTransactions.forEach((t) => {
      const k = t.businessName || "(no merchant)";
      totals[k] = (totals[k] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(totals)
      .map(([merchant, value]) => ({ merchant, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [drillTransactions]);

  useEffect(() => {
    RestClient.get(`/finance/get-summary-months?months=${monthRange}`).then(
      (response) => setAggregateData(response.data),
    );
  }, [monthRange]);

  const allCategories = useMemo(() => {
    const cats = new Set();
    aggregateData.forEach((m) =>
      (m.categoryValues || []).forEach((c) => cats.add(c.category)),
    );
    return [...cats].sort();
  }, [aggregateData]);

  const topCategories = useMemo(() => {
    const totals = {};
    aggregateData.forEach((m) =>
      (m.categoryValues || []).forEach((c) => {
        totals[c.category] = (totals[c.category] || 0) + c.value;
      }),
    );
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([cat]) => cat);
  }, [aggregateData]);

  const stackedChartData = useMemo(() => {
    return [...aggregateData]
      .sort((a, b) => monthKey(a) - monthKey(b))
      .map((m) => {
        const obj = { month: m.month };
        let topTotal = 0;
        topCategories.forEach((cat) => {
          const found = (m.categoryValues || []).find(
            (c) => c.category === cat,
          );
          obj[cat] = found ? found.value : 0;
          topTotal += obj[cat];
        });
        const other = Math.max(0, m.totalMonthlySpend - topTotal);
        if (other > 0) obj["Other"] = other;
        return obj;
      });
  }, [aggregateData, topCategories]);

  // ---- Category breakdown table ----
  const monthsAsc = useMemo(
    () => [...aggregateData].sort((a, b) => monthKey(a) - monthKey(b)),
    [aggregateData],
  );
  const showDelta = monthsAsc.length >= 2;

  const grandTotal = useMemo(
    () => monthsAsc.reduce((s, m) => s + (m.totalMonthlySpend || 0), 0),
    [monthsAsc],
  );

  const categoryRows = useMemo(() => {
    return allCategories.map((category) => {
      const values = monthsAsc.map((m) => getCatValue(m, category));
      const total = values.reduce((s, v) => s + v, 0);
      const avg = monthsAsc.length ? total / monthsAsc.length : 0;
      const nonZero = values.filter((v) => v > 0);
      const max = nonZero.length ? Math.max(...nonZero) : 0;
      const min = nonZero.length ? Math.min(...nonZero) : 0;
      // Shade relative to the category's own range. Rows whose spread is
      // under 15% of their max read as uniform rather than exaggerating
      // trivial differences into full-range shading.
      const uniform = max <= 0 || (max - min) / max < 0.15;
      const bins = values.map((v) => {
        if (v <= 0) return -1;
        if (uniform) return 0;
        return Math.min(3, Math.floor(((v - min) / (max - min)) * 4));
      });
      const n = values.length;
      const delta = n >= 2 ? values[n - 1] - values[n - 2] : null;
      return { category, values, bins, total, avg, delta };
    });
  }, [allCategories, monthsAsc]);

  const { mainRows, smallRows, otherRow } = useMemo(() => {
    const small = categoryRows.filter(
      (r) => grandTotal > 0 && r.total < grandTotal * SMALL_CAT_SHARE,
    );
    if (small.length < 2)
      return { mainRows: categoryRows, smallRows: [], otherRow: null };
    const smallSet = new Set(small);
    const values = monthsAsc.map((_, i) =>
      small.reduce((s, r) => s + r.values[i], 0),
    );
    const total = values.reduce((s, v) => s + v, 0);
    const n = values.length;
    return {
      mainRows: categoryRows.filter((r) => !smallSet.has(r)),
      smallRows: small,
      otherRow: {
        count: small.length,
        values,
        total,
        avg: n ? total / n : 0,
        delta: n >= 2 ? values[n - 1] - values[n - 2] : null,
      },
    };
  }, [categoryRows, grandTotal, monthsAsc]);

  const sortedMain = useMemo(
    () => applySort(mainRows, sortKey, sortDir),
    [mainRows, sortKey, sortDir],
  );
  const sortedSmall = useMemo(
    () => applySort(smallRows, sortKey, sortDir),
    [smallRows, sortKey, sortDir],
  );

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "category" ? "asc" : "desc");
    }
  };

  const cellTooltip = (row, mi) => {
    const m = monthsAsc[mi];
    const pct =
      m.totalMonthlySpend > 0
        ? Math.round((row.values[mi] / m.totalMonthlySpend) * 100)
        : 0;
    return `${row.category} — ${monthLabel(m)} · ${pct}% of month · avg ${fmt(row.avg)}/mo`;
  };

  const mode = theme.palette.mode;

  const renderCategoryRow = (row, indent = false) => (
    <TableRow key={row.category} hover>
      <TableCell
        sx={{
          fontWeight: 500,
          position: "sticky",
          left: 0,
          zIndex: 1,
          bgcolor: "background.paper",
          pl: indent ? 4 : 2,
        }}
      >
        {row.category}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      >
        {fmt(row.total)}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          color: "text.secondary",
          fontVariantNumeric: "tabular-nums",
          borderRight: `1px solid ${theme.palette.divider}`,
        }}
      >
        {fmt(row.avg)}
      </TableCell>
      {row.values.map((val, mi) => (
        <HeatCell
          key={monthKey(monthsAsc[mi])}
          value={val}
          bin={row.bins[mi]}
          mode={mode}
          tooltip={cellTooltip(row, mi)}
          onClick={
            val > 0 ? () => openDrill(row.category, monthsAsc[mi]) : undefined
          }
        />
      ))}
      {showDelta && <DeltaCell delta={row.delta} />}
    </TableRow>
  );

  return (
    <Box>
      {/* Month range slider */}
      <Box sx={{ width: 280, mx: "auto", mt: 3, mb: 4 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Showing {monthRange} {monthRange === 1 ? "month" : "months"}
        </Typography>
        <Slider
          value={monthRange}
          onChange={(_, v) => setMonthRange(v)}
          valueLabelDisplay="auto"
          step={1}
          marks
          min={1}
          max={12}
        />
      </Box>

      {/* Month summary cards */}
      <Box
        sx={{
          display: "flex",
          overflowX: "auto",
          gap: 2,
          pb: 2,
          mb: 4,
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "action.disabled",
            borderRadius: 3,
          },
        }}
      >
        {monthsAsc.map((item, index) => {
          const pct = Math.min(
            100,
            Math.round((item.totalMonthlySpend / maxSpendValue) * 100),
          );
          const color = budgetColor(pct);
          const prevItem = monthsAsc[index - 1];
          const delta = prevItem
            ? item.totalMonthlySpend - prevItem.totalMonthlySpend
            : null;

          return (
            <Card
              key={monthKey(item)}
              variant="outlined"
              sx={{ minWidth: 175, flexShrink: 0 }}
            >
              <CardContent sx={{ pb: "12px !important" }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  display="block"
                  sx={{ lineHeight: 1.2, mb: 0.5 }}
                >
                  {item.month}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {fmt(item.totalMonthlySpend)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={color}
                  sx={{ height: 6, borderRadius: 3, mb: 0.75 }}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="caption" color={`${color}.main`}>
                    {pct}% of budget
                  </Typography>
                  {delta !== null && (
                    <Typography
                      variant="caption"
                      color={delta <= 0 ? "success.main" : "error.main"}
                      sx={{ fontWeight: 600 }}
                    >
                      {delta <= 0 ? "↓" : "↑"}
                      {fmt(Math.abs(delta))}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Top categories stacked bar chart */}
      {stackedChartData.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Top Spending Categories — Month over Month
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Top {Math.min(TOP_N, topCategories.length)} categories by total
            spend
            {allCategories.length > TOP_N
              ? `, all remaining grouped as "Other"`
              : ""}
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stackedChartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                />
                <YAxis
                  tickFormatter={compactMoney}
                  tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [fmt(value), name]}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                  cursor={{ fill: theme.palette.action.hover }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <ReferenceLine
                  y={maxSpendValue}
                  stroke={theme.palette.error.main}
                  strokeDasharray="6 3"
                  label={{
                    value: "Budget",
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: theme.palette.error.main,
                  }}
                />
                {topCategories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="stack"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    radius={
                      i === topCategories.length - 1 &&
                      allCategories.length <= TOP_N
                        ? [3, 3, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
                {allCategories.length > TOP_N && (
                  <Bar
                    dataKey="Other"
                    stackId="stack"
                    fill="#bdbdbd"
                    radius={[3, 3, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}

      {/* Category breakdown table */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Category Breakdown
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Less
          </Typography>
          {HEAT_FILLS[mode].map((c) => (
            <Box
              key={c}
              sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: c }}
            />
          ))}
          <Typography variant="caption" color="text.secondary">
            More — shaded against each category's own range
          </Typography>
        </Box>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  minWidth: 160,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: theme.palette.background.paper,
                }}
              >
                <TableSortLabel
                  active={sortKey === "category"}
                  direction={sortKey === "category" ? sortDir : "asc"}
                  onClick={() => handleSort("category")}
                >
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  bgcolor: theme.palette.background.paper,
                }}
              >
                <TableSortLabel
                  active={sortKey === "total"}
                  direction={sortKey === "total" ? sortDir : "desc"}
                  onClick={() => handleSort("total")}
                >
                  Total
                </TableSortLabel>
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  bgcolor: theme.palette.background.paper,
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Avg/mo
              </TableCell>
              {monthsAsc.map((m, mi) => (
                <TableCell
                  key={monthKey(m)}
                  align="right"
                  sx={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <TableSortLabel
                    active={sortKey === `m:${mi}`}
                    direction={sortKey === `m:${mi}` ? sortDir : "desc"}
                    onClick={() => handleSort(`m:${mi}`)}
                  >
                    {monthLabel(m)}
                  </TableSortLabel>
                </TableCell>
              ))}
              {showDelta && (
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <MuiTooltip title="Latest month vs the month before">
                    <TableSortLabel
                      active={sortKey === "delta"}
                      direction={sortKey === "delta" ? sortDir : "desc"}
                      onClick={() => handleSort("delta")}
                    >
                      MoM Δ
                    </TableSortLabel>
                  </MuiTooltip>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedMain.map((row) => renderCategoryRow(row))}
            {otherRow && (
              <>
                <TableRow
                  hover
                  onClick={() => setOtherOpen(!otherOpen)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      {otherOpen ? (
                        <ExpandLess fontSize="small" />
                      ) : (
                        <ExpandMore fontSize="small" />
                      )}
                      <Typography variant="body2" fontStyle="italic">
                        Other ({otherRow.count} categories)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                  >
                    {fmt(otherRow.total)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                      borderRight: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {fmt(otherRow.avg)}
                  </TableCell>
                  {otherRow.values.map((val, mi) => (
                    <TableCell
                      key={monthKey(monthsAsc[mi])}
                      align="right"
                      sx={{
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {val > 0 ? fmt(val) : "—"}
                    </TableCell>
                  ))}
                  {showDelta && <DeltaCell delta={otherRow.delta} />}
                </TableRow>
                {otherOpen &&
                  sortedSmall.map((row) => renderCategoryRow(row, true))}
              </>
            )}
            {/* Totals row */}
            <TableRow
              sx={{
                "& td": {
                  fontWeight: 700,
                  borderTop: `2px solid ${theme.palette.divider}`,
                  bgcolor: mode === "dark" ? "grey.900" : "grey.100",
                  fontVariantNumeric: "tabular-nums",
                },
              }}
            >
              <TableCell sx={{ position: "sticky", left: 0, zIndex: 1 }}>
                Total
              </TableCell>
              <TableCell align="right">{fmt(grandTotal)}</TableCell>
              <TableCell
                align="right"
                sx={{ borderRight: `1px solid ${theme.palette.divider}` }}
              >
                {fmt(monthsAsc.length ? grandTotal / monthsAsc.length : 0)}
              </TableCell>
              {monthsAsc.map((m) => (
                <TableCell key={monthKey(m)} align="right">
                  {fmt(m.totalMonthlySpend)}
                </TableCell>
              ))}
              {showDelta && (
                <DeltaCell
                  delta={
                    monthsAsc[monthsAsc.length - 1].totalMonthlySpend -
                    monthsAsc[monthsAsc.length - 2].totalMonthlySpend
                  }
                />
              )}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Category × month drill-down */}
      <Drawer
        anchor="right"
        open={!!drill}
        onClose={() => setDrill(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: 640 }, p: 2 } }}
      >
        {drill && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                {drill.category} — {drill.label}
              </Typography>
              <IconButton onClick={() => setDrill(null)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {drillTopMerchants.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Top merchants
                </Typography>
                <Box
                  sx={{ height: Math.max(120, drillTopMerchants.length * 34) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={drillTopMerchants}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <XAxis type="number" tickFormatter={(v) => fmt(v)} hide />
                      <YAxis
                        dataKey="merchant"
                        type="category"
                        width={130}
                        tick={{
                          fontSize: 11,
                          fill: theme.palette.text.secondary,
                        }}
                      />
                      <Tooltip
                        formatter={(v) => fmt(v)}
                        cursor={{ fill: theme.palette.action.hover }}
                      />
                      <Bar
                        dataKey="value"
                        fill={theme.palette.primary.main}
                        radius={[0, 3, 3, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}

            <Typography variant="subtitle2" gutterBottom>
              Transactions
            </Typography>
            <TransactionTable
              transactions={drillTransactions}
              onEdit={setEditTarget}
              onDelete={(t) =>
                remove(t.transactionId).catch((e) =>
                  console.error("Delete failed", e),
                )
              }
            />
          </Box>
        )}
      </Drawer>

      <TransactionEditDialog
        open={!!editTarget}
        transaction={editTarget}
        categories={categories}
        onClose={() => setEditTarget(null)}
        onSave={update}
        onRecategoriseMerchant={recategoriseMerchant}
      />
    </Box>
  );
}

const DELTA_GREEN = "#4caf50";
const DELTA_RED = "#f44336";

function YearOverYearTab() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    RestClient.get("/finance/category-year-over-year")
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load year-over-year data");
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
        {error}
      </Typography>
    );
  if (!data) return null;

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const totalDelta = data.thisYearTotal - data.lastYearTotal;
  const totalDeltaPct = data.lastYearTotal
    ? ((totalDelta / data.lastYearTotal) * 100).toFixed(1)
    : "—";

  return (
    <Box>
      {/* Summary cards */}
      <Box display="flex" justifyContent="center" gap={3} sx={{ mt: 4, mb: 2 }}>
        {[
          {
            label: `${currentYear} to date`,
            value: fmt2(data.thisYearTotal),
            color: theme.palette.primary.main,
          },
          {
            label: `${lastYear} same period`,
            value: fmt2(data.lastYearTotal),
            color: theme.palette.text.secondary,
          },
          {
            label: "YoY change",
            value: `${totalDelta >= 0 ? "+" : ""}${fmt2(totalDelta)} (${totalDeltaPct}%)`,
            color: totalDelta <= 0 ? DELTA_GREEN : DELTA_RED,
          },
        ].map((card) => (
          <Paper
            key={card.label}
            elevation={2}
            sx={{ p: 2, minWidth: 180, textAlign: "center" }}
          >
            <Typography variant="body2" color="text.secondary">
              {card.label}
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: card.color, fontWeight: 700 }}
            >
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Typography
        variant="caption"
        display="block"
        textAlign="center"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Comparing {data.comparisonPeriod} {currentYear} vs{" "}
        {data.comparisonPeriod} {lastYear}
      </Typography>

      {/* Side-by-side bar chart */}
      <Box
        sx={{
          height: Math.max(400, data.categories.length * 50),
          width: "100%",
          mb: 4,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.categories}
            layout="vertical"
            margin={{ top: 10, right: 60, left: 160, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={fmt}
            />
            <YAxis
              dataKey="category"
              type="category"
              width={155}
              tick={{ fill: theme.palette.text.primary, fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [fmt2(value), name]}
            />
            <Legend />
            <Bar
              dataKey="thisYear"
              name={`${currentYear}`}
              fill="#1976d2"
              barSize={14}
            />
            <Bar
              dataKey="lastYear"
              name={`${lastYear}`}
              fill="#90caf9"
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Delta table */}
      <Box sx={{ overflowX: "auto", mb: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 110px 130px 100px",
            gap: 0,
            minWidth: 600,
          }}
        >
          {/* Header */}
          {[
            "Category",
            `${currentYear}`,
            `${lastYear}`,
            "Change ($)",
            "Change (%)",
          ].map((h) => (
            <Typography
              key={h}
              variant="caption"
              sx={{
                fontWeight: 700,
                px: 1.5,
                py: 1,
                borderBottom: `2px solid ${theme.palette.divider}`,
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {h}
            </Typography>
          ))}
          {/* Rows */}
          {data.categories.map((row, i) => {
            const isUp = row.delta > 0;
            const isDown = row.delta < 0;
            const chipColor = isDown ? "success" : isUp ? "error" : "default";
            return (
              <React.Fragment key={row.category}>
                {[
                  row.category,
                  fmt2(row.thisYear),
                  fmt2(row.lastYear),
                  `${row.delta >= 0 ? "+" : ""}${fmt2(row.delta)}`,
                  null,
                ].map((cell, ci) => (
                  <Box
                    key={ci}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      bgcolor:
                        i % 2 === 0
                          ? "transparent"
                          : theme.palette.action.hover,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {ci === 4 ? (
                      <Chip
                        label={`${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(1)}%`}
                        color={chipColor}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            ci === 3
                              ? isDown
                                ? DELTA_GREEN
                                : isUp
                                  ? DELTA_RED
                                  : "inherit"
                              : "inherit",
                        }}
                      >
                        {cell}
                      </Typography>
                    )}
                  </Box>
                ))}
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default function AggregateData() {
  const [tab, setTab] = useState(0);
  const [maxSpendValue, setMaxSpendValue] = useState(12000);

  useEffect(() => {
    getMaxSpendValue()
      .then((value) => setMaxSpendValue(value))
      .catch((err) => console.error("Failed to load max spend value:", err));
  }, []);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        <Tab label="Monthly Breakdown" />
        <Tab label="Year over Year" />
      </Tabs>

      {tab === 0 && <MonthlyTab maxSpendValue={maxSpendValue} />}
      {tab === 1 && <YearOverYearTab />}
    </Box>
  );
}
