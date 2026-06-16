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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Slider } from "@mui/material";
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

const fmt = (n) =>
  "$" +
  (n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

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

const monthOrder = (monthStr) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [mon, year] = (monthStr || "").split(" ");
  return parseInt(year || 0) * 12 + (months.indexOf(mon) ?? 0);
};

function MonthlyTab({ maxSpendValue }) {
  const theme = useTheme();
  const [aggregateData, setAggregateData] = useState([]);
  const [monthRange, setMonthRange] = useState(6);

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

  const getCatValue = (monthData, category) => {
    const found = (monthData.categoryValues || []).find(
      (c) => c.category === category,
    );
    return found ? found.value : 0;
  };

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
      .sort((a, b) => monthOrder(a.month) - monthOrder(b.month))
      .map((m) => {
        const obj = { month: m.month };
        let topTotal = 0;
        topCategories.forEach((cat) => {
          const found = (m.categoryValues || []).find((c) => c.category === cat);
          obj[cat] = found ? found.value : 0;
          topTotal += obj[cat];
        });
        const other = Math.max(0, m.totalMonthlySpend - topTotal);
        if (other > 0) obj["Other"] = other;
        return obj;
      });
  }, [aggregateData, topCategories]);

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
        {aggregateData.map((item, index) => {
          const pct = Math.min(
            100,
            Math.round((item.totalMonthlySpend / maxSpendValue) * 100),
          );
          const color = budgetColor(pct);
          const prevItem = aggregateData[index + 1];
          const delta = prevItem
            ? item.totalMonthlySpend - prevItem.totalMonthlySpend
            : null;

          return (
            <Card
              key={item.month}
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
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
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
                    radius={i === topCategories.length - 1 && allCategories.length <= TOP_N ? [3, 3, 0, 0] : [0, 0, 0, 0]}
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
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  minWidth: 160,
                  bgcolor: theme.palette.background.paper,
                }}
              >
                Category
              </TableCell>
              {aggregateData.map((m) => (
                <TableCell
                  key={m.month}
                  align="right"
                  sx={{
                    fontWeight: 700,
                    bgcolor: theme.palette.background.paper,
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.month}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {allCategories.map((category, i) => (
              <TableRow
                key={category}
                sx={{
                  bgcolor: i % 2 === 0 ? "transparent" : "action.hover",
                  "&:hover": { bgcolor: "action.selected" },
                }}
              >
                <TableCell sx={{ fontWeight: 500 }}>{category}</TableCell>
                {aggregateData.map((monthData) => {
                  const val = getCatValue(monthData, category);
                  return (
                    <TableCell key={monthData.month} align="right">
                      {val > 0 ? (
                        fmt(val)
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow
              sx={{
                "& td": {
                  fontWeight: 700,
                  borderTop: `2px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.action.selected,
                },
              }}
            >
              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
              {aggregateData.map((m) => (
                <TableCell key={m.month} align="right">
                  {fmt(m.totalMonthlySpend)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
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
            value: `$${data.thisYearTotal.toLocaleString()}`,
            color: theme.palette.primary.main,
          },
          {
            label: `${lastYear} same period`,
            value: `$${data.lastYearTotal.toLocaleString()}`,
            color: theme.palette.text.secondary,
          },
          {
            label: "YoY change",
            value: `${totalDelta >= 0 ? "+" : ""}$${totalDelta.toLocaleString()} (${totalDeltaPct}%)`,
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
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <YAxis
              dataKey="category"
              type="category"
              width={155}
              tick={{ fill: theme.palette.text.primary, fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
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
                  `$${row.thisYear.toLocaleString()}`,
                  `$${row.lastYear.toLocaleString()}`,
                  `${row.delta >= 0 ? "+" : ""}$${row.delta.toLocaleString()}`,
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
