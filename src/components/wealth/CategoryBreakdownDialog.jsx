import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt, fmt2, qtyFmt, share, compact, todayIso } from "../../utils/format";
import {
  buildVestingSchedule,
  categoryHistory,
  nextVestAcrossGrants,
} from "./vestingSchedule";

// Drill-down for one allocation slice. The rows come straight from the
// /wealth/summary payload — holdings, grants and items are the same records the
// server summed into the slice — so the only fetch is the one already made.

const OPTIONS = "OPTIONS";
const sortDesc = (rows) => [...rows].sort((a, b) => b.value - a.value);

// Shapes one asset class into { columns, sections, footnote }.
// Rows are { id, name, meta, detail, flag, value }.
function buildModel(assetClass, summary, currency) {
  if (!assetClass) return null;

  if (assetClass === "SHARES") {
    const rows = (summary?.holdings || []).map((h) => ({
      id: `h${h.securityId}`,
      name: h.ticker,
      meta: h.name || null,
      detail: `${qtyFmt(h.quantity)} @ ${fmt2(
        h.priceIsEstimated ? h.avgCost : h.lastPrice,
        h.currency,
      )}`,
      flag: h.priceIsEstimated ? "est. price" : null,
      value: Number(h.marketValueDisplay) || 0,
    }));
    return {
      columns: ["Holding", "Position", "Market value"],
      sections: [{ title: null, rows: sortDesc(rows) }],
    };
  }

  if (assetClass === OPTIONS) {
    const grants = summary?.options || [];
    const toRow = (o) => ({
      id: `o${o.id}`,
      name: o.name || o.underlyingTicker,
      meta: o.underlyingTicker,
      detail: `${qtyFmt(o.vestedQuantity)} / ${qtyFmt(o.quantity)}`,
      // A grant with no price (or an expired option) values at zero and would
      // otherwise vanish silently into the total — call it out on the row.
      flag: o.expired ? "expired" : o.priceMissing ? "no price" : null,
      value: Number(o.vestedValueDisplay) || 0,
    });
    const sections = [];
    const opts = grants.filter((o) => o.grantType !== "RSU").map(toRow);
    const rsus = grants.filter((o) => o.grantType === "RSU").map(toRow);
    if (opts.length) sections.push({ title: "Options", rows: sortDesc(opts) });
    if (rsus.length)
      sections.push({ title: "RSU / equity", rows: sortDesc(rsus) });
    return {
      columns: ["Grant", "Vested / total", "Vested value"],
      sections,
      memo: {
        label: "Unvested (memo)",
        value: Number(summary?.unvestedOptionsValue) || 0,
      },
      footnote:
        "Only vested value counts toward net worth. Options are valued at intrinsic value (price − strike); RSUs at the full share price, before tax.",
    };
  }

  const rows = (summary?.items || [])
    .filter((i) => i.kind !== "LIABILITY" && i.assetClass === assetClass)
    .map((i) => ({
      id: `i${i.id}`,
      name: i.name,
      meta: null,
      detail: i.note || "—",
      flag: i.currency !== currency ? i.currency : null,
      value: Number(i.valueDisplay) || 0,
    }));
  return {
    columns: ["Item", "Note", "Value"],
    sections: [{ title: null, rows: sortDesc(rows) }],
  };
}

// Proportional bar, scaled against the largest row in the category rather than
// the total — scaling to total renders every row of a diversified category as
// an unreadable sliver, and the value column already carries the absolutes.
function ShareBar({ value, max, color }) {
  const width = max > 0 ? Math.max(0, (value / max) * 100) : 0;
  return (
    <Box
      sx={{
        width: "100%",
        height: 8,
        borderRadius: 1,
        bgcolor: "action.hover",
        overflow: "hidden",
      }}
    >
      <Box sx={{ width: `${width}%`, height: "100%", bgcolor: color }} />
    </Box>
  );
}

