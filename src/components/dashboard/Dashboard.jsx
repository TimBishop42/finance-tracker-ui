import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ArrowBackIos,
  ArrowForwardIos,
} from '@mui/icons-material';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area
} from 'recharts';
import { getMonthlySpendComparison, getSummaryMonths, getCumulativeSpend, getMaxSpendValue } from '../../services/finance-service';

const SummaryCard = ({ title, value, icon, trend, color, loading, subtitle }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <Typography variant="h4" component="div">
                ${parseFloat(value).toLocaleString()}
              </Typography>
              {trend && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  {parseFloat(trend) > 0 ? (
                    <TrendingUp color="success" />
                  ) : (
                    <TrendingDown color="error" />
                  )}
                  <Typography
                    variant="body2"
                    color={parseFloat(trend) > 0 ? 'success.main' : 'error.main'}
                    sx={{ ml: 1 }}
                  >
                    {Math.abs(parseFloat(trend))}% vs last month
                  </Typography>
                </Box>
              )}
              {subtitle && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {subtitle}
                </Typography>
              )}
            </>
          )}
        </Box>
        <Box sx={{ color: color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const SpendingChart = ({ data, targetSpend, selectedMonth, selectedYear, onNavigateMonth, loading }) => {
  console.log('SpendingChart received targetSpend:', targetSpend);
  
  // Format month/year for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const displayTitle = selectedMonth && selectedYear 
    ? `${monthNames[selectedMonth - 1]} ${selectedYear} Spending Trend`
    : 'Monthly Spending Trend';
  
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No spending data available</Typography>
      </Box>
    );
  }

  const processedData = data.map(point => ({
    ...point,
    isOverTarget: point.amount > targetSpend
  }));

  return (
    <Box sx={{ p: 3, height: 400 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton 
          onClick={() => onNavigateMonth('prev')}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          <ArrowBackIos />
        </IconButton>
        
        <Typography variant="h6" sx={{ textAlign: 'center', flexGrow: 1 }}>
          {displayTitle}
        </Typography>
        
        <IconButton 
          onClick={() => onNavigateMonth('next')}
          disabled={loading}
          sx={{ ml: 2 }}
        >
          <ArrowForwardIos />
        </IconButton>
      </Box>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }} 
          />
          <YAxis 
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }} 
            tickFormatter={(value) => `$${value}`}
            domain={[0, Math.max(targetSpend, ...data.map(d => d.amount))]}
          />
          <Tooltip 
            formatter={(value) => [`$${value}`, 'Cumulative Spend']}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="none"
            fill={processedData.some(d => d.isOverTarget) ? "#ffcdd2" : "#bbdefb"}
            fillOpacity={0.8}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Cumulative Spend"
          />
          <ReferenceLine
            y={targetSpend}
            stroke="red"
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{
              value: `Target: $${targetSpend}`,
              position: 'right',
              fill: 'red',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default function Dashboard() {
  const [monthlyData, setMonthlyData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [cumulativeData, setCumulativeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetSpend, setTargetSpend] = useState(12000);
  
  // Month navigation state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Function to fetch cumulative data for specific month/year
  const fetchCumulativeData = async (month, year) => {
    try {
      setChartLoading(true);
      const cumulativeSpend = await getCumulativeSpend(month, year);
      
      // Transform cumulative data for the chart
      const chartData = cumulativeSpend.cumulativeValues.map((value, index) => ({
        name: index + 1,
        amount: parseFloat(value)
      }));
      setCumulativeData(chartData);
    } catch (err) {
      console.error('Error fetching cumulative data:', err);
      setError(err.message);
    } finally {
      setChartLoading(false);
    }
  };

  // Navigation function
  const handleNavigateMonth = (direction) => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;
    
    if (direction === 'prev') {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    } else if (direction === 'next') {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }
    
    // Don't navigate to future months beyond current
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    if (newYear > currentYear || (newYear === currentYear && newMonth > currentMonth)) {
      return; // Don't navigate to future
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [monthlyComparison, summaryMonths, maxSpend] = await Promise.all([
          getMonthlySpendComparison(),
          getSummaryMonths(2),
          getMaxSpendValue()
        ]);
        console.log('Fetched max spend value:', maxSpend);
        setMonthlyData(monthlyComparison);
        setSummaryData(summaryMonths);
        setTargetSpend(maxSpend);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch cumulative data when month/year changes
  useEffect(() => {
    if (!loading) { // Only fetch after initial load
      fetchCumulativeData(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, loading]);

  // Fetch initial cumulative data
  useEffect(() => {
    if (!loading && !cumulativeData) {
      fetchCumulativeData(selectedMonth, selectedYear);
    }
  }, [loading]);

  // Poll for target spend changes
  useEffect(() => {
    const pollTargetSpend = async () => {
      try {
        const maxSpend = await getMaxSpendValue();
        if (maxSpend !== targetSpend) {
          console.log('Target spend updated:', maxSpend);
          setTargetSpend(maxSpend);
        }
      } catch (err) {
        console.error('Error polling target spend:', err);
      }
    };

    const interval = setInterval(pollTargetSpend, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [targetSpend]);

  // TODO: Replace with actual data from API
  const mockData = {
    totalBalance: 15000,
    spendingTrend: [
      { name: 'Jan', amount: 2000 },
      { name: 'Feb', amount: 2200 },
      { name: 'Mar', amount: 2500 },
    ],
  };

  // Get the previous month's total spend from summary data
  const previousMonthTotal = summaryData?.[1]?.totalMonthlySpend || 0;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error loading dashboard data: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Current Month Spend"
            value={monthlyData?.currentMonthSpend || '0'}
            icon={<AccountBalance sx={{ fontSize: 40 }} />}
            trend={monthlyData?.comparisonToPriorMonth}
            color="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Last Month Total"
            value={previousMonthTotal}
            icon={<AccountBalance sx={{ fontSize: 40 }} />}
            color="secondary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Total Balance"
            value={mockData.totalBalance}
            icon={<AccountBalance sx={{ fontSize: 40 }} />}
            color="success.main"
            loading={false}
            trend={null}
            subtitle="(To Be Implemented)"
          />
        </Grid>
      </Grid>
      {console.log('Rendering chart with target spend:', targetSpend)}
      <SpendingChart 
        data={cumulativeData} 
        targetSpend={targetSpend}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onNavigateMonth={handleNavigateMonth}
        loading={chartLoading}
      />
    </Box>
  );
} 