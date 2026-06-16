import React, { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import {
  Search as SearchIcon,
  Loop as LoopIcon,
  BlockOutlined as BlockIcon,
  RestoreFromTrash as RestoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import RestClient from "../../rest/CategoryClient";
import { detectRecurring } from "../../services/recurringDetection";
import { useExcludedMerchants } from "../../services/useExcludedMerchants";
import { useCustomMerchants } from "../../services/useCustomMerchants";

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

function MerchantRow({ r, onDismiss }) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {r.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {r.count} transactions
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
      <TableCell align="right">${r.avg.toFixed(2)}</TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight={500}>
          $
          {r.total.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Tooltip arrow title={`${r.distinctMonths} of ${r.monthsRange} months`}>
          <Typography variant="body2">{r.distinctMonths}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell>
        {r.lastDate
          ? r.lastDate.toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—"}
      </TableCell>
      <TableCell align="center">
        {r.isSubscription ? (
          <Chip
            label="Subscription"
            size="small"
            color="primary"
            variant="outlined"
          />
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
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("total");
  const [filter, setFilter] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);

  const { excluded, exclude, restore } = useExcludedMerchants();
  const { customMerchants } = useCustomMerchants();

  useEffect(() => {
    RestClient.get("/finance/find-all-transactions?recentMonth=false")
      .then((r) => {
        setTxns(r.data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(e);
        setLoading(false);
      });
  }, []);

  const recurring = useMemo(
    () => detectRecurring(txns, customMerchants),
    [txns, customMerchants],
  );

  const active = useMemo(
    () => recurring.filter((r) => !excluded.has(r.key)),
    [recurring, excluded],
  );

  const dismissed = useMemo(
    () => recurring.filter((r) => excluded.has(r.key)),
    [recurring, excluded],
  );

  const displayed = useMemo(() => {
    let r =
      filter === "subscriptions"
        ? active.filter((x) => x.isSubscription)
        : active;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.category?.toLowerCase().includes(q),
      );
    }
    return [...r].sort((a, b) =>
      sortBy === "frequency"
        ? b.distinctMonths - a.distinctMonths
        : sortBy === "avg"
          ? b.avg - a.avg
          : b.total - a.total,
    );
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
        <Typography color="error">Failed to load transactions.</Typography>
      </Box>
    );

  const totalRecurring = active.reduce((s, r) => s + r.total, 0);
  const subCount = active.filter((r) => r.isSubscription).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h5" fontWeight={600}>
          Recurring Transactions
        </Typography>
        <LoopIcon sx={{ fontSize: 36, color: "primary.main", opacity: 0.5 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Merchants with a regular payment cadence (monthly, quarterly, annual) ·{" "}
        {subCount} likely subscriptions
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        {[
          {
            label: "Total Recurring Spend",
            value: `$${totalRecurring.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
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
          <ToggleButton value="total">Total</ToggleButton>
          <ToggleButton value="frequency">Frequency</ToggleButton>
          <ToggleButton value="avg">Avg amount</ToggleButton>
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
              <TableCell align="right">
                <strong>Avg</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Total paid</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Months active</strong>
              </TableCell>
              <TableCell>
                <strong>Last seen</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Type</strong>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {displayed.map((r) => (
              <MerchantRow key={r.key} r={r} onDismiss={exclude} />
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
                      <strong>Avg</strong>
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
                      <TableCell align="right">${r.avg.toFixed(2)}</TableCell>
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
