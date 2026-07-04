import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Collapse,
  Button,
  LinearProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Loop as LoopIcon,
  BlockOutlined as BlockIcon,
  RestoreFromTrash as RestoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useRecurring } from "../../services/useRecurring";

const CAT_COLORS = {
  Bills: "#ef5350",
  Groceries: "#66bb6a",
  Coffee: "#ff7043",
  "Eating Out": "#ffa726",
  Transport: "#42a5f5",
  Fuel: "#78909c",
  Miscellaneous: "#ab47bc",
  Alcohol: "#ec407a",
  House: "#26a69a",
};

const fmtMoney = (n) =>
  "$" +
  (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (iso) =>
  iso
    ? new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const confidenceColor = (c) =>
  c >= 0.75 ? "success" : c >= 0.5 ? "warning" : "error";

function ConfidenceCell({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = confidenceColor(value);
  return (
    <Box sx={{ minWidth: 90 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 3, mb: 0.25 }}
      />
      <Typography variant="caption" color={`${color}.main`} fontWeight={600}>
        {pct}%
      </Typography>
    </Box>
  );
}

function MerchantRow({ r, onDismiss }) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {r.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {r.occurrences} charges
          {r.knowledgeSource && r.knowledgeSource !== "statistical"
            ? ` · ${r.knowledgeSource === "custom" ? "your rule" : "known"}`
            : ""}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={r.category || "Unknown"}
          size="small"
          sx={{
            backgroundColor: CAT_COLORS[r.category] || "#9e9e9e",
            color: "#fff",
            fontSize: 11,
          }}
        />
      </TableCell>
      <TableCell>
        <Chip label={cap(r.cadence)} size="small" variant="outlined" />
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight={500}>
          {fmtMoney(r.expectedAmount)}
        </Typography>
        {r.amountVariable && (
          <Typography variant="caption" color="warning.main">
            variable
          </Typography>
        )}
      </TableCell>
      <TableCell>{fmtDate(r.nextPredictedDate)}</TableCell>
      <TableCell align="center">
        <ConfidenceCell value={r.confidence} />
      </TableCell>
      <TableCell align="center">
        {r.subscription ? (
          <Chip
            label="Subscription"
            size="small"
            color="primary"
            variant="outlined"
          />
        ) : r.bill ? (
          <Chip label="Bill" size="small" color="error" variant="outlined" />
        ) : (
          <Chip label="Recurring" size="small" variant="outlined" />
        )}
      </TableCell>
      <TableCell align="center">
        <Tooltip
          arrow
          title="Dismiss — remove from this list and bill calendar"
        >
          <IconButton
            size="small"
            onClick={() => onDismiss(r.key)}
            sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
          >
            <BlockIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export default function RecurringTransactions() {
  const { candidates, engine, loading, error, dismiss, restore } =
    useRecurring();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("confidence");
  const [filter, setFilter] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);

  const active = useMemo(
    () => candidates.filter((c) => !c.dismissed),
    [candidates],
  );
  const dismissed = useMemo(
    () => candidates.filter((c) => c.dismissed),
    [candidates],
  );

  const displayed = useMemo(() => {
    let r =
      filter === "subscriptions"
        ? active.filter((x) => x.subscription)
        : active;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.category?.toLowerCase().includes(q),
      );
    }
    return [...r].sort((a, b) => {
      if (sortBy === "monthly")
        return (b.monthlyEquivalent || 0) - (a.monthlyEquivalent || 0);
      if (sortBy === "next")
        return (a.nextPredictedDate || "").localeCompare(
          b.nextPredictedDate || "",
        );
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }, [active, search, sortBy, filter]);

  if (loading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <Typography color="error">
          Failed to load recurring detections.
        </Typography>
      </Box>
    );

  const monthlyRecurring = active.reduce(
    (s, r) => s + (Number(r.monthlyEquivalent) || 0),
    0,
  );
  const subCount = active.filter((r) => r.subscription).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h5" fontWeight={600}>
          Recurring &amp; Subscriptions
        </Typography>
        <LoopIcon sx={{ fontSize: 36, color: "primary.main", opacity: 0.5 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Detected server-side from your full history
        {engine ? ` · ${engine} engine` : ""} · {subCount} likely subscriptions
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        {[
          {
            label: "Monthly Recurring",
            value: `$${monthlyRecurring.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          },
          { label: "Recurring Merchants", value: active.length },
          { label: "Likely Subscriptions", value: subCount },
        ].map(({ label, value }) => (
          <Card key={label} variant="outlined" sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6">{value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Search merchants or categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
        >
          <ToggleButton value="all">All recurring</ToggleButton>
          <ToggleButton value="subscriptions">Subscriptions only</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sortBy}
          onChange={(_, v) => v && setSortBy(v)}
        >
          <ToggleButton value="confidence">Confidence</ToggleButton>
          <ToggleButton value="monthly">Monthly cost</ToggleButton>
          <ToggleButton value="next">Next charge</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Merchant</strong>
              </TableCell>
              <TableCell>
                <strong>Category</strong>
              </TableCell>
              <TableCell>
                <strong>Cadence</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Expected</strong>
              </TableCell>
              <TableCell>
                <strong>Next charge</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Confidence</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Type</strong>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {displayed.map((r) => (
              <MerchantRow key={r.key} r={r} onDismiss={dismiss} />
            ))}
            {displayed.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No results.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {dismissed.length > 0 && (
        <Box mt={3}>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => setShowDismissed((v) => !v)}
            startIcon={showDismissed ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ color: "text.secondary", mb: 1 }}
          >
            {dismissed.length} dismissed merchant
            {dismissed.length !== 1 ? "s" : ""}
          </Button>
          <Collapse in={showDismissed}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Merchant</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Category</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Expected</strong>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dismissed.map((r) => (
                    <TableRow key={r.key} sx={{ opacity: 0.6 }}>
                      <TableCell>
                        <Typography variant="body2">{r.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.category || "Unknown"}
                          size="small"
                          sx={{
                            backgroundColor:
                              CAT_COLORS[r.category] || "#9e9e9e",
                            color: "#fff",
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {fmtMoney(r.expectedAmount)}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip arrow title="Restore to active list">
                          <IconButton
                            size="small"
                            onClick={() => restore(r.key)}
                            sx={{
                              color: "text.disabled",
                              "&:hover": { color: "success.main" },
                            }}
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
