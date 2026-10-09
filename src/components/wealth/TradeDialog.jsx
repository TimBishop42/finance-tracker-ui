import React, { useState } from "react";
import {
  Box,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { todayIso } from "../../utils/format";

const CURRENCIES = ["AUD", "USD"];
const OWNERS = [
  { value: "CHLOE", label: "Chloe" },
  { value: "MILLIE", label: "Millie" },
];

// Add trade dialog — pick or create a security. Shared by the main Total Wealth
// page (household trades, no owner) and the Kids' Portfolios page (owner required).
export default function TradeDialog({
  open,
  onClose,
  securities,
  onAddSecurity,
  onSaveTrade,
  showOwnerPicker = false, // true only when opened from the Kids page
  initialOwner = null, // "CHLOE" | "MILLIE"
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
  const [owner, setOwner] = useState(initialOwner || OWNERS[0].value);
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
      setOwner(initialOwner || OWNERS[0].value);
    }
  }, [open, securities, initialOwner]);

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
        ...(showOwnerPicker ? { owner } : {}),
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
        {showOwnerPicker && (
          <TextField
            select
            label="For"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            fullWidth
            margin="dense"
          >
            {OWNERS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        )}

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