export default function CategoryBreakdownDialog({
  open,
  onClose,
  assetClass,
  label,
  color,
  summary,
  currency,
}) {
  const model = useMemo(
    () => buildModel(assetClass, summary, currency),
    [assetClass, summary, currency],
  );

  const slice = useMemo(
    () => (summary?.allocation || []).find((a) => a.assetClass === assetClass),
    [summary, assetClass],
  );

  const history = useMemo(
    () => categoryHistory(summary?.snapshots, assetClass),
    [summary, assetClass],
  );

  const isEquity = assetClass === OPTIONS;
  const vesting = useMemo(
    () => (isEquity ? buildVestingSchedule(summary?.options) : null),
    [isEquity, summary],
  );
  const nextVest = useMemo(
    () => (isEquity ? nextVestAcrossGrants(summary?.options) : null),
    [isEquity, summary],
  );

  if (!assetClass || !model) return null;

  const allRows = model.sections.flatMap((s) => s.rows);
  const total = allRows.reduce((acc, r) => acc + r.value, 0);
  const maxRow = allRows.reduce((m, r) => Math.max(m, r.value), 0);
  const sliceValue = slice ? Number(slice.value) || 0 : null;
  // The rows ARE the slice's constituents, so any gap means the server totalled
  // something this view doesn't show — surface it rather than hide it.
  const drift = sliceValue == null ? 0 : Math.abs(total - sliceValue);
  const showSubtotals = model.sections.length > 1;
  const barColor = color || "#42a5f5";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        {label}
        <Typography variant="body2" color="text.secondary">
          {fmt(total, currency)}
          {slice?.pct != null && ` · ${share(slice.pct)} of total assets`}
          {` · ${allRows.length} ${allRows.length === 1 ? "item" : "items"}`}
        </Typography>
        {isEquity && (
          <Typography variant="body2" color="text.secondary">
            Unvested {fmt(summary?.unvestedOptionsValue, currency)} (memo)
            {nextVest &&
              ` · next ${fmt(nextVest.value, currency)} on ${nextVest.date}`}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {!allRows.length ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Nothing in this category yet.
            </Typography>
          </Box>
        ) : (
          <>
            {history.rows.length >= 2 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {label} over time
                </Typography>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart
                    data={history.rows}
                    margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmt(v, currency)} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={label}
                      stroke={barColor}
                      fill={barColor}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {history.skipped > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {history.skipped === 1
                      ? "1 earlier snapshot predates per-category capture and is not charted."
                      : `${history.skipped} earlier snapshots predate per-category capture and are not charted.`}
                  </Typography>
                )}
              </Box>
            )}

            {isEquity && (vesting.rows.length > 0 || vesting.skipped > 0) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Vesting schedule
                </Typography>
                {vesting.rows.length > 0 && (
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart
                      data={vesting.rows}
                      margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmt(v, currency)} />
                      <Legend />
                      <ReferenceLine
                        x={
                          vesting.rows.find(
                            (r) => r.month >= todayIso().slice(0, 7),
                          )?.label
                        }
                        stroke="#888"
                        strokeDasharray="3 3"
                      />
                      <Bar
                        dataKey="vested"
                        name="Vested"
                        stackId="v"
                        fill={barColor}
                      />
                      <Bar
                        dataKey="scheduled"
                        name="Scheduled"
                        stackId="v"
                        fill={barColor}
                        fillOpacity={0.3}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <Typography variant="caption" color="text.secondary">
                  {vesting.rows.length > 0 &&
                    "Future tranches valued at today's price — this is current worth on a timeline, not a forecast."}
                  {vesting.skipped > 0 &&
                    ` ${vesting.skipped} ${
                      vesting.skipped === 1 ? "grant is" : "grants are"
                    } worth nothing today (expired or unpriced) and ${
                      vesting.skipped === 1 ? "is" : "are"
                    } not plotted.`}
                </Typography>
              </Box>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{model.columns[0]}</TableCell>
                  <TableCell align="right">{model.columns[1]}</TableCell>
                  <TableCell sx={{ width: "22%" }}>Share</TableCell>
                  <TableCell align="right">{model.columns[2]}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {model.sections.map((section) => (
                  <React.Fragment key={section.title || "all"}>
                    {section.title && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          sx={{ pt: 2, pb: 0.5, border: 0 }}
                        >
                          <Typography variant="overline" color="text.secondary">
                            {section.title}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {section.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.name}
                          {r.flag && (
                            <Chip
                              size="small"
                              label={r.flag}
                              sx={{ ml: 0.5 }}
                              variant="outlined"
                            />
                          )}
                          {r.meta && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              {r.meta}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{r.detail}</TableCell>
                        <TableCell>
                          <ShareBar
                            value={r.value}
                            max={maxRow}
                            color={barColor}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {fmt(r.value, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {showSubtotals && (
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography variant="caption" color="text.secondary">
                            {section.title} subtotal
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">
                            {fmt(
                              section.rows.reduce((a, r) => a + r.value, 0),
                              currency,
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <strong>Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{fmt(total, currency)}</strong>
                  </TableCell>
                </TableRow>
                {model.memo && (
                  <TableRow>
                    <TableCell colSpan={3} align="right" sx={{ border: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        {model.memo.label}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ border: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        {fmt(model.memo.value, currency)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {drift > 0.01 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                These rows total {fmt(total, currency)} but the allocation slice
                reports {fmt(sliceValue, currency)}.
              </Alert>
            )}
          </>
        )}
        {model.footnote && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            {model.footnote}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
