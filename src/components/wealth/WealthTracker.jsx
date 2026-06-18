import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip as MuiTooltip,
  Chip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  PriceChange as PriceChangeIcon,
  CurrencyExchange as CurrencyExchangeIcon,
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
import { useWealth } from "../../services/useWealth";

// --- formatting + constants -------------------------------------------------

const moneyFmt = (ccy, digits) =>
  new Intl.NumberFormat(ccy === "USD" ? "en-US" : "en-AU", {
    style: "currency",
    currency: ccy || "AUD",
    maximumFractionDigits: digits,
  });
const fmt = (n, ccy) => moneyFmt(ccy, 0).format(Number(n) || 0);
const fmt2 = (n, ccy) => moneyFmt(ccy, 2).format(Number(n) || 0);
const compact = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const pct = (n) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);

const CLASS_LABELS = {
  CASH: "Cash & Savings",
  SHARES: "Shares & ETFs",
  SUPER: "Superannuation",
  PROPERTY: "Property",
  OTHER_ASSET: "Other Assets",
  LIABILITY: "Liabilities",
};
const CLASS_COLORS = {
  CASH: "#26a69a",
  SHARES: "#42a5f5",
  SUPER: "#7e57c2",
  PROPERTY: "#ef6c00",
  OTHER_ASSET: "#8d6e63",
  LIABILITY: "#ef5350",
};
const classLabel = (c) => CLASS_LABELS[c] || c;

// Asset classes the user can add as plain wealth items (SHARES is derived from trades).
const ASSET_CLASS_OPTIONS = ["CASH", "SUPER", "PROPERTY", "OTHER_ASSET"];
const CURRENCIES = ["AUD", "USD"];

// --- KPI card ---------------------------------------------------------------

