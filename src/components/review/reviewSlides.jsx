import React, { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ArrowDownward,
  ArrowUpward,
  TrendingDown,
  TrendingFlat,
  TrendingUp,
} from "@mui/icons-material";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fmt,
  fmt2,
  pct,
  compact,
  monthLong,
  classLabel,
  classColor,
} from "../wealth/wealthFormat";
import { AllocationHistoryChart } from "../wealth/WealthCharts";
import useCountUp, { useReducedMotion } from "./useCountUp";

// The month-in-review slides. Each slide is a plain component over the review
// response, so the same slide renders in the full-screen walkthrough and in the
// scrolling overview. Colours come from the theme, so they read on the
// walkthrough's dark gradients and on the normal light/dark pages alike.

const CATEGORY_COLORS = [
  "#42a5f5",
  "#ef5350",
  "#66bb6a",
  "#ffa726",
  "#ab47bc",
  "#26c6da",
  "#ec407a",
  "#8d6e63",
];
const TOP_CATEGORIES = 8;

const num = (v) => Number(v) || 0;
const percentChange = (current, previous) =>
  previous
    ? ((num(current) - num(previous)) / Math.abs(num(previous))) * 100
    : null;
const titleCase = (s) =>
  String(s || "").charAt(0) +
  String(s || "")
    .slice(1)
    .toLowerCase();

// --- building blocks ---------------------------------------------------------

function BigMoney({ value, variant = "h2", color }) {
  const animated = useCountUp(value);
  return (
    <Typography
      variant={variant}
      fontWeight={800}
      sx={{ color, lineHeight: 1.1 }}
    >
      {fmt(animated, "AUD")}
    </Typography>
  );
}

/**
 * "↑ 12% vs last month". `goodWhenUp` decides the colour: spending up is bad,
 * income or net worth up is good.
 */
function Change({ current, previous, label, goodWhenUp = false }) {
  const change = percentChange(current, previous);
  if (change == null) return null;
  const up = change > 0;
  const good = Math.abs(change) < 0.05 ? null : up === goodWhenUp;
  return (
    <Chip
      size="small"
      icon={up ? <ArrowUpward /> : <ArrowDownward />}
      label={`${pct(change)} ${label}`}
      color={good == null ? "default" : good ? "success" : "error"}
      variant="filled"
    />
  );
}

const TREND_ICON = {
  UP: <TrendingUp fontSize="small" color="error" titleAccess="Trending up" />,
  DOWN: (
    <TrendingDown
      fontSize="small"
      color="success"
      titleAccess="Trending down"
    />
  ),
  FLAT: <TrendingFlat fontSize="small" color="disabled" titleAccess="Steady" />,
};

/** Bars grow from zero once mounted — CSS only, so no animation library. */
function useGrow() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return grown;
}

