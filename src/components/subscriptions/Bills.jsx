import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  Button,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarTodayIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  BookmarkAdd as TrackIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { useRecurring } from "../../services/useRecurring";
import { useSubscriptions } from "../../services/useSubscriptions";
import SubscriptionDialog from "./SubscriptionDialog";
import LinkTransactionsDialog from "./LinkTransactionsDialog";
import BrandLogo from "./BrandLogo";
import RestClient from "../../rest/CategoryClient";
import { fmt2 } from "../../utils/format";

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

const STATUS_COLORS = {
  Paid: { bg: "#2e7d32", text: "#fff" },
  Upcoming: { bg: "#1565c0", text: "#fff" },
  Overdue: { bg: "#b71c1c", text: "#fff" },
};

function abbrev(name, maxLen = 10) {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GRACE_DAYS_BEFORE = 5;
const GRACE_DAYS_AFTER = 3;
function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  let day = 1 - startDow;
  for (let week = 0; week < 6; week++) {
    const row = [];
    for (let dow = 0; dow < 7; dow++) {
      row.push(day >= 1 && day <= daysInMonth ? day : null);
      day++;
    }
    cells.push(row);
    if (day > daysInMonth) break;
  }
  return cells;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function billDayOfMonth(bill) {
  if (bill.predictedDay != null) return bill.predictedDay;
  if (bill.nextPredictedDate) {
    return new Date(bill.nextPredictedDate + "T00:00:00").getDate();
  }
  return 1;
}

export default function Bills() {
  const { candidates, loading, error } = useRecurring();
  const { subscriptions, add, update, remove, confirm, setPaid, setLinks } =
    useSubscriptions();

  // Stable "now" for the render cycle so it doesn't churn the memos below.
  const today = useMemo(() => new Date(), []);
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  const [categories, setCategories] = useState([]);
  useEffect(() => {
    RestClient.get("/finance/get-categories")
      .then((r) => setCategories(r.data || []))
      .catch((e) => console.error("Failed to load categories", e));
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);

  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (bill) => {
    setEditTarget(bill);
    setDialogOpen(true);
  };
  const handleSave = (body) =>
    editTarget && editTarget.subscriptionId
      ? update(editTarget.subscriptionId, body)
      : add(body);
  const handleDelete = (bill) => {
    if (!bill.subscriptionId) return;
    remove(bill.subscriptionId).catch((e) => console.error("Delete failed", e));
  };
  const handleTrack = (bill) =>
    confirm(bill)
      .then((created) => {
        if (created) {
          setEditTarget(created);
          setDialogOpen(true);
        }
      })
      .catch((e) => console.error("Track failed", e));
  const handleTogglePaid = (bill) => {
    if (!bill.subscriptionId) return;
    const day = billDayOfMonth(bill);
    const iso = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setPaid(bill.subscriptionId, iso, bill.status !== "Paid").catch((e) =>
      console.error("Toggle paid failed", e),
    );
  };
  const handleSaveLinks = (transactionIds) =>
    setLinks(linkTarget.subscriptionId, transactionIds);

  // Persisted bills (manual + confirmed detections) + detected-but-not-tracked bills, deduped by key.
  const monthlyBills = useMemo(() => {
    const persisted = subscriptions.filter(
      (s) => s.kind === "bill" && s.status !== "cancelled",
    );
    const persistedKeys = new Set(persisted.map((s) => s.key));
    const detected = candidates.filter(
      (c) => c.bill && !c.dismissed && !persistedKeys.has(c.key),
    );
    return [...persisted, ...detected];
  }, [subscriptions, candidates]);

  const billsWithStatus = useMemo(() => {
    const isCurrentMonth =
      displayYear === today.getFullYear() && displayMonth === today.getMonth();
    return monthlyBills
      .map((bill) => {
        const day = billDayOfMonth(bill);
        const dueDate = new Date(displayYear, displayMonth, day);
        const paidThisMonth = (bill.chargeDates || []).some((iso) => {
          const d = new Date(iso + "T00:00:00");
          const sameCalendarMonth =
            d.getFullYear() === displayYear && d.getMonth() === displayMonth;
          if (sameCalendarMonth) return true;
          const diff = daysBetween(d, dueDate);
          return diff <= GRACE_DAYS_BEFORE && diff >= -GRACE_DAYS_AFTER;
        });
        let status;
        if (paidThisMonth) status = "Paid";
        else if (isCurrentMonth && day < today.getDate()) status = "Overdue";
        else status = "Upcoming";
        return { ...bill, day, status };
      })
      .sort((a, b) => a.day - b.day);
  }, [monthlyBills, displayYear, displayMonth, today]);

  const totalBills = billsWithStatus.length;
  const totalAmount = billsWithStatus.reduce(
    (s, b) => s + (Number(b.expectedAmount) || 0),
    0,
  );
  const paidCount = billsWithStatus.filter((b) => b.status === "Paid").length;

  const grid = useMemo(
    () => buildCalendarGrid(displayYear, displayMonth),
    [displayYear, displayMonth],
  );

  const billsByDay = useMemo(() => {
    const map = {};
    billsWithStatus.forEach((bill) => {
      const d = bill.day;
      if (!map[d]) map[d] = [];
      map[d].push(bill);
    });
    return map;
  }, [billsWithStatus]);

  const prevMonth = () => {
    if (displayMonth === 0) {
      setDisplayYear((y) => y - 1);
      setDisplayMonth(11);
    } else setDisplayMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (displayMonth === 11) {
      setDisplayYear((y) => y + 1);
      setDisplayMonth(0);
    } else setDisplayMonth((m) => m + 1);
  };

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
        <Typography color="error">Failed to load bill data.</Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h5" fontWeight={600}>
          Bills
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openAdd}
          >
            Add Bill
          </Button>
          <CalendarTodayIcon
            sx={{ fontSize: 36, color: "primary.main", opacity: 0.5 }}
          />
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Recurring bills — detected and manual, in one place. Payments auto-match
        to mark them paid; link transactions or edit to correct anything.
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        {[
          { label: "Total Bills This Month", value: totalBills },
          {
            label: "Total Predicted Amount",
            value: fmt2(totalAmount),
          },
          { label: "Bills Paid So Far", value: paidCount },
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

      {/* Calendar */}
      <Paper elevation={2} sx={{ mb: 3, overflow: "hidden" }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={2}
          py={1}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <IconButton onClick={prevMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            {MONTH_NAMES[displayMonth]} {displayYear}
          </Typography>
          <IconButton onClick={nextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Box
          display="grid"
          gridTemplateColumns="repeat(7, 1fr)"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          {DOW_HEADERS.map((h) => (
            <Box key={h} sx={{ textAlign: "center", py: 0.75 }}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                {h}
              </Typography>
            </Box>
          ))}
        </Box>

        {grid.map((week, wi) => (
          <Box
            key={wi}
            display="grid"
            gridTemplateColumns="repeat(7, 1fr)"
            sx={{
              borderBottom: wi < grid.length - 1 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            {week.map((day, di) => {
              const isToday =
                day !== null &&
                displayYear === today.getFullYear() &&
                displayMonth === today.getMonth() &&
                day === today.getDate();
              const dayBills = day ? billsByDay[day] || [] : [];
              return (
                <Box
                  key={di}
                  sx={{
                    minHeight: 72,
                    p: 0.5,
                    borderRight: di < 6 ? 1 : 0,
                    borderColor: "divider",
                    bgcolor:
                      day === null
                        ? "action.disabledBackground"
                        : "background.paper",
                    opacity: day === null ? 0.4 : 1,
                  }}
                >
                  {day !== null && (
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          mb: 0.25,
                        }}
                      >
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: isToday ? "primary.main" : "transparent",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: isToday ? 700 : 400,
                              color: isToday ? "#fff" : "text.primary",
                            }}
                          >
                            {day}
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" flexDirection="column" gap={0.25}>
                        {dayBills.map((bill) => (
                          <Chip
                            key={bill.key}
                            label={`${abbrev(bill.name)} $${Math.round(Number(bill.expectedAmount) || 0)}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 600,
                              bgcolor: STATUS_COLORS[bill.status].bg,
                              color: STATUS_COLORS[bill.status].text,
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Paper>

      <Box display="flex" gap={1.5} mb={3} alignItems="center">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Status:
        </Typography>
        {Object.entries(STATUS_COLORS).map(([status, { bg, text }]) => (
          <Chip
            key={status}
            label={status}
            size="small"
            sx={{ bgcolor: bg, color: text, fontSize: 11, fontWeight: 600 }}
          />
        ))}
      </Box>

      <Typography variant="h6" fontWeight={600} mb={1.5}>
        Bills — {MONTH_NAMES[displayMonth]} {displayYear}
      </Typography>
      <Paper elevation={2}>
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
                <strong>Amount</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Due Day</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Status</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billsWithStatus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No bills yet. Add one above, or track a detected recurring.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              billsWithStatus.map((bill) => (
                <TableRow key={bill.key} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <BrandLogo sub={bill} size={28} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {bill.name}
                        </Typography>
                        {!bill.subscriptionId && (
                          <Typography variant="caption" color="text.secondary">
                            {bill.suggestion
                              ? "suggested · not tracked"
                              : "detected · not tracked"}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={bill.category || "Unknown"}
                      size="small"
                      sx={{
                        bgcolor: CAT_COLORS[bill.category] || "#9e9e9e",
                        color: "#fff",
                        fontSize: 11,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {fmt2(bill.expectedAmount)}
                    </Typography>
                    {bill.amountVariable && (
                      <Typography variant="caption" color="warning.main">
                        variable
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {MONTH_NAMES[displayMonth].slice(0, 3)} {bill.day}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={bill.status}
                      size="small"
                      sx={{
                        bgcolor: STATUS_COLORS[bill.status].bg,
                        color: STATUS_COLORS[bill.status].text,
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {bill.subscriptionId ? (
                      <>
                        <Tooltip
                          title={
                            bill.status === "Paid"
                              ? "Mark unpaid this month"
                              : "Mark paid this month"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleTogglePaid(bill)}
                          >
                            {bill.status === "Paid" ? (
                              <CheckCircleIcon
                                fontSize="small"
                                color="success"
                              />
                            ) : (
                              <UncheckedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Link transactions">
                          <IconButton
                            size="small"
                            onClick={() => setLinkTarget(bill)}
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(bill)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete this bill">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(bill)}
                            sx={{
                              color: "text.disabled",
                              "&:hover": { color: "error.main" },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip title="Track this detected bill (persist + auto-match payments)">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleTrack(bill)}
                        >
                          <TrackIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
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
        defaultKind="bill"
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
