import React, { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarTodayIcon,
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

const STATUS_COLORS = {
  Paid: { bg: "#2e7d32", text: "#fff" },
  Upcoming: { bg: "#1565c0", text: "#fff" },
  Overdue: { bg: "#b71c1c", text: "#fff" },
};

// Abbreviate a merchant name to fit in a calendar chip
function abbrev(name, maxLen = 10) {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}

// ─── calendar helpers ─────────────────────────────────────────────────────────

// Returns array of 6 weeks × 7 days for the given year/month (0-indexed month)
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  // Monday-first: 0=Mon … 6=Sun
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  let day = 1 - startDow; // may be negative (prev-month padding)
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

// ─── component ────────────────────────────────────────────────────────────────

export default function BillCalendar() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { excluded } = useExcludedMerchants();
  const { customMerchants } = useCustomMerchants();

  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

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

  const monthlyBills = useMemo(
    () =>
      detectRecurring(txns, customMerchants).filter(
        (r) => r.isBill && !excluded.has(r.key),
      ),
    [txns, customMerchants, excluded],
  );

  // Determine status for each bill in the currently displayed month
  const billsWithStatus = useMemo(() => {
    const isCurrentMonth =
      displayYear === today.getFullYear() && displayMonth === today.getMonth();
    return monthlyBills
      .map((bill) => {
        const paidThisMonth = bill.transactions.some((t) => {
          if (!t.transactionDateTime) return false;
          const d = new Date(t.transactionDateTime);
          return (
            d.getFullYear() === displayYear && d.getMonth() === displayMonth
          );
        });

        let status;
        if (paidThisMonth) {
          status = "Paid";
        } else if (isCurrentMonth && bill.predictedDay < today.getDate()) {
          status = "Overdue";
        } else {
          status = "Upcoming";
        }

        return { ...bill, status };
      })
      .sort((a, b) => a.predictedDay - b.predictedDay);
  }, [monthlyBills, displayYear, displayMonth, today]);

  // Summary stats
  const totalBills = billsWithStatus.length;
  const totalAmount = billsWithStatus.reduce((s, b) => s + b.avg, 0);
  const paidCount = billsWithStatus.filter((b) => b.status === "Paid").length;

  // Calendar grid
  const grid = useMemo(
    () => buildCalendarGrid(displayYear, displayMonth),
    [displayYear, displayMonth],
  );

  // Map day → bills for quick calendar lookup
  const billsByDay = useMemo(() => {
    const map = {};
    billsWithStatus.forEach((bill) => {
      const d = bill.predictedDay;
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
        <Typography color="error">Failed to load transactions.</Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Page header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h5" fontWeight={600}>
          Bill Calendar
        </Typography>
        <CalendarTodayIcon
          sx={{ fontSize: 36, color: "primary.main", opacity: 0.5 }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Predicted upcoming bill payments based on recurring transaction history
      </Typography>

      {/* Summary stat cards */}
      <Box display="flex" gap={2} mb={3}>
        {[
          { label: "Total Bills This Month", value: totalBills },
          {
            label: "Total Predicted Amount",
            value: `$${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
        {/* Month navigation */}
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

        {/* Day-of-week headers */}
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

        {/* Calendar rows */}
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
                      {/* Day number */}
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
                      {/* Bill chips */}
                      <Box display="flex" flexDirection="column" gap={0.25}>
                        {dayBills.map((bill) => (
                          <Chip
                            key={bill.key}
                            label={`${abbrev(bill.name)} $${Math.round(bill.avg)}`}
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

      {/* Legend */}
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

      {/* Bill list */}
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
                <strong>Predicted Amount</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Predicted Day</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Status</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billsWithStatus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No monthly bills detected. Need transactions from 3+
                    distinct months per merchant.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              billsWithStatus.map((bill) => (
                <TableRow key={bill.key} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {bill.name}
                    </Typography>
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
                      $
                      {bill.avg.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {MONTH_NAMES[displayMonth].slice(0, 3)}{" "}
                      {bill.predictedDay}
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