function Sparkline({ data, dataKey, color, height = 60 }) {
  const animate = !useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Stat({ label, children }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ opacity: 0.9 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// --- slides ------------------------------------------------------------------

/**
 * The last imported transaction date when it falls before the month's end (so
 * the review is missing transactions), else null.
 */
export function importedUpTo(review) {
  const [y, m] = review.month.split("-").map(Number);
  const monthEnd = `${review.month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  return review.dataThrough && review.dataThrough < monthEnd ? review.dataThrough : null;
}

function IntroSlide({ review }) {
  const incomplete = importedUpTo(review);
  return (
    <Stack spacing={2} alignItems="center" textAlign="center">
      <Typography variant="h6" sx={{ opacity: 0.8 }}>
        Your month in review
      </Typography>
      <Typography variant="h1" fontWeight={900}>
        {monthLong(review.month)}
      </Typography>
      {incomplete && (
        <Chip
          color="warning"
          label={`Transactions imported up to ${incomplete} — this month may be incomplete`}
        />
      )}
    </Stack>
  );
}

function HeadlineSlide({ review }) {
  const theme = useTheme();
  const t = review.totals;
  return (
    <Stack spacing={3}>
      <Stat label="You spent">
        <BigMoney value={t.spend} />
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mt: 1 }}>
          <Change
            current={t.spend}
            previous={t.lastMonthSpend}
            label="vs last month"
          />
          <Change
            current={t.spend}
            previous={t.averageSpend}
            label={`vs ${t.averageMonths}-month avg`}
          />
        </Stack>
      </Stat>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
        <Stat label="You earned">
          <BigMoney value={t.income} variant="h4" />
        </Stat>
        <Stat label="You kept">
          <BigMoney value={t.net} variant="h4" />
          {t.savingsRatePercent != null && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {Number(t.savingsRatePercent).toFixed(1)}% of income
            </Typography>
          )}
        </Stat>
      </Stack>
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Spend, last {review.history.length} months
        </Typography>
        <Sparkline
          data={review.history}
          dataKey="spend"
          color={theme.palette.warning.main}
        />
      </Box>
    </Stack>
  );
}

function CategoriesSlide({ review }) {
  const theme = useTheme();
  const grown = useGrow();
  const rows = review.categories
    .filter((c) => num(c.spend) > 0 || c.budget != null)
    .slice(0, TOP_CATEGORIES);
  const scale = Math.max(
    1,
    ...rows.flatMap((c) => [num(c.spend), num(c.budget), num(c.average)]),
  );
  return (
    <Stack spacing={1.5}>
      {rows.map((c, i) => {
        const over = c.budget != null && num(c.spend) > num(c.budget);
        return (
          <Box key={c.category}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={700} sx={{ flex: 1 }} noWrap>
                {c.category}
              </Typography>
              {c.trend && TREND_ICON[c.trend]}
              <Typography fontWeight={700}>{fmt(c.spend, "AUD")}</Typography>
            </Stack>
            <Box
              sx={{
                position: "relative",
                height: 10,
                borderRadius: 5,
                bgcolor: "action.hover",
                mt: 0.5,
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  borderRadius: 5,
                  width: grown ? `${(num(c.spend) / scale) * 100}%` : 0,
                  bgcolor: over
                    ? theme.palette.error.main
                    : CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  transition: `width 900ms ease-out ${i * 80}ms`,
                }}
              />
              {c.budget != null && (
                <Box
                  title={`Budget ${fmt(c.budget, "AUD")}`}
                  sx={{
                    position: "absolute",
                    top: -3,
                    bottom: -3,
                    width: 2,
                    left: `${(num(c.budget) / scale) * 100}%`,
                    bgcolor: "text.primary",
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {c.budget != null && `Budget ${fmt(c.budget, "AUD")} · `}
              Last month {fmt(c.lastMonth, "AUD")}
              {c.average != null && ` · Avg ${fmt(c.average, "AUD")}`}
            </Typography>
          </Box>
        );
      })}
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        Line = budget · arrow = 3-month trend
      </Typography>
    </Stack>
  );
}

function SpendMixSlide({ review }) {
  const reduceMotion = useReducedMotion();
  const spent = review.categories.filter((c) => num(c.spend) > 0);
  const top = spent.slice(0, CATEGORY_COLORS.length - 1);
  const rest = spent
    .slice(CATEGORY_COLORS.length - 1)
    .reduce((s, c) => s + num(c.spend), 0);
  const data = [
    ...top.map((c) => ({ name: c.category, value: num(c.spend) })),
    ...(rest > 0 ? [{ name: "Everything else", value: rest }] : []),
  ];
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={3}
      alignItems="center"
    >
      <Box sx={{ width: 260, height: 260, flexShrink: 0 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="60%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!reduceMotion}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmt(v, "AUD")} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      <Stack spacing={0.75} sx={{ flex: 1, width: "100%" }}>
        {data.map((d, i) => (
          <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "3px",
                bgcolor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }}
            />
            <Typography sx={{ flex: 1 }}>{d.name}</Typography>
            <Typography fontWeight={700}>
              {Math.round(
                (d.value / Math.max(1, num(review.totals.spend))) * 100,
              )}
              %
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function PaceSlide({ review }) {
  const theme = useTheme();
  const animate = !useReducedMotion();
  const { thisMonth, lastMonth } = review.cumulative;
  const days = Math.max(thisMonth.length, lastMonth.length);
  const data = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    thisMonth: thisMonth[i] != null ? num(thisMonth[i]) : undefined,
    lastMonth: lastMonth[i] != null ? num(lastMonth[i]) : undefined,
  }));
  const target = num(review.totals.spendTarget);
  return (
    <Box sx={{ height: 320 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={6}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[0, (max) => Math.max(max, target * 1.05)]}
          />
          <Tooltip
            formatter={(v) => fmt(v, "AUD")}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke={theme.palette.error.main}
              strokeDasharray="6 3"
              label={{
                value: `Target ${fmt(target, "AUD")}`,
                fill: theme.palette.error.main,
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="lastMonth"
            name="Last month"
            stroke={theme.palette.text.disabled}
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
            isAnimationActive={animate}
          />
          <Line
            type="monotone"
            dataKey="thisMonth"
            name={monthLong(review.month)}
            stroke={theme.palette.info.main}
            strokeWidth={3}
            dot={false}
            animationDuration={1800}
            isAnimationActive={animate}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

function RankedList({ rows, render }) {
  return (
    <Stack spacing={1}>
      {rows.map((r, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="center">
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ width: 28, opacity: 0.6 }}
          >
            {i + 1}
          </Typography>
          {render(r)}
        </Stack>
      ))}
    </Stack>
  );
}

function MerchantsSlide({ review }) {
  return (
    <Stack spacing={3}>
      <Stat label="Top merchants">
        <RankedList
          rows={review.topMerchants}
          render={(m) => (
            <>
              <Typography sx={{ flex: 1 }} fontWeight={600} noWrap>
                {m.merchant}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {m.count}×
              </Typography>
              <Typography fontWeight={700}>{fmt(m.amount, "AUD")}</Typography>
            </>
          )}
        />
      </Stat>
      {review.biggestTransactions.length > 0 && (
        <Stat label="Biggest single purchase">
          <Typography variant="h5" fontWeight={700}>
            {fmt(review.biggestTransactions[0].amount, "AUD")} ·{" "}
            {review.biggestTransactions[0].merchant}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {review.biggestTransactions[0].category} on{" "}
            {review.biggestTransactions[0].date}
          </Typography>
        </Stat>
      )}
      {review.newMerchants.length > 0 && (
        <Stat label={`${review.newMerchants.length} new places this month`}>
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            {review.newMerchants.map((m) => (
              <Chip
                key={m.merchant}
                label={`${m.merchant} · ${fmt(m.amount, "AUD")}`}
              />
            ))}
          </Stack>
        </Stat>
      )}
    </Stack>
  );
}

function SubscriptionsSlide({ review }) {
  const { started, priceChanges, trialsEnded } = review.subscriptionChanges;
  const line = (text, key) => (
    <Typography key={key} variant="h6">
      {text}
    </Typography>
  );
  return (
    <Stack spacing={3}>
      {started.length > 0 && (
        <Stat label="New recurring charges">
          {started.map((s) =>
            line(
              `${s.name} · ${fmt2(s.amount, "AUD")} ${s.billingCycle || ""}`,
              s.name,
            ),
          )}
        </Stat>
      )}
      {priceChanges.length > 0 && (
        <Stat label="Price changes">
          {priceChanges.map((p) =>
            line(
              `${p.name}: ${fmt2(p.oldAmount, "AUD")} → ${fmt2(p.newAmount, "AUD")}`,
              `${p.name}${p.date}`,
            ),
          )}
        </Stat>
      )}
      {trialsEnded.length > 0 && (
        <Stat label="Free trials that ended">
          {trialsEnded.map((s) =>
            line(`${s.name} · now ${fmt2(s.amount, "AUD")}`, s.name),
          )}
        </Stat>
      )}
    </Stack>
  );
}

function NetWorthSlide({ review }) {
  const theme = useTheme();
  const w = review.wealth;
  return (
    <Stack spacing={2}>
      <Stat label="You're now worth">
        <BigMoney value={w.closing.netWorth} />
        {w.netWorthChange != null && (
          <Typography
            variant="h5"
            fontWeight={700}
            color={num(w.netWorthChange) >= 0 ? "success.main" : "error.main"}
          >
            {num(w.netWorthChange) >= 0 ? "+" : ""}
            {fmt(w.netWorthChange, "AUD")} ({pct(num(w.netWorthChangePercent))})
            this month
          </Typography>
        )}
      </Stat>
      {w.trend.length > 1 && (
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Since {monthLong(w.trend[0].month)}
          </Typography>
          <Sparkline
            data={w.trend}
            dataKey="value"
            color={theme.palette.success.main}
            height={120}
          />
        </Box>
      )}
    </Stack>
  );
}

const WATERFALL_STEPS = [
  ["savings", "Saved from income"],
  ["investmentGrowth", "Investment growth"],
  ["equityComp", "Equity comp"],
  ["other", "Super, property & other"],
];

/** Floating bars: each step starts where the previous one ended; the last bar is the net change. */
function WaterfallSlide({ review }) {
  const theme = useTheme();
  const animate = !useReducedMotion();
  const w = review.wealth.waterfall;
  let running = 0;
  const data = WATERFALL_STEPS.filter(([key]) => num(w[key]) !== 0).map(
    ([key, name]) => {
      const value = num(w[key]);
      const row = {
        name,
        base: Math.min(running, running + value),
        size: Math.abs(value),
        value,
      };
      running += value;
      return row;
    },
  );
  data.push({
    name: "Net change",
    base: Math.min(0, running),
    size: Math.abs(running),
    value: running,
    total: true,
  });
  const colorFor = (d) =>
    d.total
      ? theme.palette.info.main
      : d.value >= 0
        ? theme.palette.success.main
        : theme.palette.error.main;
  return (
    <Box sx={{ height: 340 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 24, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <ReferenceLine y={0} stroke={theme.palette.divider} />
          <Bar
            dataKey="base"
            stackId="w"
            fill="transparent"
            isAnimationActive={false}
          />
          <Bar
            dataKey="size"
            stackId="w"
            radius={[4, 4, 4, 4]}
            animationDuration={1200}
            isAnimationActive={animate}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={colorFor(d)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap", mt: 1 }}>
        {data.map((d) => (
          <Typography key={d.name} variant="body2">
            {d.name}:{" "}
            <b>
              {d.value >= 0 ? "+" : ""}
              {fmt(d.value, "AUD")}
            </b>
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

function AssetsSlide({ review }) {
  const w = review.wealth;
  const classes = [
    ...new Set(w.trend.flatMap((p) => Object.keys(p.breakdown || {}))),
  ];
  const rows = w.trend
    .filter((p) => p.breakdown)
    .map((p) => ({
      date: p.month,
      ...Object.fromEntries(classes.map((c) => [c, num(p.breakdown[c])])),
    }));
  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        {w.allocation.map((c) => (
          <Stack
            key={c.assetClass}
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "3px",
                bgcolor: classColor(c.assetClass),
              }}
            />
            <Typography sx={{ flex: 1 }}>{classLabel(c.assetClass)}</Typography>
            <Typography fontWeight={700}>{fmt(c.closing, "AUD")}</Typography>
            {c.change != null && (
              <Typography
                variant="body2"
                sx={{ width: 90, textAlign: "right" }}
                color={num(c.change) >= 0 ? "success.main" : "error.main"}
              >
                {num(c.change) >= 0 ? "+" : ""}
                {compact(c.change)}
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
      {rows.length > 1 && (
        <AllocationHistoryChart
          rows={rows}
          classes={classes}
          currency="AUD"
          labelFor={classLabel}
          colorFor={classColor}
          height={200}
        />
      )}
    </Stack>
  );
}

function HoldingRows({ holdings }) {
  return (
    <Stack spacing={1}>
      {holdings.map((h) => (
        <Stack key={h.ticker} direction="row" alignItems="center" spacing={1}>
          <Typography fontWeight={700} sx={{ width: 70 }}>
            {h.ticker}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1, opacity: 0.8 }} noWrap>
            {h.name}
            {h.priceEstimated && " (no price)"}
          </Typography>
          <Typography
            fontWeight={700}
            color={num(h.gain) >= 0 ? "success.main" : "error.main"}
          >
            {num(h.gain) >= 0 ? "+" : ""}
            {fmt(h.gain, "AUD")}
          </Typography>
          <Typography variant="body2" sx={{ width: 60, textAlign: "right" }}>
            {h.returnPercent != null ? pct(num(h.returnPercent)) : "—"}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function InvestmentsSlide({ review }) {
  const holdings = review.wealth.holdings;
  const winners = holdings.filter((h) => num(h.gain) > 0).slice(0, 3);
  const losers = holdings
    .filter((h) => num(h.gain) < 0)
    .slice(-3)
    .reverse();
  return (
    <Stack spacing={3}>
      {winners.length > 0 && (
        <Stat label="Top movers up">
          <HoldingRows holdings={winners} />
        </Stat>
      )}
      {losers.length > 0 && (
        <Stat label="Biggest drags">
          <HoldingRows holdings={losers} />
        </Stat>
      )}
    </Stack>
  );
}

function KidSlide({ kid }) {
  const theme = useTheme();
  return (
    <Stack spacing={2}>
      <Stat label="Now worth">
        <BigMoney value={kid.closingValue} />
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mt: 1 }}>
          <Chip
            color={num(kid.growth) >= 0 ? "success" : "error"}
            label={`${num(kid.growth) >= 0 ? "+" : ""}${fmt(kid.growth, "AUD")} market growth`}
          />
          {num(kid.contributions) !== 0 && (
            <Chip label={`${fmt(kid.contributions, "AUD")} added`} />
          )}
        </Stack>
      </Stat>
      {kid.trend.length > 1 && (
        <Sparkline
          data={kid.trend}
          dataKey="value"
          color={theme.palette.warning.light}
          height={100}
        />
      )}
      {kid.holdings.length > 0 && (
        <HoldingRows holdings={kid.holdings.slice(0, 3)} />
      )}
    </Stack>
  );
}

function OutroSlide({ review }) {
  const t = review.totals;
  const top = review.categories[0];
  const w = review.wealth;
  return (
    <Stack spacing={2} alignItems="center" textAlign="center">
      <Typography variant="h3" fontWeight={900}>
        That was {monthLong(review.month)}
      </Typography>
      <Typography variant="h6">
        Kept {fmt(t.net, "AUD")}
        {top && num(top.spend) > 0 && ` · Most went on ${top.category}`}
        {w?.netWorthChange != null &&
          ` · Net worth ${num(w.netWorthChange) >= 0 ? "up" : "down"} ${fmt(Math.abs(num(w.netWorthChange)), "AUD")}`}
      </Typography>
    </Stack>
  );
}

/**
 * The walkthrough's running order. Slides without data (no subscriptions
 * changes, no wealth snapshot, no holdings) are left out rather than shown empty.
 * `bg` is the walkthrough's backdrop; the overview ignores it.
 */
export function buildSlides(review) {
  const w = review.wealth;
  const s = review.subscriptionChanges;
  const slides = [
    {
      id: "intro",
      title: "Intro",
      bg: "linear-gradient(135deg,#1a237e,#4a148c)",
      Component: IntroSlide,
    },
    {
      id: "headline",
      title: "The headline",
      bg: "linear-gradient(135deg,#b71c1c,#e65100)",
      Component: HeadlineSlide,
    },
    {
      id: "categories",
      title: "Spend by category",
      bg: "linear-gradient(135deg,#004d40,#00695c)",
      Component: CategoriesSlide,
      show: review.categories.length > 0,
    },
    {
      id: "mix",
      title: "The spend mix",
      bg: "linear-gradient(135deg,#4a148c,#311b92)",
      Component: SpendMixSlide,
      show: num(review.totals.spend) > 0,
    },
    {
      id: "pace",
      title: "Spending pace",
      bg: "linear-gradient(135deg,#263238,#37474f)",
      Component: PaceSlide,
      show: review.cumulative.thisMonth.length > 0,
    },
    {
      id: "merchants",
      title: "Where it went",
      bg: "linear-gradient(135deg,#880e4f,#4a148c)",
      Component: MerchantsSlide,
      show: review.topMerchants.length > 0,
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      bg: "linear-gradient(135deg,#263238,#455a64)",
      Component: SubscriptionsSlide,
      show: s.started.length + s.priceChanges.length + s.trialsEnded.length > 0,
    },
    {
      id: "networth",
      title: "Net worth",
      bg: "linear-gradient(135deg,#1b5e20,#2e7d32)",
      Component: NetWorthSlide,
      show: !!w?.closing,
    },
    {
      id: "waterfall",
      title: "What moved net worth",
      bg: "linear-gradient(135deg,#004d40,#1b5e20)",
      Component: WaterfallSlide,
      show: !!w?.waterfall,
    },
    {
      id: "assets",
      title: "Assets",
      bg: "linear-gradient(135deg,#01579b,#006064)",
      Component: AssetsSlide,
      show: (w?.allocation.length || 0) > 0,
    },
    {
      id: "investments",
      title: "Investments",
      bg: "linear-gradient(135deg,#311b92,#1a237e)",
      Component: InvestmentsSlide,
      show: (w?.holdings || []).some((h) => num(h.gain) !== 0),
    },
    ...(w?.kids || [])
      .filter((k) => num(k.closingValue) !== 0 || num(k.openingValue) !== 0)
      .map((kid) => ({
        id: `kid-${kid.owner}`,
        title: `${titleCase(kid.owner)}'s portfolio`,
        bg: "linear-gradient(135deg,#6a1b9a,#ad1457)",
        Component: KidSlide,
        props: { kid },
      })),
    {
      id: "outro",
      title: "Wrap-up",
      bg: "linear-gradient(135deg,#212121,#1a237e)",
      Component: OutroSlide,
    },
  ];
  return slides.filter((slide) => slide.show !== false);
}
