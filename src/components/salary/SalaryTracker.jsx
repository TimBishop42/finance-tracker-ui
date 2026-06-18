import React, { useState, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  Tabs,
  Tab,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  InputAdornment,
  Button,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSalaryHistory } from "../../services/useSalaryHistory";
import { calcTakeHome, perPeriod, mlsThresholds } from "../../services/auTax";

const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});
const currency2 = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 2,
});
const fmt = (n) => currency.format(Number.isFinite(n) ? n : 0);
const fmt2 = (n) => currency2.format(Number.isFinite(n) ? n : 0);
const compact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const fmtMonthYear = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
};

const PERIOD_COLS = [
  { key: "annual", label: "Annual" },
  { key: "monthly", label: "Monthly" },
  { key: "fortnightly", label: "Fortnightly" },
  { key: "weekly", label: "Weekly" },
];

// ---------------------------------------------------------------------------
// Tab 1 — Salary history
// ---------------------------------------------------------------------------
function SalaryHistoryTab({ history }) {
  const { entries, add, remove } = history;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");

  const chartData = useMemo(
    () =>
      entries.map((e, idx) => ({
        label: fmtMonthYear(e.date),
        amount: e.amount,
        changePct:
          idx > 0 && entries[idx - 1].amount
            ? ((e.amount - entries[idx - 1].amount) / entries[idx - 1].amount) *
              100
            : null,
      })),
    [entries],
  );

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const first = entries[0];
    const last = entries[entries.length - 1];
    const totalGrowth = first.amount
      ? ((last.amount - first.amount) / first.amount) * 100
      : 0;
    const years =
      (new Date(last.date) - new Date(first.date)) /
      (365.25 * 24 * 3600 * 1000);
    const cagr =
      years > 0 && first.amount > 0
        ? (Math.pow(last.amount / first.amount, 1 / years) - 1) * 100
        : null;
    return { current: last.amount, totalGrowth, cagr, count: entries.length };
  }, [entries]);

  const onAdd = () => {
    const val = Number(amount);
    if (!val || val <= 0 || !date) return;
    add({ amount: val, date, note });
    setAmount("");
    setNote("");
  };

  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Record a salary
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Annual salary"
                type="number"
                size="small"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Effective date"
                type="date"
                size="small"
                fullWidth
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Note (optional)"
                size="small"
                fullWidth
                placeholder="e.g. promotion, new employer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" fullWidth onClick={onAdd}>
                Add / update
              </Button>
            </Grid>
          </Grid>

          {stats && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2">
                Current salary: <strong>{fmt(stats.current)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total growth: {stats.totalGrowth.toFixed(1)}%
                {stats.cagr != null &&
                  ` · ${stats.cagr.toFixed(1)}% p.a. (CAGR)`}
              </Typography>
            </>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Salary over time
          </Typography>
          {entries.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={compact} width={56} />
                <Tooltip
                  formatter={(value, name, props) => {
                    const pct = props?.payload?.changePct;
                    const change =
                      pct != null
                        ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`
                        : "";
                    return [`${fmt(value)}${change}`, "Salary"];
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="amount"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Alert severity="info">
              No salary entries yet. Add your salary on the left — the most
              recent value automatically drives the Super Forecast.
            </Alert>
          )}
        </Paper>

        {entries.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Effective date</TableCell>
                  <TableCell align="right">Salary</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {entries
                  .slice()
                  .reverse()
                  .map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{fmtMonthYear(e.date)}</TableCell>
                      <TableCell align="right">{fmt(e.amount)}</TableCell>
                      <TableCell>{e.note}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => remove(e.id)}
                          aria-label="delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Grid>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Take-home pay calculator
// ---------------------------------------------------------------------------
function TakeHomeTab({ history }) {
  const current = history.current;
  const [calc, setCalc] = useState(() => ({
    incomeAmount: current ? current.amount : 90000,
    frequency: "annual",
    includesSuper: false,
    sgRate: 12,
    salarySacrifice: 0,
    salarySacrificeFrequency: "annual",
    claimTaxFreeThreshold: true,
    hasHelpDebt: false,
    hasHospitalCover: false,
    isFamily: false,
    dependents: 0,
  }));

  const set = (field, value) => setCalc((p) => ({ ...p, [field]: value }));
  const setBool = (field) => (e) => set(field, e.target.checked);

  const result = useMemo(() => calcTakeHome(calc), [calc]);

  const rows = [
    { label: "Taxable income", value: result.taxableIncome, strong: false },
    { label: "Income tax", value: -result.incomeTax },
    { label: "Medicare levy", value: -result.medicare },
    ...(result.mls.amount > 0
      ? [
          {
            label: `Medicare levy surcharge (${(result.mls.rate * 100).toFixed(2)}%)`,
            value: -result.mls.amount,
          },
        ]
      : []),
    ...(result.help > 0
      ? [{ label: "HELP/HECS repayment", value: -result.help }]
      : []),
    { label: "Take-home pay", value: result.netAnnual, strong: true },
    { label: "Super contribution", value: result.totalSuper, muted: true },
    {
      label: "Super contributions tax (15%)",
      value: -result.superContributionsTax,
      muted: true,
    },
    {
      label: "Super (lands in fund)",
      value: result.netSuper,
      muted: true,
      strong: true,
    },
  ];

  // Dependant-impact note for MLS.
  const familyThresholds = mlsThresholds({
    isFamily: calc.isFamily,
    dependents: Number(calc.dependents),
  });
  const freeThreshold = familyThresholds[0].upTo;
  const singleFree = 101000;

  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      {/* Inputs */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={7}>
              <TextField
                label="Income"
                type="number"
                size="small"
                fullWidth
                value={calc.incomeAmount}
                onChange={(e) => set("incomeAmount", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={5}>
              <Select
                size="small"
                fullWidth
                value={calc.frequency}
                onChange={(e) => set("frequency", e.target.value)}
              >
                <MenuItem value="annual">/ year</MenuItem>
                <MenuItem value="monthly">/ month</MenuItem>
                <MenuItem value="fortnightly">/ fortnight</MenuItem>
                <MenuItem value="weekly">/ week</MenuItem>
              </Select>
            </Grid>

            {current && (
              <Grid item xs={12}>
                <Button
                  size="small"
                  onClick={() => {
                    set("incomeAmount", current.amount);
                    set("frequency", "annual");
                  }}
                >
                  Use current salary ({fmt(current.amount)})
                </Button>
              </Grid>
            )}

            <Grid item xs={6}>
              <TextField
                label="Super rate"
                type="number"
                size="small"
                fullWidth
                value={calc.sgRate}
                onChange={(e) => set("sgRate", e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={calc.includesSuper}
                    onChange={setBool("includesSuper")}
                  />
                }
                label="Incl. super"
              />
            </Grid>

            <Grid item xs={7}>
              <TextField
                label="Salary sacrifice"
                type="number"
                size="small"
                fullWidth
                value={calc.salarySacrifice}
                onChange={(e) => set("salarySacrifice", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={5}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={calc.salarySacrificeFrequency}
                onChange={(_, v) => v && set("salarySacrificeFrequency", v)}
                fullWidth
              >
                <ToggleButton value="annual">/yr</ToggleButton>
                <ToggleButton value="monthly">/mo</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={calc.claimTaxFreeThreshold}
                    onChange={setBool("claimTaxFreeThreshold")}
                  />
                }
                label="Claim tax-free threshold"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={calc.hasHelpDebt}
                    onChange={setBool("hasHelpDebt")}
                  />
                }
                label="Has HELP/HECS debt"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={calc.hasHospitalCover}
                    onChange={setBool("hasHospitalCover")}
                  />
                }
                label="Has private hospital cover"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={calc.isFamily}
                    onChange={setBool("isFamily")}
                  />
                }
                label="Family (spouse and/or dependants)"
              />
            </Grid>
            {calc.isFamily && (
              <Grid item xs={12}>
                <TextField
                  label="Dependent children"
                  type="number"
                  size="small"
                  fullWidth
                  value={calc.dependents}
                  onChange={(e) => set("dependents", e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      </Grid>

      {/* Results */}
      <Grid item xs={12} md={8}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Take-home / {calc.frequency}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ color: "success.main", fontWeight: 600 }}
                >
                  {fmt2(perPeriod(result.netAnnual, calc.frequency))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {fmt(result.netAnnual)} / yr
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Estimated tax / yr
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ color: "error.main", fontWeight: 600 }}
                >
                  {fmt(result.totalTax)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {((result.totalTax / (result.cashSalary || 1)) * 100).toFixed(
                    1,
                  )}
                  % of salary
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Super lands in fund / yr
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ color: "primary.main", fontWeight: 600 }}
                >
                  {fmt(result.netSuper)}
                </Typography>
                <Typography
                  variant="body2"
                  color={
                    result.concessionalExceeded
                      ? "error.main"
                      : "text.secondary"
                  }
                >
                  {fmt(result.totalSuper)} contributed − 15% tax
                  {result.concessionalExceeded ? " · over $30k cap" : ""}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                {PERIOD_COLS.map((c) => (
                  <TableCell key={c.key} align="right">
                    {c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell
                    sx={{
                      fontWeight: r.strong ? 700 : 400,
                      color: r.muted ? "text.secondary" : "inherit",
                    }}
                  >
                    {r.label}
                  </TableCell>
                  {PERIOD_COLS.map((c) => (
                    <TableCell
                      key={c.key}
                      align="right"
                      sx={{
                        fontWeight: r.strong ? 700 : 400,
                        color: r.muted ? "text.secondary" : "inherit",
                      }}
                    >
                      {fmt2(perPeriod(r.value, c.key))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Alert severity={result.mls.amount > 0 ? "warning" : "info"}>
          {calc.isFamily ? (
            <>
              As a{" "}
              <strong>
                family
                {Number(calc.dependents) > 0
                  ? ` with ${calc.dependents} dependant${Number(calc.dependents) > 1 ? "s" : ""}`
                  : ""}
              </strong>
              , your Medicare Levy Surcharge–free threshold is{" "}
              <strong>{fmt(freeThreshold)}</strong> (vs {fmt(singleFree)} for a
              single). Each dependant after the first raises it by $1,500.
            </>
          ) : (
            <>
              As a <strong>single</strong>, your Medicare Levy Surcharge–free
              threshold is <strong>{fmt(singleFree)}</strong>. Adding a
              spouse/dependants raises it to {fmt(202000)}+.
            </>
          )}{" "}
          {result.mls.amount > 0
            ? `Your taxable income is above it, so a ${(result.mls.rate * 100).toFixed(2)}% surcharge of ${fmt(result.mls.amount)}/yr applies — private hospital cover would remove it.`
            : calc.hasHospitalCover
              ? "No surcharge (you hold private hospital cover)."
              : "Your income is below it — no surcharge."}
        </Alert>
      </Grid>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
export default function SalaryTracker() {
  const history = useSalaryHistory();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Typography variant="h4" gutterBottom>
        Salary &amp; Pay
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        General information for FY2025-26 (AU resident) — not financial or tax
        advice. Take-home figures are estimates; thresholds change yearly.
        Salary history is saved to your finance-tracker server.
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="Salary history" />
        <Tab label="Take-home pay" />
      </Tabs>

      {tab === 0 ? (
        <SalaryHistoryTab history={history} />
      ) : (
        <TakeHomeTab history={history} />
      )}
    </Box>
  );
}
