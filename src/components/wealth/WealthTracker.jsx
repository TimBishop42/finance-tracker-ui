import React, { useMemo, useState, useRef } from "react";
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
  Snackbar,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  PriceChange as PriceChangeIcon,
  CurrencyExchange as CurrencyExchangeIcon,
  CameraAlt as CameraAltIcon,
  CallSplit as CallSplitIcon,
  Sync as SyncIcon,
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
import { quoteSecurity } from "../../services/finance-service";

// --- formatting + constants -------------------------------------------------

const moneyFmt = (ccy, digits) =>
  new Intl.NumberFormat(ccy === "USD" ? "en-US" : "en-AU", {
    style: "currency",
    currency: ccy || "AUD",
    maximumFractionDigits: digits,
  });
const fmt = (n, ccy) => moneyFmt(ccy, 0).format(Number(n) || 0);
const fmt2 = (n, ccy) => moneyFmt(ccy, 2).format(Number(n) || 0);
const qtyFmt = (q) =>
  (Number(q) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const compact = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const pct = (n) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);
const fmtRatio = (r) => {
  const v = Number(r);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v >= 1 ? `${+v.toFixed(4)}:1` : `1:${+(1 / v).toFixed(4)}`;
};

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

function PriceDialog({ open, onClose, securities, onSave, presetSecurityId }) {
  const [securityId, setSecurityId] = useState("");
  const [price, setPrice] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayIso());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open) {
      setSecurityId(
        presetSecurityId != null
          ? String(presetSecurityId)
          : securities.length
            ? String(securities[0].id)
            : "",
      );
      setPrice("");
      setAsOfDate(todayIso());
      setErr("");
    }
  }, [open, securities, presetSecurityId]);

  const save = async () => {
    const p = Number(price);
    if (!securityId || !Number.isFinite(p) || p <= 0) {
      setErr("Pick a security and enter a price greater than 0.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onSave({ securityId: Number(securityId), price: p, asOfDate });
      onClose();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
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
        {err && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {err}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained" disabled={busy}>
          {busy ? "Saving…" : "Save"}
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

// --- Add split dialog -------------------------------------------------------

function SplitDialog({ open, onClose, securities, onSave }) {
  const [securityId, setSecurityId] = useState("");
  const [newShares, setNewShares] = useState("");
  const [oldShares, setOldShares] = useState("1");
  const [exDate, setExDate] = useState(todayIso());

  React.useEffect(() => {
    if (open) {
      setSecurityId(securities.length ? String(securities[0].id) : "");
      setNewShares("");
      setOldShares("1");
      setExDate(todayIso());
    }
  }, [open, securities]);

  const n = Number(newShares);
  const o = Number(oldShares);
  const ratio = o > 0 ? n / o : NaN;

  const save = () => {
    if (!securityId || !(n > 0) || !(o > 0) || !exDate) return;
    onSave({ securityId: Number(securityId), exDate, ratio: n / o });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add stock split</DialogTitle>
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          A 5-for-1 split = 5 new shares for every 1 old. A 1-for-5
          consolidation = 1 new for every 5 old.
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <TextField
              label="New shares"
              value={newShares}
              onChange={(e) => setNewShares(e.target.value)}
              fullWidth
              margin="dense"
              type="number"
              autoFocus
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="for every (old)"
              value={oldShares}
              onChange={(e) => setOldShares(e.target.value)}
              fullWidth
              margin="dense"
              type="number"
            />
          </Grid>
        </Grid>
        <TextField
          label="Ex-date"
          value={exDate}
          onChange={(e) => setExDate(e.target.value)}
          fullWidth
          margin="dense"
          type="date"
          InputLabelProps={{ shrink: true }}
        />
        {Number.isFinite(ratio) && ratio > 0 && (
          <Typography variant="caption" color="text.secondary">
            Quantity held on the ex-date is multiplied by ×{+ratio.toFixed(4)};
            average cost adjusts automatically.
          </Typography>
        )}
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

// --- Edit security dialog ---------------------------------------------------

function SecurityDialog({ open, onClose, security, onSave }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [exchange, setExchange] = useState("");
  const [priceSymbol, setPriceSymbol] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open && security) {
      setName(security.name || "");
      setCurrency(security.currency || "AUD");
      setExchange(security.exchange || "");
      setPriceSymbol(security.priceSymbol || "");
      setTestMsg("");
    }
  }, [open, security]);

  if (!security) return null;

  const patch = () => ({ name, currency, exchange, priceSymbol });

  const test = async () => {
    setBusy(true);
    setTestMsg("Testing…");
    try {
      await onSave(security.id, patch()); // persist the typed symbol first
      const q = await quoteSecurity(security.id);
      setTestMsg(
        q && q.price != null
          ? `✓ ${q.price} ${q.currency || ""} (as of ${q.asOf || "?"})`
          : "✗ No price found — check the ticker / symbol.",
      );
    } catch (e) {
      setTestMsg("✗ Lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    onSave(security.id, patch());
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit {security.ticker}</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="dense"
        />
        <Grid container spacing={1}>
          <Grid item xs={6}>
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
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Exchange"
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              fullWidth
              margin="dense"
            />
          </Grid>
        </Grid>
        <TextField
          label="Price symbol (override)"
          value={priceSymbol}
          onChange={(e) => setPriceSymbol(e.target.value)}
          fullWidth
          margin="dense"
          helperText="Blank = auto (CBA.AX for ASX, AAPL for US)."
        />
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            startIcon={<SyncIcon />}
            onClick={test}
            disabled={busy}
          >
            Test symbol
          </Button>
          {testMsg && <Typography variant="caption">{testMsg}</Typography>}
        </Box>
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

// --- Add option grant dialog ------------------------------------------------

function OptionGrantDialog({ open, onClose, securities, grant, onSave }) {
  const editing = !!grant;
  const [grantType, setGrantType] = useState("OPTION");
  const [securityId, setSecurityId] = useState("");
  const [name, setName] = useState("");
  const [strike, setStrike] = useState("");
  const [quantity, setQuantity] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [vestStartDate, setVestStartDate] = useState(todayIso());
  const [vestIntervalMonths, setVestIntervalMonths] = useState("3");
  const [vestTranches, setVestTranches] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (grant) {
      setGrantType(grant.grantType || "OPTION");
      setSecurityId(String(grant.underlyingSecurityId));
      setName(grant.name || "");
      setStrike(grant.strike != null ? String(grant.strike) : "");
      setQuantity(grant.quantity != null ? String(grant.quantity) : "");
      setMultiplier(grant.multiplier != null ? String(grant.multiplier) : "1");
      setVestStartDate(grant.vestStartDate || todayIso());
      setVestIntervalMonths(String(grant.vestIntervalMonths ?? 3));
      setVestTranches(String(grant.totalTranches ?? ""));
      setExpiryDate(grant.expiryDate || "");
      setNote(grant.note || "");
    } else {
      setGrantType("OPTION");
      setSecurityId(securities.length ? String(securities[0].id) : "");
      setName("");
      setStrike("");
      setQuantity("");
      setMultiplier("1");
      setVestStartDate(todayIso());
      setVestIntervalMonths("3");
      setVestTranches("");
      setExpiryDate("");
      setNote("");
    }
  }, [open, grant, securities]);

  const isRsu = grantType === "RSU";

  const save = async () => {
    const s = isRsu ? 0 : Number(strike);
    const q = Number(quantity);
    const tr = Number(vestTranches);
    if (
      !securityId ||
      !Number.isFinite(s) ||
      s < 0 ||
      !Number.isFinite(q) ||
      q <= 0 ||
      !vestStartDate ||
      !Number.isFinite(tr) ||
      tr <= 0
    )
      return;
    setBusy(true);
    try {
      await onSave(grant ? grant.id : null, {
        grantType,
        underlyingSecurityId: Number(securityId),
        name: name.trim() || undefined,
        strike: s,
        quantity: q,
        multiplier: Number(multiplier) || 1,
        vestStartDate,
        vestIntervalMonths: Number(vestIntervalMonths) || 3,
        vestTranches: tr,
        expiryDate: isRsu ? undefined : expiryDate || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editing ? "Edit grant" : "Add grant"}</DialogTitle>
      <DialogContent>
        {securities.length === 0 && !editing ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Add the underlying security first (via “Add trade” → “Add new
            security”), then create the grant so its live price can value it.
          </Typography>
        ) : (
          <>
            <ToggleButtonGroup
              size="small"
              exclusive
              fullWidth
              value={grantType}
              onChange={(_, v) => v && setGrantType(v)}
              sx={{ mt: 1, mb: 1 }}
            >
              <ToggleButton value="OPTION">Options (strike)</ToggleButton>
              <ToggleButton value="RSU">RSU / equity</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              select
              label="Underlying"
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
            </TextField>
            <TextField
              label="Grant name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="dense"
            />
            <Grid container spacing={1}>
              {!isRsu && (
                <Grid item xs={6}>
                  <TextField
                    label="Strike (per share)"
                    type="number"
                    value={strike}
                    onChange={(e) => setStrike(e.target.value)}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
              )}
              <Grid item xs={isRsu ? 6 : 6}>
                <TextField
                  label={isRsu ? "Units granted" : "Options granted"}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  fullWidth
                  margin="dense"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={isRsu ? "Shares / unit" : "Shares / option"}
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="1 for employee grants"
                />
              </Grid>
              {!isRsu && (
                <Grid item xs={6}>
                  <TextField
                    label="Expiry (optional)"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Vesting schedule
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="First vest date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={vestStartDate}
                  onChange={(e) => setVestStartDate(e.target.value)}
                  fullWidth
                  margin="dense"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Every (mo)"
                  type="number"
                  value={vestIntervalMonths}
                  onChange={(e) => setVestIntervalMonths(e.target.value)}
                  fullWidth
                  margin="dense"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Tranches"
                  type="number"
                  value={vestTranches}
                  onChange={(e) => setVestTranches(e.target.value)}
                  fullWidth
                  margin="dense"
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
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={busy || (securities.length === 0 && !editing)}
        >
          {editing ? "Save" : "Add grant"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Main component ---------------------------------------------------------

export default function WealthTracker() {
  const [currency, setCurrency] = useState("AUD");
  const wealth = useWealth(currency);
  const { summary, securities, trades, splits, loading, error } = wealth;
  const [dialog, setDialog] = useState(null); // 'asset' | 'liability' | 'trade' | 'price' | 'fx' | 'split'
  const [editItem, setEditItem] = useState(null);
  const [editSecurity, setEditSecurity] = useState(null);
  const [editOption, setEditOption] = useState(null);
  const [pricePreset, setPricePreset] = useState(null); // securityId to preselect in PriceDialog
  const [refreshing, setRefreshing] = useState(false);
  const [snack, setSnack] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null); // securityId being inline-edited
  const [priceDraft, setPriceDraft] = useState("");
  const cancelInlineRef = useRef(false);

  const onRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const results = (await wealth.refreshPrices()) || [];
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

  // Per-row inline price edit (no dialog/modal — avoids the focus-trap class of bugs).
  const startInlinePrice = (h) => {
    cancelInlineRef.current = false;
    setPriceDraft(
      h.lastPrice != null
        ? String(h.lastPrice)
        : h.avgCost != null
          ? String(h.avgCost)
          : "",
    );
    setEditingPrice(h.securityId);
  };
  const commitInlinePrice = async (h) => {
    setEditingPrice(null);
    if (cancelInlineRef.current) {
      cancelInlineRef.current = false;
      return;
    }
    const p = Number(priceDraft);
    if (!Number.isFinite(p) || p <= 0) return;
    try {
      await wealth.setPrice({
        securityId: h.securityId,
        price: p,
        asOfDate: todayIso(),
      });
    } catch (e) {
      setSnack("Couldn't set price: " + (e?.message || e));
    }
  };

  // Trades + splits merged into one chronological corporate-action history.
  const blotter = useMemo(() => {
    const t = (trades || []).map((x) => ({
      kind: "trade",
      id: `t${x.id}`,
      rawId: x.id,
      date: x.tradeDate,
      securityId: x.securityId,
      side: x.side,
      quantity: x.quantity,
      price: x.price,
      fee: x.fee,
    }));
    const s = (splits || []).map((x) => ({
      kind: "split",
      id: `s${x.id}`,
      rawId: x.id,
      date: x.exDate,
      securityId: x.securityId,
      ratio: x.ratio,
    }));
    return [...t, ...s].sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) ||
        (a.kind === "split" ? 1 : 0) - (b.kind === "split" ? 1 : 0),
    );
  }, [trades, splits]);

  const tickerById = useMemo(() => {
    const m = {};
    (securities || []).forEach((s) => {
      m[s.id] = s.ticker;
    });
    return m;
  }, [securities]);

  const securityById = useMemo(() => {
    const m = {};
    (securities || []).forEach((s) => {
      m[s.id] = s;
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
  const options = summary?.options || [];
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
              <>
                <ResponsiveContainer
                  width="100%"
                  height={snapData.length === 1 ? 215 : 250}
                >
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
                      dot={{ r: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="liabilities"
                      name="Liabilities"
                      stroke="#ef5350"
                      fill="#ef5350"
                      fillOpacity={0.15}
                      dot={{ r: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      name="Net worth"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.25}
                      dot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {snapData.length === 1 && (
                  <Typography variant="caption" color="text.secondary">
                    Only one snapshot so far — snapshot on different days (or
                    wait for the monthly auto-capture) to see a trend line.
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No snapshots yet — hit “Snapshot now” to capture today; points
                accumulate over time.
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
              startIcon={<SyncIcon />}
              onClick={onRefreshPrices}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh prices"}
            </Button>
            <Button
              size="small"
              startIcon={<PriceChangeIcon />}
              onClick={() => {
                setPricePreset(null);
                setDialog("price");
              }}
            >
              Set price
            </Button>
            <Button
              size="small"
              startIcon={<CallSplitIcon />}
              onClick={() => setDialog("split")}
            >
              Add split
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
                      <MuiTooltip title="Edit security / price symbol">
                        <IconButton
                          size="small"
                          aria-label={`edit security ${h.ticker}`}
                          onClick={() =>
                            setEditSecurity(securityById[h.securityId])
                          }
                        >
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </MuiTooltip>
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
                      {editingPrice === h.securityId ? (
                        <TextField
                          size="small"
                          type="number"
                          autoFocus
                          value={priceDraft}
                          onChange={(e) => setPriceDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.target.blur();
                            } else if (e.key === "Escape") {
                              cancelInlineRef.current = true;
                              e.target.blur();
                            }
                          }}
                          onBlur={() => commitInlinePrice(h)}
                          inputProps={{
                            step: "0.01",
                            "aria-label": `set price ${h.ticker}`,
                          }}
                          sx={{ width: 110 }}
                        />
                      ) : (
                        <MuiTooltip
                          title={`Click to set/correct price${h.lastPriceDate ? ` (last: ${h.lastPriceDate})` : ""}`}
                        >
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`set price ${h.ticker}`}
                            onClick={() => startInlinePrice(h)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") startInlinePrice(h);
                            }}
                            style={{
                              cursor: "pointer",
                              color: h.priceIsEstimated ? "#999" : undefined,
                              borderBottom: "1px dotted #999",
                            }}
                          >
                            {h.priceIsEstimated
                              ? `${fmt2(h.avgCost, h.currency)} (avg)`
                              : fmt2(h.lastPrice, h.currency)}
                          </span>
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

      {/* Equity comp / Options */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6">Equity comp / Options</Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog("optionGrant")}
          >
            Add option grant
          </Button>
        </Box>
        {options.length ? (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Grant</TableCell>
                  <TableCell align="right">Strike</TableCell>
                  <TableCell align="right">Vested / total</TableCell>
                  <TableCell align="right">Underlying</TableCell>
                  <TableCell align="right">Vested value</TableCell>
                  <TableCell align="right">Unvested (memo)</TableCell>
                  <TableCell>Next vest</TableCell>
                  <TableCell align="right">Next vest amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {options.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <strong>{o.name}</strong>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {o.underlyingTicker} ·{" "}
                        {o.grantType === "RSU" ? "RSU" : "Option"}
                        {o.expired
                          ? " · expired"
                          : o.priceMissing
                            ? " · no price"
                            : ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {o.grantType === "RSU" ? "—" : fmt2(o.strike, o.currency)}
                    </TableCell>
                    <TableCell align="right">
                      {qtyFmt(o.vestedQuantity)} / {qtyFmt(o.quantity)}
                    </TableCell>
                    <TableCell align="right">
                      {o.underlyingPrice != null
                        ? fmt2(o.underlyingPrice, o.currency)
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      {fmt(o.vestedValueDisplay, currency)}
                    </TableCell>
                    <TableCell align="right" style={{ color: "#888" }}>
                      {fmt(o.unvestedValueDisplay, currency)}
                    </TableCell>
                    <TableCell>{o.nextVestDate || "fully vested"}</TableCell>
                    <TableCell align="right">
                      {o.nextVestDate
                        ? fmt(o.nextVestValueDisplay, currency)
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setEditOption(o)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => wealth.removeOptionGrant(o.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Valued at intrinsic value (max of 0 and price − strike). Only
              vested value counts toward net worth; unvested total{" "}
              {fmt(summary?.unvestedOptionsValue, currency)} is shown for
              reference only.
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No option grants yet — “Add option grant” to track vesting and
            intrinsic value automatically.
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

      {/* Trade blotter (trades + corporate actions) */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Trade blotter
        </Typography>
        {blotter.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Security</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Qty / ratio</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Fee</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {blotter.map((r) =>
                r.kind === "split" ? (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      {tickerById[r.securityId] || r.securityId}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label="SPLIT" color="info" />
                    </TableCell>
                    <TableCell align="right">{fmtRatio(r.ratio)}</TableCell>
                    <TableCell align="right">—</TableCell>
                    <TableCell align="right">—</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => wealth.removeSplit(r.rawId)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      {tickerById[r.securityId] || r.securityId}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.side}
                        color={r.side === "BUY" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">{Number(r.quantity)}</TableCell>
                    <TableCell align="right">{Number(r.price)}</TableCell>
                    <TableCell align="right">{Number(r.fee)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => wealth.removeTrade(r.rawId)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No trades recorded yet.
          </Typography>
        )}
      </Paper>

      <Typography variant="caption" color="text.secondary">
        Prices &amp; the USD→AUD rate auto-refresh daily (Yahoo); use “Refresh
        prices” to pull now, or the ✎ on a row to set/correct a price by hand
        (manual prices are never overwritten by the feed). Super balance entered
        here feeds the Super Forecast. Snapshots are captured monthly.
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
      <OptionGrantDialog
        open={dialog === "optionGrant" || !!editOption}
        securities={securities}
        grant={editOption}
        onClose={() => {
          setDialog(null);
          setEditOption(null);
        }}
        onSave={(id, payload) =>
          id
            ? wealth.updateOptionGrant(id, payload)
            : wealth.addOptionGrant(payload)
        }
      />
      <PriceDialog
        open={dialog === "price"}
        securities={securities}
        presetSecurityId={pricePreset}
        onClose={() => {
          setDialog(null);
          setPricePreset(null);
        }}
        onSave={(p) => wealth.setPrice(p)}
      />
      <SplitDialog
        open={dialog === "split"}
        securities={securities}
        onClose={() => setDialog(null)}
        onSave={(s) => wealth.addSplit(s)}
      />
      <FxDialog
        open={dialog === "fx"}
        currentRate={summary?.fxRateUsdAud}
        onClose={() => setDialog(null)}
        onSave={(r) => wealth.setFx(r)}
      />
      <SecurityDialog
        open={!!editSecurity}
        security={editSecurity}
        onClose={() => setEditSecurity(null)}
        onSave={(id, patch) => wealth.updateSecurity(id, patch)}
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
