import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Search as SearchIcon,
  ReceiptLong as ReceiptIcon,
} from "@mui/icons-material";
import RestClient from "../../rest/CategoryClient";
import { useTransactions } from "../../services/useTransactions";
import TransactionTable from "./TransactionTable";
import TransactionEditDialog from "./TransactionEditDialog";

const RANGE_PRESETS = [
  { key: "this-month", label: "This month" },
  { key: "3m", label: "Last 3m" },
  { key: "6m", label: "Last 6m" },
  { key: "12m", label: "Last 12m" },
  { key: "custom", label: "Custom" },
  { key: "all", label: "All" },
];

const pad = (n) => String(n).padStart(2, "0");
const toInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rangeBounds(preset, customFrom, customTo) {
  const now = new Date();
  if (preset === "all") return [0, Infinity];
  if (preset === "custom") {
    const from = customFrom ? new Date(customFrom + "T00:00:00").getTime() : 0;
    const to = customTo ? new Date(customTo + "T23:59:59").getTime() : Infinity;
    return [from, to];
  }
  const to = now.getTime();
  if (preset === "this-month") {
    return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to];
  }
  const months = { "3m": 3, "6m": 6, "12m": 12 }[preset] || 3;
  const from = new Date(
    now.getFullYear(),
    now.getMonth() - months,
    now.getDate(),
  ).getTime();
  return [from, to];
}

export default function TransactionsBrowser() {
  const { transactions, loading, update, remove, recategoriseMerchant } =
    useTransactions();
  const [categories, setCategories] = useState([]);

  const [preset, setPreset] = useState("3m");
  const [customFrom, setCustomFrom] = useState(
    toInput(new Date(new Date().getFullYear(), 0, 1)),
  );
  const [customTo, setCustomTo] = useState(toInput(new Date()));
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [essentialOnly, setEssentialOnly] = useState(false);
  const [groupBy, setGroupBy] = useState("none");
  const [sort, setSort] = useState("date-desc");

  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    RestClient.get("/finance/get-categories")
      .then((r) => setCategories(r.data || []))
      .catch((e) => console.error("Failed to load categories", e));
  }, []);

  const shown = useMemo(() => {
    const [from, to] = rangeBounds(preset, customFrom, customTo);
    const q = search.trim().toLowerCase();
    const min = minAmount !== "" ? Number(minAmount) : null;
    const max = maxAmount !== "" ? Number(maxAmount) : null;

    let r = transactions.filter((t) => {
      const ms = Number(t.transactionDateTime);
      if (Number.isFinite(ms) && (ms < from || ms > to)) return false;
      if (category !== "all" && t.category !== category) return false;
      if (type !== "all" && (t.transactionType || "EXPENSE") !== type)
        return false;
      if (essentialOnly && !t.essential) return false;
      const amt = Number(t.amount) || 0;
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      if (q) {
        const hay =
          `${t.businessName || ""} ${t.comment || ""} ${t.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    r = [...r].sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return (a.transactionDateTime || 0) - (b.transactionDateTime || 0);
        case "amount-desc":
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        case "amount-asc":
          return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        default:
          return (b.transactionDateTime || 0) - (a.transactionDateTime || 0);
      }
    });
    return r;
  }, [
    transactions,
    preset,
    customFrom,
    customTo,
    category,
    type,
    search,
    minAmount,
    maxAmount,
    essentialOnly,
    sort,
  ]);

  const catNames = useMemo(
    () => ["all", ...categories.map((c) => c.categoryName)],
    [categories],
  );

  const handleDelete = (t) =>
    remove(t.transactionId).catch((e) => console.error("Delete failed", e));

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="h5" fontWeight={600}>
          Transactions
        </Typography>
        <ReceiptIcon sx={{ color: "primary.main", opacity: 0.5 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review, slice and edit your submitted transactions.
      </Typography>

      {/* Range presets */}
      <ToggleButtonGroup
        size="small"
        exclusive
        value={preset}
        onChange={(_, v) => v && setPreset(v)}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        {RANGE_PRESETS.map((p) => (
          <ToggleButton key={p.key} value={p.key}>
            {p.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {preset === "custom" && (
            <>
              <TextField
                size="small"
                type="date"
                label="From"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
          <TextField
            size="small"
            placeholder="Search merchant / comment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ width: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              {catNames.map((c) => (
                <MenuItem key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="EXPENSE">Expense</MenuItem>
              <MenuItem value="INCOME">Income</MenuItem>
              <MenuItem value="NEUTRAL">Neutral</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="number"
            label="Min $"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            sx={{ width: 100 }}
          />
          <TextField
            size="small"
            type="number"
            label="Max $"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            sx={{ width: 100 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={essentialOnly}
                onChange={(e) => setEssentialOnly(e.target.checked)}
              />
            }
            label="Essential only"
          />
          <Box sx={{ flexGrow: 1 }} />
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Group by</InputLabel>
            <Select
              value={groupBy}
              label="Group by"
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <MenuItem value="none">No grouping</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="merchant">Merchant</MenuItem>
              <MenuItem value="category">Category</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sort}
              label="Sort"
              onChange={(e) => setSort(e.target.value)}
            >
              <MenuItem value="date-desc">Newest first</MenuItem>
              <MenuItem value="date-asc">Oldest first</MenuItem>
              <MenuItem value="amount-desc">Amount high→low</MenuItem>
              <MenuItem value="amount-asc">Amount low→high</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <TransactionTable
          transactions={shown}
          groupBy={groupBy}
          onEdit={setEditTarget}
          onDelete={handleDelete}
        />
      )}

      <TransactionEditDialog
        open={!!editTarget}
        transaction={editTarget}
        categories={categories}
        onClose={() => setEditTarget(null)}
        onSave={update}
        onRecategoriseMerchant={recategoriseMerchant}
      />
    </Box>
  );
}