function Kpi({ title, value, sub, color }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ color, fontWeight: 600 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="body2" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// --- Add / edit item dialog -------------------------------------------------

function ItemDialog({ open, onClose, onSave, kind, initial }) {
  const editing = !!initial;
  const isLiability = kind === "LIABILITY";
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState(
    isLiability ? "LIABILITY" : "CASH",
  );
  const [currency, setCurrency] = useState("AUD");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  React.useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setAssetClass(
        initial?.assetClass || (isLiability ? "LIABILITY" : "CASH"),
      );
      setCurrency(initial?.currency || "AUD");
      setValue(
        initial?.currentValueNative != null
          ? String(initial.currentValueNative)
          : "",
      );
      setNote(initial?.note || "");
    }
  }, [open, initial, isLiability]);

  const save = () => {
    const v = Number(value);
    if (!name.trim() || !Number.isFinite(v)) return;
    onSave({
      name: name.trim(),
      assetClass,
      kind: isLiability ? "LIABILITY" : "ASSET",
      currency,
      currentValue: v,
      note: note.trim(),
    });
    onClose();
  };

  const title = editing
    ? "Edit item"
    : isLiability
      ? "Add liability"
      : "Add asset";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="dense"
          autoFocus
        />
        {!isLiability && (
          <TextField
            select
            label="Asset class"
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value)}
            fullWidth
            margin="dense"
          >
            {ASSET_CLASS_OPTIONS.map((c) => (
              <MenuItem key={c} value={c}>
                {classLabel(c)}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          fullWidth
          margin="dense"
        >
          {CURRENCIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={isLiability ? "Balance owing" : "Current value"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          fullWidth
          margin="dense"
          type="number"
        />
        <TextField
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Add trade dialog (pick or create a security) ---------------------------

function TradeDialog({
  open,
  onClose,
  securities,
  onAddSecurity,
  onSaveTrade,
}) {
  const NEW = "__new__";
  const [securityId, setSecurityId] = useState("");
  const [ticker, setTicker] = useState("");
  const [exchange, setExchange] = useState("ASX");
  const [secCurrency, setSecCurrency] = useState("AUD");
  const [secName, setSecName] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open) {
      setSecurityId(securities.length ? String(securities[0].id) : NEW);
      setTicker("");
      setExchange("ASX");
      setSecCurrency("AUD");
      setSecName("");
      setSide("BUY");
      setQuantity("");
      setPrice("");
      setFee("");
      setTradeDate(todayIso());
      setNote("");
    }
  }, [open, securities]);

  const addingNew = securityId === NEW || securities.length === 0;

  const save = async () => {
    const q = Number(quantity);
    const p = Number(price);
    if (
      !Number.isFinite(q) ||
      q <= 0 ||
      !Number.isFinite(p) ||
      p <= 0 ||
      !tradeDate
    )
      return;
    if (addingNew && !ticker.trim()) return;
    setBusy(true);
    try {
      let secId = securityId;
      if (addingNew) {
        const sec = await onAddSecurity({
          ticker: ticker.trim(),
          exchange: exchange.trim(),
          currency: secCurrency,
          name: secName.trim(),
        });
        secId = sec.id;
      }
      await onSaveTrade({
        securityId: Number(secId),
        side,
        quantity: q,
        price: p,
        fee: Number(fee) || 0,
        tradeDate,
        note: note.trim(),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add trade</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Security"
          value={securityId}
          onChange={(e) => setSecurityId(e.target.value)}
          fullWidth
          margin="dense"
        >
          {securities.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.ticker}
              {s.name ? ` — ${s.name}` : ""} ({s.currency})
            </MenuItem>
          ))}
          <MenuItem value={NEW}>+ Add new security…</MenuItem>
        </TextField>

        {addingNew && (
          <Box
            sx={{
              pl: 1,
              borderLeft: "2px solid",
              borderColor: "divider",
              mt: 1,
            }}
          >
            <TextField
              label="Ticker (e.g. CBA.AX, AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              fullWidth
              margin="dense"
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="Exchange"
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  fullWidth
                  margin="dense"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Currency"
                  value={secCurrency}
                  onChange={(e) => setSecCurrency(e.target.value)}
                  fullWidth
                  margin="dense"
                >
                  {CURRENCIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <TextField
              label="Name (optional)"
              value={secName}
              onChange={(e) => setSecName(e.target.value)}
              fullWidth
              margin="dense"
            />
          </Box>
        )}

        <ToggleButtonGroup
          size="small"
          exclusive
          value={side}
          onChange={(_, v) => v && setSide(v)}
          sx={{ mt: 1, mb: 1 }}
        >
          <ToggleButton value="BUY">Buy</ToggleButton>
          <ToggleButton value="SELL">Sell</ToggleButton>
        </ToggleButtonGroup>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <TextField
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
              margin="dense"
              type="number"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Price / unit"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              fullWidth
              margin="dense"
              type="number"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Fee"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              fullWidth
              margin="dense"
              type="number"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Trade date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              fullWidth
              margin="dense"
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <TextField
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained" disabled={busy}>
          Add trade
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Set price dialog -------------------------------------------------------

function PriceDialog({ open, onClose, securities, onSave }) {
  const [securityId, setSecurityId] = useState("");
  const [price, setPrice] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayIso());

  React.useEffect(() => {
    if (open) {
      setSecurityId(securities.length ? String(securities[0].id) : "");
      setPrice("");
      setAsOfDate(todayIso());
    }
  }, [open, securities]);

  const save = () => {
    const p = Number(price);
    if (!securityId || !Number.isFinite(p) || p <= 0) return;
    onSave({ securityId: Number(securityId), price: p, asOfDate });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Set price</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Security"
          value={securityId}
          onChange={(e) => setSecurityId(e.target.value)}
          fullWidth
          margin="dense"
        >
          {securities.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.ticker} ({s.currency})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Price / unit"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          fullWidth
          margin="dense"
          type="number"
        />
        <TextField
          label="As of date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          fullWidth
          margin="dense"
          type="date"
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={save}
          variant="contained"
          disabled={!securities.length}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Set FX rate dialog -----------------------------------------------------

function FxDialog({ open, onClose, onSave, currentRate }) {
  const [rate, setRate] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayIso());

  React.useEffect(() => {
    if (open) {
      setRate(currentRate != null ? String(currentRate) : "");
      setAsOfDate(todayIso());
    }
  }, [open, currentRate]);

  const save = () => {
    const r = Number(rate);
    if (!Number.isFinite(r) || r <= 0) return;
    onSave({ baseCcy: "USD", quoteCcy: "AUD", rate: r, asOfDate });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Set USD → AUD rate</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          1 USD = ? AUD. Used to convert USD holdings/assets into the display
          currency.
        </Typography>
        <TextField
          label="Rate (AUD per USD)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          fullWidth
          margin="dense"
          type="number"
          autoFocus
        />
        <TextField
          label="As of date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          fullWidth
          margin="dense"
          type="date"
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Main component ---------------------------------------------------------

export default function WealthTracker() {
  const [currency, setCurrency] = useState("AUD");
  const wealth = useWealth(currency);
  const { summary, securities, trades, loading, error } = wealth;
  const [dialog, setDialog] = useState(null); // 'asset' | 'liability' | 'trade' | 'price' | 'fx'
  const [editItem, setEditItem] = useState(null);

  const tickerById = useMemo(() => {
    const m = {};
    (securities || []).forEach((s) => {
      m[s.id] = s.ticker;
    });
    return m;
  }, [securities]);

  const allocData = useMemo(
    () =>
      (summary?.allocation || []).map((a) => ({
        name: classLabel(a.assetClass),
        value: Number(a.value) || 0,
        pct: a.pct,
        color: CLASS_COLORS[a.assetClass] || "#90a4ae",
      })),
    [summary],
  );

  const snapData = useMemo(
    () =>
      (summary?.snapshots || []).map((s) => ({
        date: s.asOfDate,
        netWorth: Number(s.netWorth) || 0,
        assets: Number(s.totalAssets) || 0,
        liabilities: Number(s.totalLiabilities) || 0,
      })),
    [summary],
  );

  const holdings = summary?.holdings || [];
  const items = summary?.items || [];
  const liabilities = items.filter((i) => i.kind === "LIABILITY");
  const assetItems = items.filter((i) => i.kind !== "LIABILITY");

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading your wealth…</Typography>
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Could not load wealth data: {String(error.message || error)}
        </Alert>
      </Box>
    );
  }

  const delta = summary?.deltaVsPrevious;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Header */}
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
        <Typography variant="h4">Total Wealth</Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={currency}
            onChange={(_, v) => v && setCurrency(v)}
          >
            <ToggleButton value="AUD">AUD</ToggleButton>
            <ToggleButton value="USD">USD</ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="small"
            startIcon={<CameraAltIcon />}
            onClick={() => wealth.runSnapshot()}
          >
            Snapshot now
          </Button>
        </Box>
      </Box>

      {summary?.fxMissing && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setDialog("fx")}
            >
              Set rate
            </Button>
          }
        >
          You hold values in another currency but no USD→AUD rate is set —
          totals treat 1 USD = 1 AUD until you set one.
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <Kpi
            title="Net worth"
            value={fmt(summary?.netWorth, currency)}
            sub={
              delta == null
                ? "No prior snapshot yet"
                : `${delta >= 0 ? "▲" : "▼"} ${fmt(Math.abs(delta), currency)} (${pct(
                    summary?.deltaPct,
                  )}) vs last snapshot`
            }
            color={
              Number(summary?.netWorth) >= 0 ? "primary.main" : "error.main"
            }
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Kpi
            title="Total assets"
            value={fmt(summary?.totalAssets, currency)}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Kpi
            title="Total liabilities"
            value={fmt(summary?.totalLiabilities, currency)}
            color="error.main"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" gutterBottom>
              Allocation by asset class
            </Typography>
            {allocData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={allocData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
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
                Add an asset or a holding to see your allocation.
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" gutterBottom>
              Net worth over time
            </Typography>
            {snapData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={snapData}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={compact} />
                  <Tooltip formatter={(v) => fmt(v, currency)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="assets"
                    name="Assets"
                    stroke="#66bb6a"
                    fill="#66bb6a"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="liabilities"
                    name="Liabilities"
                    stroke="#ef5350"
                    fill="#ef5350"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net worth"
                    stroke="#1976d2"
                    fill="#1976d2"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No snapshots yet — they're captured monthly, or hit “Snapshot
                now”.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Holdings */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6">Holdings</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              startIcon={<PriceChangeIcon />}
              onClick={() => setDialog("price")}
            >
              Set price
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialog("trade")}
            >
              Add trade
            </Button>
          </Box>
        </Box>
        {holdings.length ? (
          <Table size="small">
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
                const stale = !h.lastPrice;
                const up = Number(h.unrealisedPlDisplay) >= 0;
                return (
                  <TableRow key={h.securityId}>
                    <TableCell>
                      <strong>{h.ticker}</strong>
                      {h.currency !== currency && (
                        <Chip
                          size="small"
                          label={h.currency}
                          sx={{ ml: 0.5 }}
                        />
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
                      {stale ? (
                        <MuiTooltip title="No price set">
                          <span style={{ color: "#999" }}>—</span>
                        </MuiTooltip>
                      ) : (
                        <MuiTooltip title={`as of ${h.lastPriceDate}`}>
                          <span>{fmt2(h.lastPrice, h.currency)}</span>
                        </MuiTooltip>
                      )}
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
          <Typography variant="body2" color="text.secondary">
            No holdings yet — “Add trade” to record a buy.
          </Typography>
        )}
      </Paper>

      {/* Assets & liabilities */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6">Assets &amp; liabilities</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              startIcon={<CurrencyExchangeIcon />}
              onClick={() => setDialog("fx")}
            >
              {summary?.fxRateUsdAud
                ? `USD→AUD ${Number(summary.fxRateUsdAud).toFixed(4)}`
                : "Set FX"}
            </Button>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setDialog("liability")}
            >
              Add liability
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialog("asset")}
            >
              Add asset
            </Button>
          </Box>
        </Box>
        {assetItems.length || liabilities.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Class</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...assetItems, ...liabilities].map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    {it.name}
                    {it.currency !== currency && (
                      <Chip size="small" label={it.currency} sx={{ ml: 0.5 }} />
                    )}
                    {it.note && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {it.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{classLabel(it.assetClass)}</TableCell>
                  <TableCell
                    align="right"
                    style={{
                      color: it.kind === "LIABILITY" ? "#c62828" : undefined,
                    }}
                  >
                    {it.kind === "LIABILITY" ? "−" : ""}
                    {fmt(it.valueDisplay, currency)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setEditItem(it)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => wealth.removeItem(it.id)}
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
            Add a savings account, your home value, super, or a mortgage to
            start.
          </Typography>
        )}
      </Paper>

      {/* Trade blotter */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Trade blotter
        </Typography>
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
                      onClick={() => wealth.removeTrade(t.id)}
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
      </Paper>

      <Typography variant="caption" color="text.secondary">
        Manual entry (v1): set prices and the USD→AUD rate by hand. Super
        balance entered here feeds the Super Forecast. Snapshots are captured
        monthly.
      </Typography>

      {/* Dialogs */}
      <ItemDialog
        open={dialog === "asset"}
        kind="ASSET"
        onClose={() => setDialog(null)}
        onSave={(item) => wealth.addItem(item)}
      />
      <ItemDialog
        open={dialog === "liability"}
        kind="LIABILITY"
        onClose={() => setDialog(null)}
        onSave={(item) => wealth.addItem(item)}
      />
      <ItemDialog
        open={!!editItem}
        kind={editItem?.kind || "ASSET"}
        initial={editItem}
        onClose={() => setEditItem(null)}
        onSave={(patch) => wealth.updateItem(editItem.id, patch)}
      />
      <TradeDialog
        open={dialog === "trade"}
        securities={securities}
        onClose={() => setDialog(null)}
        onAddSecurity={wealth.addSecurity}
        onSaveTrade={wealth.addTrade}
      />
      <PriceDialog
        open={dialog === "price"}
        securities={securities}
        onClose={() => setDialog(null)}
        onSave={(p) => wealth.setPrice(p)}
      />
      <FxDialog
        open={dialog === "fx"}
        currentRate={summary?.fxRateUsdAud}
        onClose={() => setDialog(null)}
        onSave={(r) => wealth.setFx(r)}
      />
    </Box>
  );
}
