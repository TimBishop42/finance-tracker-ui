import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Switch,
  CircularProgress,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { getAllTransactions } from "../../services/useSubscriptions";
import { fmt2 } from "../../utils/format";

// Feature doc §2A.5 — link stored transactions to a subscription/bill. Ticked rows
// become the commitment's charges; the server marks those periods paid and re-derives
// amount + cadence + due day from them (fixes a mis-detected cadence like the Prime case).

const MAX_ROWS = 300;

const fmtDate = (t) => {
  if (t.transactionDateTime) {
    return new Date(t.transactionDateTime).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return t.transactionDate || "";
};

export default function LinkTransactionsDialog({ open, onClose, sub, onSave }) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set((sub?.linkedTransactionIds || []).map(Number)));
    setSearch("");
    setShowAll(false);
    setLoading(true);
    getAllTransactions()
      .then((data) => setAll(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Failed to load transactions", e))
      .finally(() => setLoading(false));
  }, [open, sub]);

  const subName = (sub?.name || "").toLowerCase();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nameMatches = (t) => {
      const b = (t.businessName || "").toLowerCase();
      if (!b || !subName) return false;
      return b.includes(subName) || subName.includes(b);
    };
    const filtered = all.filter((t) => {
      const isExpense = !t.transactionType || t.transactionType === "EXPENSE";
      const alreadyLinked = selected.has(Number(t.transactionId));
      if (!isExpense && !alreadyLinked) return false;
      // Default view: name-matching or already-linked; "show all" relaxes it.
      if (!showAll && !nameMatches(t) && !alreadyLinked) return false;
      if (q) {
        const hay = `${t.businessName || ""} ${t.amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    filtered.sort(
      (a, b) => (b.transactionDateTime || 0) - (a.transactionDateTime || 0),
    );
    return filtered;
  }, [all, search, showAll, subName, selected]);

  const toggle = (id) => {
    const n = Number(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      onClose();
    } catch (e) {
      console.error("Failed to link transactions", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Link transactions — {sub?.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Tick the transactions that are this{" "}
          {sub?.kind === "bill" ? "bill" : "subscription"}'s charges. Amount,
          cadence and due day are re-derived from them.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <TextField
            size="small"
            placeholder="Search merchant or amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
            }
            label="Show all"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {selected.size} selected
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: "auto", mt: 0.5 }}>
            {rows.length === 0 && (
              <Typography
                color="text.secondary"
                sx={{ py: 3, textAlign: "center" }}
              >
                No matching transactions. Try "Show all" or a search term.
              </Typography>
            )}
            {rows.slice(0, MAX_ROWS).map((t) => (
              <ListItem key={t.transactionId} disablePadding>
                <ListItemButton onClick={() => toggle(t.transactionId)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={selected.has(Number(t.transactionId))}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.businessName || "(no merchant)"}
                    secondary={fmtDate(t)}
                  />
                  <Typography variant="body2" fontWeight={500} sx={{ ml: 2 }}>
                    {fmt2(t.amount)}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
            {rows.length > MAX_ROWS && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2 }}
              >
                Showing first {MAX_ROWS} of {rows.length}. Refine your search.
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Save links
        </Button>
      </DialogActions>
    </Dialog>
  );
}
