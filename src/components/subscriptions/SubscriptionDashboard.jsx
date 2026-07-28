import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  WarningAmber as WarningIcon,
  Search as SearchIcon,
  BookmarkAdd as TrackIcon,
} from "@mui/icons-material";
import RestClient from "../../rest/CategoryClient";
import {
  useSubscriptions,
  getSubscriptionBudget,
  setSubscriptionBudget,
} from "../../services/useSubscriptions";
import { useRecurring } from "../../services/useRecurring";
import SubscriptionDialog from "./SubscriptionDialog";
import LinkTransactionsDialog from "./LinkTransactionsDialog";
import BrandLogo from "./BrandLogo";

const fmt = (n) =>
  "$" +
  (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmt0 = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

const CYCLE_SHORT = {
  daily: "day",
  weekly: "wk",
  fortnightly: "fortnight",
  monthly: "mo",
  quarterly: "qtr",
  semiannual: "6mo",
  annual: "yr",
  lifetime: "once",
};

const STATUS_COLORS = {
  active: "success",
  trial: "info",
  price_changed: "warning",
  at_risk: "warning",
  paused: "default",
  cancelled: "default",
};

const isActive = (s) => s.status !== "cancelled" && s.status !== "paused";

function TotalsStrip({ monthly, yearly, activeCount, budget, remaining }) {
  const cards = [
    { label: "Monthly", value: fmt(monthly) },
    { label: "Yearly", value: fmt0(yearly) },
    {
      label: "Budget remaining",
      value: budget > 0 ? fmt(remaining) : "—",
      color: budget > 0 && remaining < 0 ? "error.main" : "success.main",
    },
    { label: "Active subs", value: activeCount },
  ];
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c) => (
        <Grid item xs={6} md={3} key={c.label}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                {c.label}
              </Typography>
              <Typography variant="h5" fontWeight={700} color={c.color}>
                {c.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function SubCard({ sub, onEdit, onDelete, onLink }) {
  const cycle = CYCLE_SHORT[sub.billingCycle] || sub.billingCycle || "mo";
  const showMonthlyEq =
    sub.billingCycle &&
    sub.billingCycle !== "monthly" &&
    sub.billingCycle !== "lifetime";
  return (
    <Card
      variant="outlined"
      sx={{ height: "100%", opacity: isActive(sub) ? 1 : 0.6 }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <BrandLogo sub={sub} size={44} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              noWrap
              title={sub.name}
            >
              {sub.name}
            </Typography>
            {sub.category && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {sub.category}
              </Typography>
            )}
          </Box>
          {sub.cancelCandidate && (
            <Tooltip
              arrow
              title={
                (sub.cancelReasons || []).join(" · ") || "Cancel candidate"
              }
            >
              <WarningIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Box>

        <Typography variant="h5" fontWeight={700}>
          {fmt(sub.expectedAmount)}
          <Typography component="span" variant="body2" color="text.secondary">
            {" "}
            / {cycle}
          </Typography>
        </Typography>
        {showMonthlyEq && (
          <Typography variant="caption" color="text.secondary">
            ≈ {fmt(sub.monthlyEquivalent)}/mo
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 1.5,
          }}
        >
          <Chip
            label={(sub.status || "active").replace("_", " ")}
            size="small"
            color={STATUS_COLORS[sub.status] || "default"}
            variant={sub.status === "active" ? "filled" : "outlined"}
          />
          <Box>
            <Tooltip title="Link transactions">
              <IconButton size="small" onClick={() => onLink(sub)}>
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {sub.url && (
              <Tooltip title="Open">
                <IconButton
                  size="small"
                  component="a"
                  href={sub.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(sub)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete(sub)}
                sx={{
                  color: "text.disabled",
                  "&:hover": { color: "error.main" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionDashboard() {
  const { subscriptions, loading, add, update, remove, confirm, setLinks } =
    useSubscriptions();
  const { candidates } = useRecurring();

  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active"); // active | all | cancel

  useEffect(() => {
    getSubscriptionBudget()
      .then((b) => {
        setBudget(Number(b) || 0);
        setBudgetInput(b && Number(b) > 0 ? String(b) : "");
      })
      .catch(() => {});
    RestClient.get("/finance/get-categories")
      .then((r) => setCategories(r.data || []))
      .catch((e) => console.error("Failed to load categories", e));
  }, []);

  const subs = useMemo(
    () => subscriptions.filter((s) => s.kind === "subscription"),
    [subscriptions],
  );

  const activeSubs = useMemo(() => subs.filter(isActive), [subs]);
  const monthlyTotal = useMemo(
    () =>
      activeSubs.reduce(
        (sum, s) => sum + (Number(s.monthlyEquivalent) || 0),
        0,
      ),
    [activeSubs],
  );
  const remaining = budget - monthlyTotal;

  const detectedInbox = useMemo(
    () =>
      candidates.filter((c) => c.subscription && !c.dismissed && !c.confirmed),
    [candidates],
  );

  const upcoming = useMemo(() => {
    const today = new Date();
    const horizon = new Date();
    horizon.setDate(today.getDate() + 30);
    return activeSubs
      .filter((s) => s.nextPredictedDate)
      .map((s) => ({ s, d: new Date(s.nextPredictedDate + "T00:00:00") }))
      .filter(({ d }) => d >= new Date(today.toDateString()) && d <= horizon)
      .sort((a, b) => a.d - b.d)
      .map(({ s }) => s);
  }, [activeSubs]);

  const shown = useMemo(() => {
    let r = subs;
    if (filter === "active") r = r.filter(isActive);
    else if (filter === "cancel") r = r.filter((s) => s.cancelCandidate);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q),
      );
    }
    return [...r].sort(
      (a, b) =>
        (Number(b.monthlyEquivalent) || 0) - (Number(a.monthlyEquivalent) || 0),
    );
  }, [subs, filter, search]);

  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (sub) => {
    setEditTarget(sub);
    setDialogOpen(true);
  };
  const handleSave = (body) =>
    editTarget && editTarget.subscriptionId
      ? update(editTarget.subscriptionId, body)
      : add(body);
  const handleDelete = (sub) => {
    if (!sub.subscriptionId) return;
    remove(sub.subscriptionId).catch((e) => console.error("Delete failed", e));
  };
  const handleTrack = (candidate) =>
    confirm(candidate)
      .then((created) => {
        // Track & edit: open the new sub so cadence/amount can be corrected immediately.
        if (created) {
          setEditTarget(created);
          setDialogOpen(true);
        }
      })
      .catch((e) => console.error("Track failed", e));
  const saveBudget = () => {
    const v = Number(budgetInput) || 0;
    setSubscriptionBudget(v)
      .then(() => setBudget(v))
      .catch((e) => console.error("Set budget failed", e));
  };
  const handleSaveLinks = (transactionIds) =>
    setLinks(linkTarget.subscriptionId, transactionIds);

  if (loading && subscriptions.length === 0) {
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
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h5" fontWeight={600}>
          Subscriptions
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openAdd}
        >
          Add Subscription
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Your recurring subscriptions — what you pay for, at a glance. Bills live
        in the Bills tab.
      </Typography>

      <TotalsStrip
        monthly={monthlyTotal}
        yearly={monthlyTotal * 12}
        activeCount={activeSubs.length}
        budget={budget}
        remaining={remaining}
      />

      {/* Controls */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
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
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="cancel">Cancel candidates</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          size="small"
          type="number"
          label="Monthly budget"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          InputProps={{
            startAdornment: <span style={{ marginRight: 4 }}>$</span>,
          }}
          sx={{ width: 150 }}
        />
        <Button variant="outlined" size="small" onClick={saveBudget}>
          Save budget
        </Button>
      </Box>

      {/* Detected inbox */}
      {detectedInbox.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" gutterBottom>
            Detected subscriptions — track to manage them (
            {detectedInbox.length})
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {detectedInbox.map((c) => (
              <Chip
                key={c.key}
                icon={<TrackIcon />}
                label={`${c.name} · ${fmt(c.expectedAmount)}${c.suggestion ? " · suggested" : ""}`}
                onClick={() => handleTrack(c)}
                variant="outlined"
                color={c.suggestion ? "default" : "primary"}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Card grid */}
      {shown.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No subscriptions yet. Add one, or track a detected subscription
            above.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {shown.map((sub) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={sub.subscriptionId}>
              <SubCard
                sub={sub}
                onEdit={openEdit}
                onDelete={handleDelete}
                onLink={setLinkTarget}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upcoming renewals — single widget */}
      <Typography variant="h6" fontWeight={600} mt={4} mb={1.5}>
        Upcoming renewals (next 30 days)
      </Typography>
      <Paper elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Subscription</strong>
              </TableCell>
              <TableCell>
                <strong>Next charge</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Amount</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {upcoming.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Nothing due in the next 30 days.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              upcoming.map((s) => (
                <TableRow key={s.subscriptionId} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <BrandLogo sub={s} size={22} />
                      {s.name}
                    </Box>
                  </TableCell>
                  <TableCell>{s.nextPredictedDate}</TableCell>
                  <TableCell align="right">{fmt(s.expectedAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <SubscriptionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        defaultKind="subscription"
        categories={categories}
      />
      <LinkTransactionsDialog
        open={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        sub={linkTarget}
        onSave={handleSaveLinks}
      />
    </Box>
  );
}
