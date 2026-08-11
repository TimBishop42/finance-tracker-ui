import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
} from "@mui/material";

// Shared edit dialog for a submitted transaction (review UI). Edits date, amount,
// category, type, merchant, comment, essential. Optionally applies the chosen
// category to every transaction from the same merchant (bulk recategorise).

const TYPES = ["EXPENSE", "INCOME", "NEUTRAL"];

const pad = (n) => String(n).padStart(2, "0");

function toDateInput(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  const d = new Date(n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromForm(tx) {
  return {
    date: toDateInput(tx.transactionDateTime),
    amount: tx.amount != null ? String(tx.amount) : "",
    category: tx.category || "",
    transactionType: tx.transactionType || "EXPENSE",
    businessName: tx.businessName || "",
    comment: tx.comment || "",
    essential: !!tx.essential,
  };
}

export default function TransactionEditDialog({
  open,
  transaction,
  categories = [],
  onClose,
  onSave,
  onRecategoriseMerchant,
}) {
  const [form, setForm] = useState(() =>
    transaction ? fromForm(transaction) : null,
  );
  const [applyMerchant, setApplyMerchant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open && transaction) {
      setForm(fromForm(transaction));
      setApplyMerchant(false);
      setErr(null);
    }
  }, [open, transaction]);

  if (!form) return null;

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  const categoryChanged = form.category !== (transaction.category || "");
  const hasMerchant = !!(
    transaction.businessName && transaction.businessName.trim()
  );

  const handleSave = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave({
        transactionId: transaction.transactionId,
        category: form.category,
        amount: form.amount,
        transactionDate: form.date
          ? new Date(form.date + "T12:00:00").getTime()
          : undefined,
        comment: form.comment,
        businessName: form.businessName,
        essential: form.essential,
        transactionType: form.transactionType,
      });
      if (applyMerchant && categoryChanged && hasMerchant) {
        await onRecategoriseMerchant(transaction.businessName, form.category);
      }
      onClose();
    } catch (e) {
      console.error("Failed to save transaction", e);
      setErr("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit transaction</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mt: 1,
          }}
        >
          <TextField
            label="Merchant"
            value={form.businessName}
            onChange={set("businessName")}
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={set("date")}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Amount"
            type="number"
            value={form.amount}
            onChange={set("amount")}
            InputProps={{
              startAdornment: <span style={{ marginRight: 4 }}>$</span>,
            }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={form.category}
              label="Category"
              onChange={set("category")}
            >
              {categories.map((c) => (
                <MenuItem key={c.categoryName} value={c.categoryName}>
                  {c.categoryName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={form.transactionType}
              label="Type"
              onChange={set("transactionType")}
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Comment"
            value={form.comment}
            onChange={set("comment")}
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.essential}
                onChange={(e) =>
                  setForm((p) => ({ ...p, essential: e.target.checked }))
                }
              />
            }
            label="Essential"
          />
        </Box>

        {categoryChanged && hasMerchant && (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={applyMerchant}
                onChange={(e) => setApplyMerchant(e.target.checked)}
              />
            }
            label={`Apply "${form.category}" to all transactions from ${transaction.businessName}`}
          />
        )}
        {err && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {err}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.amount || !form.category}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
