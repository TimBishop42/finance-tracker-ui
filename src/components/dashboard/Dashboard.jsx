import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SummaryCard = ({ title, value, icon, trend, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            ${value.toLocaleString()}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {trend > 0 ? (
                <TrendingUp color="success" />
              ) : (
                <TrendingDown color="error" />
              )}
              <Typography
                variant="body2"
                color={trend > 0 ? 'success.main' : 'error.main'}
                sx={{ ml: 1 }}
              >
                {Math.abs(trend)}% vs last month
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ color: color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const SpendingChart = ({ data }) => (
  <Card sx={{ height: 400, mt: 3 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Monthly Spending Trend
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="amount" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  // TODO: Replace with actual data from API
  const mockData = {
    currentMonthSpend: 2500,
    lastMonthSpend: 2200,
    totalBalance: 15000,
    spendingTrend: [
      { name: 'Jan', amount: 2000 },
      { name: 'Feb', amount: 2200 },
      { name: 'Mar', amount: 2500 },
    ],
  };

  const monthlyTrend = ((mockData.currentMonthSpend - mockData.lastMonthSpend) / mockData.lastMonthSpend) * 100;

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Current Month Spend"
            value={mockData.currentMonthSpend}
            icon={<AccountBalance sx={{ fontSize: 40 }} />}
            trend={monthlyTrend}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Last Month Spend"
            value={mockData.lastMonthSpend}
            icon={<AccountBalance sx={{ fontSize: 40 }} />}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Total Balance"
            value={mockData.totalBalance}
            icon={<AccountBalance sx={{ fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>
      </Grid>
      <SpendingChart data={mockData.spendingTrend} />
    </Box>
  );
} 