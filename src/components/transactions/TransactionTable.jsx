import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Box,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { fmt2 } from "../../utils/format";

// Shared, read+edit transaction table. Consumers pass an already-filtered/sorted
// list; this handles rendering, optional group-by with subtotals, and row actions.
// Used by the Transactions browser and the Details Summary drill-down.

const TYPE_COLORS = {
  EXPENSE: "default",
  INCOME: "success",
  NEUTRAL: "warning",
};

const fmtDate = (t) => {
  const ms = Number(t.transactionDateTime);
  if (Number.isFinite(ms) && ms > 0) {
    return new Date(ms).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return t.transactionDate || "—";
};

const dayKey = (t) => {
  const ms = Number(t.transactionDateTime);
  if (!Number.isFinite(ms) || ms <= 0) return t.transactionDate || "—";
  const d = new Date(ms);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const COLSPAN = 7;

function Row({ t, onEdit, onDelete }) {
  return (
    <TableRow hover>
      <TableCell>{fmtDate(t)}</TableCell>
      <TableCell>{t.businessName || "—"}</TableCell>
      <TableCell>{t.category}</TableCell>
      <TableCell>
        <Chip
          label={(t.transactionType || "EXPENSE").toLowerCase()}
          size="small"
          color={TYPE_COLORS[t.transactionType] || "default"}
          variant="outlined"
        />
      </TableCell>
      <TableCell align="right">{fmt2(t.amount)}</TableCell>
      <TableCell>{t.comment}</TableCell>
      <TableCell align="center">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(t)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={() => onDelete(t)}
            sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  groupBy = "none",
}) {
  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const keyOf = (t) =>
      groupBy === "day"
        ? dayKey(t)
        : groupBy === "merchant"
          ? t.businessName || "(no merchant)"
          : t.category || "Uncategorised";
    const map = new Map();
    transactions.forEach((t) => {
      const k = keyOf(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    });
    const arr = [...map.entries()].map(([key, items]) => ({
      key,
      items,
      subtotal: items.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    }));
    // Day groups newest-first; merchant/category by subtotal desc.
    if (groupBy === "day") {
      arr.sort(
        (a, b) =>
          (b.items[0].transactionDateTime || 0) -
          (a.items[0].transactionDateTime || 0),
      );
    } else {
      arr.sort((a, b) => b.subtotal - a.subtotal);
    }
    return arr;
  }, [transactions, groupBy]);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Date</strong>
            </TableCell>
            <TableCell>
              <strong>Merchant</strong>
            </TableCell>
            <TableCell>
              <strong>Category</strong>
            </TableCell>
            <TableCell>
              <strong>Type</strong>
            </TableCell>
            <TableCell align="right">
              <strong>Amount</strong>
            </TableCell>
            <TableCell>
              <strong>Comment</strong>
            </TableCell>
            <TableCell align="center">
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLSPAN} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  No transactions match.
                </Typography>
              </TableCell>
            </TableRow>
          )}

          {groups
            ? groups.map((g) => (
                <React.Fragment key={g.key}>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" fontWeight={700}>
                        {g.key}{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          ({g.items.length})
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmt2(g.subtotal)}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                  {g.items.map((t) => (
                    <Row
                      key={t.transactionId}
                      t={t}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </React.Fragment>
              ))
            : transactions.map((t) => (
                <Row
                  key={t.transactionId}
                  t={t}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
        </TableBody>
      </Table>
      {transactions.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {transactions.length} transactions ·{" "}
            <strong>
              {fmt2(
                transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
              )}
            </strong>
          </Typography>
        </Box>
      )}
    </TableContainer>
  );
}
