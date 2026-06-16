import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from "@mui/material";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  projectSuper,
  DEFAULT_SUPER_INPUTS,
} from "../../services/superProjection";

const STORAGE_KEY = "superInputs";

const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});
const fmt = (n) => currency.format(Number.isFinite(n) ? n : 0);
const compact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
};

function loadInputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SUPER_INPUTS, ...JSON.parse(raw) };
  } catch (e) {
    /* ignore corrupt storage */
  }
  return { ...DEFAULT_SUPER_INPUTS };
}

function NumField({
  label,
  field,
  value,
  onChange,
  adornment,
  step = 1,
  helper,
}) {
  const InputProps =
    adornment === "$"
      ? { startAdornment: <InputAdornment position="start">$</InputAdornment> }
      : adornment === "%"
        ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
        : undefined;
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      fullWidth
      value={value}
      onChange={(e) => onChange(field, e.target.value)}
      InputProps={InputProps}
      inputProps={{ step }}
      helperText={helper}
    />
  );
}

function Kpi({ title, primary, secondary, color }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ color, fontWeight: 600 }}>
          {primary}
        </Typography>
        {secondary && (
          <Typography variant="body2" color="text.secondary">
            {secondary}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <Paper sx={{ p: 1.5 }} elevation={3}>
      <Typography variant="subtitle2">Age {label}</Typography>
      <Typography variant="body2">
        Balance (nominal): {fmt(p.balanceNominal)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Today&apos;s dollars: {fmt(p.balanceReal)}
      </Typography>
      {p.withdrawalNominal > 0 && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Income this year: {fmt(p.withdrawalNominal)}
        </Typography>
      )}
    </Paper>
  );
}

