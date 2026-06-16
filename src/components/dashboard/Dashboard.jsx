import React, { useEffect, useState, useMemo } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  TrendingUp,
  TrendingDown,
  ArrowBackIos,
  ArrowForwardIos,
  FlashOn,
} from "@mui/icons-material";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from "recharts";
import {
  getMonthlySpendComparison,
  getSummaryMonths,
  getCumulativeSpend,
  getMaxSpendValue,
} from "../../services/finance-service";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  "$" + Math.round(n || 0).toLocaleString("en-US");

// ─── Budget Card ─────────────────────────────────────────────────────────────
function BudgetCard({ currentSpend, targetSpend, loading }) {
  const pct = Math.min(100, Math.round((currentSpend / targetSpend) * 100));
  const remaining = targetSpend - currentSpend;
  const color = pct <= 75 ? "success" : pct <= 90 ? "warning" : "error";

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          This Month
        </Typography>
        {loading ? (
          <Box sx={{ mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="h4" fontWeight={700} sx={{ my: 0.5 }}>
              {fmt(currentSpend)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={color}
              sx={{ height: 6, borderRadius: 3, my: 1 }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color={`${color}.main`} fontWeight={600}>
                {pct}% of budget
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {remaining >= 0
                  ? `${fmt(remaining)} left`
                  : `${fmt(Math.abs(remaining))} over`}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── vs Last Month Card ───────────────────────────────────────────────────────
function VsLastMonthCard({ currentSpend, lastMonthTotal, daysElapsed, daysInMonth, loading }) {
  const pctThrough =
    lastMonthTotal > 0
      ? Math.round((currentSpend / lastMonthTotal) * 100)
      : null;
  const delta = currentSpend - lastMonthTotal;
  const isOver = delta > 0;

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          vs Last Month
        </Typography>
        {loading ? (
          <Box sx={{ mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="h4" fontWeight={700} sx={{ my: 0.5 }}>
              {fmt(lastMonthTotal)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              last month total
            </Typography>
            {pctThrough !== null && (
              <Typography
                variant="body2"
                color={isOver ? "error.main" : "success.main"}
                fontWeight={600}
                sx={{ mb: 0.25 }}
              >
                {isOver ? "▲" : "▼"} {fmt(Math.abs(delta))} vs last month
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              this month so far · day {daysElapsed} of {daysInMonth}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Top Category Card ────────────────────────────────────────────────────────
function TopCategoryCard({ categoryValues, totalSpend, loading }) {
  const top = useMemo(() => {
    if (!categoryValues || categoryValues.length === 0) return null;
    return [...categoryValues]
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)[0];
  }, [categoryValues]);

  const pct =
    top && totalSpend > 0 ? Math.round((top.value / totalSpend) * 100) : 0;

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Top Category
        </Typography>
        {loading ? (
          <Box sx={{ mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : top ? (
          <>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mt: 0.5, mb: 0.25 }}
              noWrap
            >
              {top.category}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              {fmt(top.value)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {pct}% of month spend
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No data yet
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Insight Strip ────────────────────────────────────────────────────────────
function InsightStrip({ dailyAvg, daysRemaining, daysInMonth, projected, targetSpend, isCurrentMonth }) {
  if (!isCurrentMonth) return null;

  const status =
    projected >= targetSpend
      ? { label: "Over Budget", color: "error" }
      : projected >= targetSpend * 0.9
        ? { label: "At Risk", color: "warning" }
        : { label: "On Track", color: "success" };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
      <Chip size="small" label={`${daysRemaining} days remaining`} variant="outlined" />
      <Chip size="small" label={`Daily avg ${fmt(dailyAvg)}`} variant="outlined" />
      <Chip size="small" label={status.label} color={status.color} />
    </Box>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={4} sx={{ p: 1.5, minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        Day {label}
      </Typography>
      {payload.map((p) => (
        <Box
          key={p.dataKey}
          sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
        >
          <Typography variant="body2" sx={{ color: p.color }}>
            {p.dataKey === "actual" ? "Spent" : "Projected"}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {fmt(p.value)}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ─── Spending Chart ───────────────────────────────────────────────────────────
function SpendingChart({ cumulativeData, targetSpend, selectedMonth, selectedYear, onNavigateMonth, loading }) {
  const theme = useTheme();

  const now = new Date();
  const isCurrentMonth =
    selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
  const todayDay = now.getDate();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const canGoNext =
    !(selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1);

  const chartData = useMemo(() => {
    if (!cumulativeData || cumulativeData.length === 0) return [];

    const dataMap = {};
    cumulativeData.forEach((d) => { dataMap[d.name] = d.amount; });

    const lastActualDay = isCurrentMonth ? todayDay : daysInMonth;
    const lastActualAmount = cumulativeData[cumulativeData.length - 1]?.amount || 0;
    const dailyAvg = lastActualDay > 0 ? lastActualAmount / lastActualDay : 0;

    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const point = { day };
      if (dataMap[day] !== undefined) {
        point.actual = dataMap[day];
      }
      if (isCurrentMonth && day >= lastActualDay) {
        point.projected = Math.round(
          lastActualAmount + dailyAvg * (day - lastActualDay),
        );
      }
      result.push(point);
    }
    return result;
  }, [cumulativeData, isCurrentMonth, todayDay, daysInMonth]);

  const maxY = useMemo(() => {
    const maxActual = Math.max(0, ...(cumulativeData || []).map((d) => d.amount));
    const lastProjected = chartData[chartData.length - 1]?.projected || 0;
    const raw = Math.max(targetSpend * 1.08, maxActual, lastProjected);
    return Math.ceil(raw / 1000) * 1000;
  }, [cumulativeData, chartData, targetSpend]);

  if (loading) {
    return (
      <Box
        sx={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!chartData.length) {
    return (
      <Box
        sx={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Typography color="text.secondary">No spending data for this month</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <IconButton onClick={() => onNavigateMonth("prev")} size="small">
          <ArrowBackIos fontSize="small" />
        </IconButton>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" fontWeight={600}>
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cumulative spending
            {isCurrentMonth ? " · dashed = projected" : ""}
          </Typography>
        </Box>
        <IconButton
          onClick={() => onNavigateMonth("next")}
          size="small"
          disabled={!canGoNext}
        >
          <ArrowForwardIos fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 70, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              horizontal
              vertical={false}
              stroke={theme.palette.divider}
              strokeDasharray="0"
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              tickLine={false}
              axisLine={false}
              domain={[0, maxY]}
            />
            <Tooltip content={ChartTooltip} />

            {/* Gradient fill under actual line */}
            <Area
              type="monotone"
              dataKey="actual"
              fill="url(#actualGradient)"
              stroke="none"
              connectNulls={false}
            />

            {/* Actual spend line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke={theme.palette.primary.main}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />

            {/* Projected line */}
            {isCurrentMonth && (
              <Line
                type="monotone"
                dataKey="projected"
                stroke={theme.palette.warning.main}
                strokeWidth={2}
                strokeDasharray="8 5"
                dot={false}
                connectNulls={false}
              />
            )}

            {/* Budget reference */}
            <ReferenceLine
              y={targetSpend}
              stroke={theme.palette.error.main}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Budget ${fmt(targetSpend)}`,
                position: "insideTopRight",
                fontSize: 11,
                fill: theme.palette.error.main,
              }}
            />

            {/* Today marker */}
            {isCurrentMonth && (
              <ReferenceLine
                x={todayDay}
                stroke={theme.palette.text.disabled}
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: "Today",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: theme.palette.text.secondary,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [monthlyData, setMonthlyData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [cumulativeData, setCumulativeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetSpend, setTargetSpend] = useState(12000);

  const [quickAdd, setQuickAdd] = useState({
    transactionType: "EXPENSE",
    amount: "",
    merchant: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [quickAddStatus, setQuickAddStatus] = useState(null);

  const handleQuickAddTypeChange = (_, newType) => {
    if (newType === null) return;
    setQuickAdd((prev) => ({ ...prev, transactionType: newType }));
  };

  const handleQuickAddChange = (field) => (e) => {
    setQuickAdd((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAdd.amount || !quickAdd.merchant) return;
    try {
      const payload = {
        transactionDate: new Date(quickAdd.date + "T12:00:00").getTime(),
        amount: parseFloat(quickAdd.amount),
        businessName: quickAdd.merchant,
        category: "Miscellaneous",
        transactionType: quickAdd.transactionType,
        comment: "",
        essential: false,
        duplicateReviewed: false,
      };
      const response = await fetch("/api/finance/submit-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Request failed");
      setQuickAdd((prev) => ({ ...prev, amount: "", merchant: "" }));
      setQuickAddStatus({ type: "success", message: "Transaction added!" });
      setTimeout(() => setQuickAddStatus(null), 2000);
    } catch (err) {
      console.error("Quick add error:", err);
      setQuickAddStatus({ type: "error", message: "Failed to add transaction." });
      setTimeout(() => setQuickAddStatus(null), 3000);
    }
  };

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const isCurrentMonth =
    selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysRemaining = isCurrentMonth ? daysInMonth - now.getDate() : 0;
  const currentSpend = parseFloat(monthlyData?.currentMonthSpend || 0);
  const dailyAvg = daysElapsed > 0 ? currentSpend / daysElapsed : 0;
  const projected = Math.round(dailyAvg * daysInMonth);

  // After server sort fix: index 0 = last month, last index = current month
  const currentMonthSummary = summaryData?.[summaryData.length - 1];
  const lastMonthTotal = summaryData?.[0]?.totalMonthlySpend || 0;

  const fetchCumulativeData = async (month, year) => {
    try {
      setChartLoading(true);
      const cumulativeSpend = await getCumulativeSpend(month, year);
      const chartData = cumulativeSpend.cumulativeValues.map((value, index) => ({
        name: index + 1,
        amount: parseFloat(value),
      }));
      setCumulativeData(chartData);
    } catch (err) {
      console.error("Error fetching cumulative data:", err);
    } finally {
      setChartLoading(false);
    }
  };

  const handleNavigateMonth = (direction) => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;
    if (direction === "prev") {
      newMonth -= 1;
      if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    } else {
      newMonth += 1;
      if (newMonth > 12) { newMonth = 1; newYear += 1; }
    }
    const n = new Date();
    if (
      newYear > n.getFullYear() ||
      (newYear === n.getFullYear() && newMonth > n.getMonth() + 1)
    ) return;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [monthlyComparison, summaryMonths, maxSpend] = await Promise.all([
          getMonthlySpendComparison(),
          getSummaryMonths(2),
          getMaxSpendValue(),
        ]);
        setMonthlyData(monthlyComparison);
        setSummaryData(summaryMonths);
        setTargetSpend(maxSpend);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) fetchCumulativeData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, loading]);

  useEffect(() => {
    if (!loading && !cumulativeData) fetchCumulativeData(selectedMonth, selectedYear);
  }, [loading]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const maxSpend = await getMaxSpendValue();
        setTargetSpend(maxSpend);
      } catch (err) {
        console.error("Error polling target spend:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error loading dashboard data: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Quick Add */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}
        >
          <FlashOn fontSize="small" />
          Quick Add
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <ToggleButtonGroup
            value={quickAdd.transactionType}
            exclusive
            onChange={handleQuickAddTypeChange}
            size="small"
          >
            <ToggleButton
              value="EXPENSE"
              sx={{
                "&.Mui-selected": {
                  color: "error.main",
                  borderColor: "error.main",
                  backgroundColor: "error.light",
                  opacity: 0.85,
                  "&:hover": { backgroundColor: "error.light" },
                },
              }}
            >
              <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
              Expense
            </ToggleButton>
            <ToggleButton
              value="INCOME"
              sx={{
                "&.Mui-selected": {
                  color: "success.main",
                  borderColor: "success.main",
                  backgroundColor: "success.light",
                  opacity: 0.85,
                  "&:hover": { backgroundColor: "success.light" },
                },
              }}
            >
              <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
              Income
            </ToggleButton>
          </ToggleButtonGroup>
          <TextField
            type="number"
            size="small"
            placeholder="Amount"
            value={quickAdd.amount}
            onChange={handleQuickAddChange("amount")}
            InputProps={{
              startAdornment: (
                <Typography variant="body2" sx={{ mr: 0.5 }}>
                  $
                </Typography>
              ),
            }}
            sx={{ width: 130 }}
          />
          <TextField
            size="small"
            placeholder="Merchant name"
            value={quickAdd.merchant}
            onChange={handleQuickAddChange("merchant")}
            sx={{ width: 180 }}
          />
          <TextField
            type="date"
            size="small"
            value={quickAdd.date}
            onChange={handleQuickAddChange("date")}
            sx={{ width: 160 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleQuickAddSubmit}
            disabled={!quickAdd.amount || !quickAdd.merchant}
          >
            Add
          </Button>
          {quickAddStatus && (
            <Typography
              variant="body2"
              sx={{
                color:
                  quickAddStatus.type === "success" ? "success.main" : "error.main",
              }}
            >
              {quickAddStatus.message}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <BudgetCard
            currentSpend={currentSpend}
            targetSpend={targetSpend}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <VsLastMonthCard
            currentSpend={currentSpend}
            lastMonthTotal={lastMonthTotal}
            daysElapsed={daysElapsed}
            daysInMonth={daysInMonth}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TopCategoryCard
            categoryValues={currentMonthSummary?.categoryValues}
            totalSpend={currentSpend}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Pace / status chips */}
      <InsightStrip
        dailyAvg={dailyAvg}
        daysRemaining={daysRemaining}
        daysInMonth={daysInMonth}
        projected={projected}
        targetSpend={targetSpend}
        isCurrentMonth={isCurrentMonth}
      />

      {/* Spending chart */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <SpendingChart
          cumulativeData={cumulativeData}
          targetSpend={targetSpend}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onNavigateMonth={handleNavigateMonth}
          loading={chartLoading}
        />
      </Paper>
    </Box>
  );
}
