import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, CircularProgress,
  Tooltip as MuiTooltip, IconButton, useTheme,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import RestClient from '../../rest/CategoryClient';

const CELL_SIZE = 13;
const CELL_GAP = 2;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function cellColor(amount, max, isDark) {
  if (!amount) return isDark ? '#2d2d2d' : '#ebedf0';
  const r = Math.min(amount / max, 1);
  if (r < 0.25) return '#c6e5ff';
  if (r < 0.50) return '#79b8ff';
  if (r < 0.75) return '#1976d2';
  return '#0d47a1';
}

function parseDate(val) {
  if (!val) return null;
  const d = /^\d{10,}$/.test(String(val)) ? new Date(+val) : new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toDateKey(d) {
  return d.toISOString().split('T')[0];
}

function buildGrid(year, spendByDay) {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startOffset = (jan1.getDay() + 6) % 7; // 0=Mon
  const cursor = new Date(jan1);
  cursor.setDate(cursor.getDate() - startOffset);

  const weeks = [];
  while (cursor <= dec31 || weeks.length < 52) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const inYear = cursor.getFullYear() === year;
      const key = toDateKey(cursor);
      week.push({ date: new Date(cursor), key, amount: inYear ? (spendByDay[key] || 0) : null, inYear });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getFullYear() > year && weeks.length >= 52) break;
  }
  return weeks;
}

function monthPositions(weeks) {
  const out = [];
  let last = -1;
  weeks.forEach((week, wi) => {
    const first = week.find(d => d.inYear);
    if (!first) return;
    const m = first.date.getMonth();
    if (m !== last) { out.push({ m, wi }); last = m; }
  });
  return out;
}

export default function SpendingHeatmap() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    RestClient.get('/finance/find-all-transactions?recentMonth=false')
      .then(r => { setTxns(r.data); setLoading(false); })
      .catch(e => { console.error(e); setError(e); setLoading(false); });
  }, []);

  const availableYears = useMemo(() => {
    const s = new Set(txns.map(t => parseDate(t.transactionDate)?.getFullYear()).filter(Boolean));
    return [...s].sort((a, b) => b - a);
  }, [txns]);

  const spendByDay = useMemo(() => {
    const m = {};
    txns.forEach(t => {
      const d = parseDate(t.transactionDate);
      if (!d || d.getFullYear() !== year) return;
      const k = toDateKey(d);
      m[k] = (m[k] || 0) + parseFloat(t.amount || 0);
    });
    return m;
  }, [txns, year]);

  const maxDay = useMemo(() => Math.max(...Object.values(spendByDay), 1), [spendByDay]);
  const totalYear = useMemo(() => Object.values(spendByDay).reduce((s, v) => s + v, 0), [spendByDay]);
  const activeDays = useMemo(() => Object.values(spendByDay).filter(v => v > 0).length, [spendByDay]);

  const weeks = useMemo(() => buildGrid(year, spendByDay), [year, spendByDay]);
  const mpos = useMemo(() => monthPositions(weeks), [weeks]);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}><CircularProgress /></Box>;
  if (error) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}><Typography color="error">Failed to load transactions.</Typography></Box>;

  const step = CELL_SIZE + CELL_GAP;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>Spending Heatmap</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => setYear(y => y - 1)} disabled={!availableYears.includes(year - 1)}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 52, textAlign: 'center' }}>{year}</Typography>
          <IconButton size="small" onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        {[
          { label: 'Year Total', value: `$${totalYear.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
          { label: 'Active Days', value: activeDays },
          { label: 'Avg (active days)', value: `$${activeDays > 0 ? (totalYear / activeDays).toFixed(0) : 0}` },
          { label: 'Biggest Day', value: `$${maxDay.toFixed(0)}` },
        ].map(({ label, value }) => (
          <Card key={label} variant="outlined" sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h6">{value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card elevation={2} sx={{ p: 3, overflowX: 'auto' }}>
        <Box sx={{ display: 'inline-block' }}>
          {/* Month labels */}
          <Box sx={{ display: 'flex', ml: `${3 * step + 4}px`, mb: 0.5, position: 'relative', height: 18 }}>
            {mpos.map(({ m, wi }) => (
              <Typography key={m} variant="caption" color="text.secondary"
                sx={{ position: 'absolute', left: wi * step, fontSize: 11 }}>
                {MONTH_LABELS[m]}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: `${CELL_GAP}px` }}>
            {/* Day labels */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px`, mr: 0.5 }}>
              {DAY_LABELS.map((label, i) => (
                <Typography key={i} variant="caption" color="text.secondary"
                  sx={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px`, fontSize: 10, textAlign: 'right', width: 26 }}>
                  {label}
                </Typography>
              ))}
            </Box>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <Box key={wi} sx={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px` }}>
                {week.map((day, di) => {
                  if (!day.inYear) return <Box key={di} sx={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                  return (
                    <MuiTooltip key={di} arrow placement="top"
                      title={day.amount > 0 ? `${day.key}: $${day.amount.toFixed(2)}` : day.key}>
                      <Box sx={{
                        width: CELL_SIZE, height: CELL_SIZE,
                        backgroundColor: cellColor(day.amount, maxDay, isDark),
                        borderRadius: '2px',
                        cursor: day.amount > 0 ? 'pointer' : 'default',
                        '&:hover': day.amount > 0 ? { opacity: 0.7 } : {},
                      }} />
                    </MuiTooltip>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* Legend */}
          <Box display="flex" alignItems="center" gap={0.5} mt={1.5} justifyContent="flex-end">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Less</Typography>
            {[isDark ? '#2d2d2d' : '#ebedf0', '#c6e5ff', '#79b8ff', '#1976d2', '#0d47a1'].map((c, i) => (
              <Box key={i} sx={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: c, borderRadius: '2px' }} />
            ))}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>More</Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
