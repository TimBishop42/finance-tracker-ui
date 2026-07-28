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

// Feature doc §2A.2 — the shared add/edit form for a unified subscription/bill,
// used by both the Bill Calendar (defaultKind="bill") and the Subscription
// dashboard (defaultKind="subscription").

export const BILLING_CYCLES = [
  "daily",
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "lifetime",
];

export const STATUSES = [
  "active",
  "trial",
  "paused",
  "cancelled",
  "price_changed",
  "at_risk",
];

const KINDS = ["bill", "subscription", "other"];

const todayIso = () => new Date().toISOString().split("T")[0];

function blankForm(defaultKind) {
  return {
    name: "",
    category: "",
    amount: "",
    billingCycle: "monthly",
    dueDate: todayIso(),
    kind: defaultKind || "bill",
    status: "active",
    amountVariable: false,
    paymentMethod: "",
    payer: "",
    url: "",
    logo: "",
    trialEndDate: "",
    notes: "",
  };
}

// Map a loaded subscription (RecurringCandidate shape) back into form state.
function fromSubscription(s) {
  const due =
    s.predictedDay != null
      ? (() => {
          const d = new Date();
          const day = Math.min(
            s.predictedDay,
            new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
          );
          return new Date(d.getFullYear(), d.getMonth(), day)
            .toISOString()
            .split("T")[0];
        })()
      : todayIso();
  return {
    name: s.name || "",
    category: s.category || "",
    amount: s.expectedAmount != null ? String(s.expectedAmount) : "",
    billingCycle: s.billingCycle || s.cadence || "monthly",
    dueDate: due,
    kind: s.kind || "bill",
    status: s.status || "active",
    amountVariable: !!s.amountVariable,
    paymentMethod: s.paymentMethod || "",
    payer: s.payer || "",
    url: s.url || "",
    logo: s.logo || "",
    trialEndDate: s.trialEndDate || "",
    notes: s.notes || "",
  };
}

export default function SubscriptionDialog({
  open,
  onClose,
  onSave,
  initial,
  defaultKind = "bill",
  categories = [],
}) {
  const [form, setForm] = useState(blankForm(defaultKind));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(initial ? fromSubscription(initial) : blankForm(defaultKind));
      setErr(null);
    }
  }, [open, initial, defaultKind]);

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  const setChecked = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.checked }));

  const editing = !!initial;
  const showsDueDate = form.billingCycle !== "lifetime";

  const handleSave = async () => {
    if (!form.name || !form.amount) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave({
        name: form.name,
        category: form.category || null,
        amount: form.amount,
        billingCycle: form.billingCycle,
        dueDate: showsDueDate ? form.dueDate : null,
        kind: form.kind,
        status: form.status,
        amountVariable: form.amountVariable,
        paymentMethod: form.paymentMethod || null,
        payer: form.payer || null,
        url: form.url || null,
        logo: form.logo || null,
        trialEndDate: form.trialEndDate || null,
        notes: form.notes || null,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save subscription", e);
      setErr("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editing ? "Edit" : "Add"}{" "}
        {form.kind === "bill" ? "Bill" : "Subscription"}
      </DialogTitle>
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
            label="Name"
            value={form.name}
            onChange={set("name")}
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={form.category}
              label="Category"
              onChange={set("category")}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.categoryName} value={c.categoryName}>
                  {c.categoryName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
            <InputLabel>Billing cycle</InputLabel>
            <Select
              value={form.billingCycle}
              label="Billing cycle"
              onChange={set("billingCycle")}
            >
              {BILLING_CYCLES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {showsDueDate && (
            <TextField
              label="Due / next date"
              type="date"
              value={form.dueDate}
              onChange={set("dueDate")}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          )}
          <FormControl fullWidth>
            <InputLabel>Kind</InputLabel>
            <Select value={form.kind} label="Kind" onChange={set("kind")}>
              {KINDS.map((k) => (
                <MenuItem key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {editing && (
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status}
                label="Status"
                onChange={set("status")}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Payment method"
            value={form.paymentMethod}
            onChange={set("paymentMethod")}
            placeholder="e.g. Amex, CBA debit"
            fullWidth
          />
          <TextField
            label="Payer"
            value={form.payer}
            onChange={set("payer")}
            placeholder="who pays it"
            fullWidth
          />
          <TextField
            label="URL / manage link"
            value={form.url}
            onChange={set("url")}
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField
            label="Logo URL (optional)"
            value={form.logo}
            onChange={set("logo")}
            fullWidth
            helperText="Leave blank to auto-detect from the URL / name"
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField
            label="Free-trial end date"
            type="date"
            value={form.trialEndDate}
            onChange={set("trialEndDate")}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.amountVariable}
                  onChange={setChecked("amountVariable")}
                />
              }
              label="Variable amount"
            />
          </Box>
          <TextField
            label="Notes"
            value={form.notes}
            onChange={set("notes")}
            fullWidth
            multiline
            sx={{ gridColumn: "1 / -1" }}
          />
        </Box>
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
          disabled={saving || !form.name || !form.amount}
        >
          {editing ? "Save" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
