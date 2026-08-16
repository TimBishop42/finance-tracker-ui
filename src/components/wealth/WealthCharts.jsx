import React from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt, share, compact, monthShort, monthLong } from "./wealthFormat";

// Presentation for the Total Wealth time series. Shared axis/grid/tooltip
// styling lives here so the charts read as one system rather than three
// differently-dressed recharts defaults.

const GRID = "#e8eaed";
const AXIS_TICK = { fontSize: 11, fill: "#8a9099" };
const AXIS = { stroke: GRID };

// Solid strokes with a gradient fill under the primary series only. Flat
// semi-transparent fills stacked on top of each other were the problem: they
// muddied every colour and let the gridlines show straight through.
function fadeDefs(id, color) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.45} />
        <stop offset="100%" stopColor={color} stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

/** Opaque card tooltip — the default translucent one washed out over the fills. */
function ChartTooltip({ active, payload, label, currency, asPercent }) {
  if (!active || !payload?.length) return null;
  const format = (v) => (asPercent ? share(v) : fmt(v, currency));
  return (
    <Paper elevation={4} sx={{ px: 1.5, py: 1, minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary">
        {monthLong(label)}
      </Typography>
      {[...payload].reverse().map((p) => (
        <Box
          key={p.dataKey}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "2px",
                bgcolor: p.color || p.stroke,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2">{p.name}</Typography>
          </Box>
          <Typography variant="body2" fontWeight={600}>
            {format(p.value)}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

/** Small inline legend used by both charts, in place of recharts' default. */
function ChartLegend({ items, onSelect }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1, ml: 1 }}>
      {items.map((it) => {
        const swatch = (
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "2px",
              bgcolor: it.color,
              flexShrink: 0,
            }}
          />
        );
        return onSelect ? (
          <Button
            key={it.key}
            size="small"
            onClick={() => onSelect(it.key)}
            startIcon={swatch}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              minWidth: 0,
              px: 0.75,
              py: 0,
            }}
          >
            {it.label}
          </Button>
        ) : (
          <Box
            key={it.key}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            {swatch}
            <Typography variant="caption" color="text.secondary">
              {it.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

const NET = "#1565c0";
const ASSETS = "#2e7d32";
const LIABS = "#c62828";

/**
 * Net worth is the headline, so it alone gets the gradient area; assets and
 * liabilities ride along as clean strokes. One fill instead of three means no
 * overlapping washes and nothing bleeding through from the grid.
 */
export function NetWorthChart({ data, currency, height = 300 }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          {fadeDefs("netWorthFade", NET)}
          {/* Horizontal only, solid and pale — dashed lines in both axes were
              the visual noise showing through the old fills. */}
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={monthShort}
            tick={AXIS_TICK}
            axisLine={AXIS}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={compact}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ stroke: "#b0b6bd", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net worth"
            stroke={NET}
            strokeWidth={2.5}
            fill="url(#netWorthFade)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="assets"
            name="Assets"
            stroke={ASSETS}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="liabilities"
            name="Liabilities"
            stroke={LIABS}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { key: "netWorth", label: "Net worth", color: NET },
          { key: "assets", label: "Assets", color: ASSETS },
          { key: "liabilities", label: "Liabilities", color: LIABS },
        ]}
      />
    </>
  );
}

/**
 * Stacked allocation over time, in dollars or as a 100% share.
 *
 * Deliberately has no legend of its own: it renders directly beneath the
 * composition bar, whose legend uses the same colours and already carries each
 * class's current value. A second copy would just duplicate every label.
 */
export function AllocationHistoryChart({
  rows,
  classes,
  currency,
  asPercent,
  labelFor,
  colorFor,
  height = 260,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={monthShort}
          tick={AXIS_TICK}
          axisLine={AXIS}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={asPercent ? (v) => `${v}%` : compact}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={asPercent ? [0, 100] : undefined}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} asPercent={asPercent} />}
          cursor={{ stroke: "#b0b6bd", strokeWidth: 1 }}
        />
        {classes.map((c) => (
          <Area
            key={c}
            type="monotone"
            dataKey={c}
            name={labelFor(c)}
            stackId="alloc"
            stroke={colorFor(c)}
            strokeWidth={1}
            // Stacked bands don't overlap, so a solid fill is safe here and
            // reads far cleaner than washed-out translucency.
            fill={colorFor(c)}
            fillOpacity={0.85}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Current allocation as one full-width stacked bar. Labels sit in the legend
 * rather than inside the bar: at this width a small category is only a few
 * pixels across. `minWidth` keeps such a segment visible and clickable instead
 * of collapsing to nothing.
 */
export function AllocationBar({ data, currency, onSelect }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const openIt = (cls) => () => onSelect(cls);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: "2px",
          width: "100%",
          height: 32,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {data.map((d) => (
          <MuiTooltip
            key={d.assetClass}
            title={`${d.name} · ${fmt(d.value, currency)} · ${share(d.pct)}`}
          >
            <Box
              onClick={openIt(d.assetClass)}
              sx={{
                flexGrow: total > 0 ? d.value / total : 1,
                flexBasis: 0,
                minWidth: 8,
                bgcolor: d.color,
                cursor: "pointer",
                transition: "filter 120ms",
                "&:hover": { filter: "brightness(1.15)" },
              }}
            />
          </MuiTooltip>
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
        {data.map((d) => (
          <Button
            key={d.assetClass}
            onClick={openIt(d.assetClass)}
            sx={{
              textTransform: "none",
              color: "text.primary",
              justifyContent: "flex-start",
              px: 1,
            }}
            startIcon={
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  bgcolor: d.color,
                  flexShrink: 0,
                }}
              />
            }
          >
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="body2" lineHeight={1.3}>
                {d.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fmt(d.value, currency)} · {share(d.pct)}
              </Typography>
            </Box>
          </Button>
        ))}
      </Box>
    </Box>
  );
}