export default function SuperTracker() {
  const [inputs, setInputs] = useState(loadInputs);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch (e) {
      /* ignore */
    }
  }, [inputs]);

  const setField = (field, value) =>
    setInputs((prev) => ({ ...prev, [field]: value }));
  const setBool = (field) => (e) => setField(field, e.target.checked);

  const { series, summary } = useMemo(() => projectSuper(inputs), [inputs]);

  const useReal = inputs.displayMode === "real";
  const { retirementAge } = summary;

  const chartData = useMemo(
    () =>
      series.map((p) => {
        const primary = useReal ? p.balanceReal : p.balanceNominal;
        const alt = useReal ? p.balanceNominal : p.balanceReal;
        return {
          age: p.age,
          accum: p.age <= retirementAge ? primary : null,
          draw: p.age >= retirementAge ? primary : null,
          alt,
          balanceNominal: p.balanceNominal,
          balanceReal: p.balanceReal,
          withdrawalNominal: p.withdrawalNominal,
        };
      }),
    [series, useReal, retirementAge],
  );

  const balanceAtRet = useReal
    ? summary.balanceAtRetirementReal
    : summary.balanceAtRetirementNominal;
  const monthlyIncome = useReal
    ? summary.monthlyIncomeReal
    : summary.monthlyIncomeNominal;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
        }}
      >
        <Typography variant="h4">Superannuation Forecast</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={inputs.displayMode}
          onChange={(_, v) => v && setField("displayMode", v)}
        >
          <ToggleButton value="real">Today&apos;s dollars</ToggleButton>
          <ToggleButton value="nominal">Future dollars</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        General illustrative projection based on the assumptions you enter — not
        financial advice. Defaults are AU 2025-26 seed values; edit any of them.
        &quot;Today&apos;s dollars&quot; deflates future balances by inflation
        so they reflect current purchasing power.
      </Alert>

      <Grid container spacing={2}>
        {/* ---- Inputs ---- */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              You &amp; timeline
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={4}>
                <NumField
                  label="Current age"
                  field="currentAge"
                  value={inputs.currentAge}
                  onChange={setField}
                />
              </Grid>
              <Grid item xs={4}>
                <NumField
                  label="Retire at"
                  field="retirementAge"
                  value={inputs.retirementAge}
                  onChange={setField}
                />
              </Grid>
              <Grid item xs={4}>
                <NumField
                  label="Plan to"
                  field="endAge"
                  value={inputs.endAge}
                  onChange={setField}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Accumulation
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <NumField
                  label="Starting balance"
                  field="startingBalance"
                  value={inputs.startingBalance}
                  onChange={setField}
                  adornment="$"
                  step={1000}
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Monthly contribution"
                  field="monthlyContribution"
                  value={inputs.monthlyContribution}
                  onChange={setField}
                  adornment="$"
                  step={50}
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Return (gross)"
                  field="returnAccumPct"
                  value={inputs.returnAccumPct}
                  onChange={setField}
                  adornment="%"
                  step={0.1}
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Contrib. growth"
                  field="contributionGrowthPct"
                  value={inputs.contributionGrowthPct}
                  onChange={setField}
                  adornment="%"
                  step={0.1}
                  helper="wage inflation"
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Fee"
                  field="feePct"
                  value={inputs.feePct}
                  onChange={setField}
                  adornment="%"
                  step={0.05}
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Fixed fee / yr"
                  field="feeFixedAnnual"
                  value={inputs.feeFixedAnnual}
                  onChange={setField}
                  adornment="$"
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Insurance / yr"
                  field="insuranceAnnual"
                  value={inputs.insuranceAnnual}
                  onChange={setField}
                  adornment="$"
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Earnings tax"
                  field="earningsTaxAccumPct"
                  value={inputs.earningsTaxAccumPct}
                  onChange={setField}
                  adornment="%"
                  step={0.5}
                  helper="accum. phase"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!inputs.applyContribTax}
                      onChange={setBool("applyContribTax")}
                    />
                  }
                  label="Apply 15% contributions tax (pre-tax contributions)"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Drawdown (retirement)
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <NumField
                  label="Desired drawdown / yr"
                  field="desiredAnnualDrawdown"
                  value={inputs.desiredAnnualDrawdown}
                  onChange={setField}
                  adornment="$"
                  step={1000}
                />
              </Grid>
              <Grid item xs={6}>
                <NumField
                  label="Return (gross)"
                  field="returnRetirePct"
                  value={inputs.returnRetirePct}
                  onChange={setField}
                  adornment="%"
                  step={0.1}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!inputs.useStatutoryMin}
                      onChange={setBool("useStatutoryMin")}
                    />
                  }
                  label="Use statutory minimum drawdown instead"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!inputs.indexDrawdownToInflation}
                      onChange={setBool("indexDrawdownToInflation")}
                      disabled={!!inputs.useStatutoryMin}
                    />
                  }
                  label="Index drawdown to inflation"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={6}>
                <NumField
                  label="Inflation (CPI)"
                  field="inflationPct"
                  value={inputs.inflationPct}
                  onChange={setField}
                  adornment="%"
                  step={0.1}
                />
              </Grid>
              <Grid item xs={6}>
                <Button
                  size="small"
                  onClick={() => setInputs({ ...DEFAULT_SUPER_INPUTS })}
                >
                  Reset to defaults
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ---- Results ---- */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <Kpi
                title="Balance at retirement"
                primary={fmt(balanceAtRet)}
                secondary={
                  useReal
                    ? `${fmt(summary.balanceAtRetirementNominal)} in future dollars`
                    : `${fmt(summary.balanceAtRetirementReal)} in today's dollars`
                }
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Kpi
                title="Monthly income in retirement"
                primary={fmt(monthlyIncome)}
                secondary={`${fmt(useReal ? summary.firstYearIncomeReal : summary.firstYearIncomeNominal)} / yr (first year)`}
                color="secondary.main"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Kpi
                title="Your money"
                primary={
                  summary.moneyLasts
                    ? `Lasts past ${summary.endAge}`
                    : `Runs out at ${summary.lastsUntilAge}`
                }
                secondary={
                  summary.moneyLasts
                    ? "Balance survives the plan horizon"
                    : "Consider a lower drawdown"
                }
                color={summary.moneyLasts ? "success.main" : "error.main"}
              />
            </Grid>
          </Grid>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Projected balance — contribution then drawdown phase
            </Typography>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="age"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickCount={10}
                  label={{ value: "Age", position: "insideBottom", offset: -2 }}
                />
                <YAxis tickFormatter={compact} width={56} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <ReferenceLine
                  x={retirementAge}
                  stroke="#888"
                  strokeDasharray="4 4"
                  label={{
                    value: `Retire ${retirementAge}`,
                    position: "top",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="accum"
                  name="Accumulation"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.25}
                  connectNulls={false}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="draw"
                  name="Drawdown"
                  stroke="#dc004e"
                  fill="#dc004e"
                  fillOpacity={0.2}
                  connectNulls={false}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="alt"
                  name={useReal ? "Future dollars" : "Today's dollars"}
                  stroke="#999"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="text.secondary">
              Solid area:{" "}
              {useReal
                ? "today's dollars (inflation-adjusted)"
                : "future dollars (nominal)"}
              . Dashed line: the other measure for comparison.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
