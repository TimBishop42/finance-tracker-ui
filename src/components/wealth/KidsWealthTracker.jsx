import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  ExpandMore as ExpandMoreIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useKidsWealth } from "../../services/useKidsWealth";
import { fmt, fmt2, pct, compact } from "../../utils/format";
import Kpi from "./Kpi";
import TradeDialog from "./TradeDialog";

const KIDS = [
  { owner: "CHLOE", label: "Chloe" },
  { owner: "MILLIE", label: "Millie" },
];

const PIE_COLORS = [
  "#42a5f5",
  "#66bb6a",
  "#ffa726",
  "#ab47bc",
  "#26a69a",
  "#ef5350",
  "#8d6e63",
  "#78909c",
];

// Top-of-page overview: value + P/L at a glance, plus a by-holding allocation
// pie so a quick glance shows how concentrated/diversified each portfolio is.
function KidOverview({ label, portfolio, currency }) {
  const allocData = useMemo(
    () =>
      (portfolio?.holdings || [])
        .filter((h) => Number(h.marketValueDisplay) > 0)
        .map((h, i) => ({
          name: h.ticker,
          value: Number(h.marketValueDisplay) || 0,
          color: PIE_COLORS[i % PIE_COLORS.length],
        })),
    [portfolio],
  );

  const snapData = useMemo(
    () =>
      (portfolio?.snapshots || []).map((s) => ({
        date: s.asOfDate,
        value: Number(s.valueDisplay) || 0,
      })),
    [portfolio],
  );

  return (
    <Paper sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        {label}
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Kpi
            title="Value"
            value={fmt(portfolio?.portfolioValueDisplay, currency)}
          />
        </Grid>
        <Grid item xs={4}>
          <Kpi
            title="Unrealised"
            value={fmt(portfolio?.unrealisedPlDisplay, currency)}
            color={
              Number(portfolio?.unrealisedPlDisplay) >= 0
                ? "success.main"
                : "error.main"
            }
          />
        </Grid>
        <Grid item xs={4}>
          <Kpi
            title="Realised"
            value={fmt(portfolio?.realisedPlDisplay, currency)}
            color={
              Number(portfolio?.realisedPlDisplay) >= 0
                ? "success.main"
                : "error.main"
            }
          />
        </Grid>
      </Grid>
      {allocData.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={allocData}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {allocData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmt(v, currency)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No holdings yet — add a trade below to see the allocation.
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
        Value over time
      </Typography>
      {snapData.length ? (
        <ResponsiveContainer
          width="100%"
          height={snapData.length === 1 ? 165 : 200}
        >
          <AreaChart
            data={snapData}
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={compact} />
            <Tooltip formatter={(v) => fmt(v, currency)} />
            <Area
              type="monotone"
              dataKey="value"
              name="Portfolio value"
              stroke="#1976d2"
              fill="#1976d2"
              fillOpacity={0.2}
              dot={{ r: snapData.length === 1 ? 3 : 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No snapshots yet — hit “Snapshot now” to capture today; points
          accumulate over time (also captured automatically each month).
        </Typography>
      )}
    </Paper>
  );
}

// One child's detail: holdings table, add-trade action, and her own trade
// blotter (collapsed by default — click to expand). Price/split management
// stays on the Total Wealth page — it acts on the shared security catalog.
function KidDetailSection({
  label,
  portfolio,
  currency,
  trades,
  tickerById,
  onAddTrade,
  onRemoveTrade,
}) {
  const holdings = portfolio?.holdings || [];

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">{label}</Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddTrade}
        >
          Add trade
        </Button>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Holdings
      </Typography>
      {holdings.length ? (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Ticker</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Avg cost</TableCell>
              <TableCell align="right">Last price</TableCell>
              <TableCell align="right">Market value</TableCell>
              <TableCell align="right">Unrealised P/L</TableCell>
              <TableCell align="right">Realised P/L</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holdings.map((h) => {
              const up = Number(h.unrealisedPlDisplay) >= 0;
              return (
                <TableRow key={h.securityId}>
                  <TableCell>
                    <strong>{h.ticker}</strong>
                    {h.currency !== currency && (
                      <Chip size="small" label={h.currency} sx={{ ml: 0.5 }} />
                    )}
                    {h.name && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {h.name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{Number(h.quantity)}</TableCell>
                  <TableCell align="right">
                    {fmt2(h.avgCost, h.currency)}
                  </TableCell>
                  <TableCell align="right">
                    {h.priceIsEstimated
                      ? `${fmt2(h.avgCost, h.currency)} (avg)`
                      : fmt2(h.lastPrice, h.currency)}
                  </TableCell>
                  <TableCell align="right">
                    {fmt(h.marketValueDisplay, currency)}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ color: up ? "#2e7d32" : "#c62828" }}
                  >
                    {fmt(h.unrealisedPlDisplay, currency)}
                    {h.unrealisedPlPct != null &&
                      ` (${pct(h.unrealisedPlPct)})`}
                  </TableCell>
                  <TableCell align="right">
                    {fmt(h.realisedPlDisplay, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No holdings yet — “Add trade” to record a buy.
        </Typography>
      )}

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            Trade blotter ({trades.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {trades.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Security</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Fee</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.tradeDate}</TableCell>
                    <TableCell>
                      {tickerById[t.securityId] || t.securityId}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={t.side}
                        color={t.side === "BUY" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">{Number(t.quantity)}</TableCell>
                    <TableCell align="right">{Number(t.price)}</TableCell>
                    <TableCell align="right">{Number(t.fee)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => onRemoveTrade(t.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No trades recorded yet.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

export default function KidsWealthTracker() {
  const [currency, setCurrency] = useState("AUD");
  const kids = useKidsWealth(currency);
  const { summary, securities, trades, loading, error } = kids;
  const [tradeOwner, setTradeOwner] = useState(null); // "CHLOE" | "MILLIE" | null (dialog closed)
  const [refreshing, setRefreshing] = useState(false);
  const [snack, setSnack] = useState(null);

  const tickerById = useMemo(() => {
    const m = {};
    (securities || []).forEach((s) => {
      m[s.id] = s.ticker;
    });
    return m;
  }, [securities]);

  const onRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const results = (await kids.refreshPrices()) || [];
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok).map((r) => r.symbol);
      setSnack(
        failed.length
          ? `Updated ${ok}/${results.length}. Couldn't price: ${failed.join(", ")}`
          : `Updated ${ok} ${ok === 1 ? "price" : "prices"} + FX.`,
      );
    } catch (e) {
      setSnack("Price refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  const onSnapshotNow = async () => {
    try {
      await kids.runSnapshot();
      setSnack("Snapshot captured for today.");
    } catch (e) {
      setSnack("Snapshot failed.");
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading the kids’ portfolios…</Typography>
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Could not load kids’ wealth data: {String(error.message || error)}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography variant="h4">Kids’ Portfolios</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            startIcon={<SyncIcon />}
            onClick={onRefreshPrices}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh prices"}
          </Button>
          <Button
            size="small"
            startIcon={<CameraAltIcon />}
            onClick={onSnapshotNow}
          >
            Snapshot now
          </Button>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={currency}
            onChange={(_, v) => v && setCurrency(v)}
          >
            <ToggleButton value="AUD">AUD</ToggleButton>
            <ToggleButton value="USD">USD</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {summary?.fxMissing && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          A holding is in another currency but no USD→AUD rate is set — totals
          treat 1 USD = 1 AUD until you set one on the Total Wealth page.
        </Alert>
      )}

      {/* Overview: both girls side by side for a quick at-a-glance comparison. */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        {KIDS.map(({ owner, label }) => (
          <Grid item xs={12} md={6} key={owner}>
            <KidOverview
              label={label}
              portfolio={owner === "CHLOE" ? summary?.chloe : summary?.millie}
              currency={currency}
            />
          </Grid>
        ))}
      </Grid>

      {/* Detail: holdings + trades, stacked one after another. */}
      {KIDS.map(({ owner, label }) => (
        <KidDetailSection
          key={owner}
          label={label}
          portfolio={owner === "CHLOE" ? summary?.chloe : summary?.millie}
          currency={currency}
          trades={trades[owner] || []}
          tickerById={tickerById}
          onAddTrade={() => setTradeOwner(owner)}
          onRemoveTrade={(id) => kids.removeTrade(id)}
        />
      ))}

      <TradeDialog
        open={!!tradeOwner}
        showOwnerPicker
        initialOwner={tradeOwner}
        securities={securities}
        onClose={() => setTradeOwner(null)}
        onAddSecurity={kids.addSecurity}
        onSaveTrade={kids.addTrade}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack || ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
