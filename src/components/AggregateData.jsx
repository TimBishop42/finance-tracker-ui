import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { Slider, Typography } from '@mui/material';

export default function Transactions() {
    const [aggregateData, setAggregateData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [monthRange, setMonthRange] = useState(12); // Default to 12 months

    const TotalBox = styled(Box)(({ theme, bgcolor }) => ({
        padding: theme.spacing(2),
        margin: theme.spacing(1),
        textAlign: 'center',
        color: theme.palette.getContrastText(bgcolor),
        backgroundColor: bgcolor,
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[1],
        minWidth: '150px',
    }));

    const getColor = (total) => {
        if (total <= 9000) return 'rgb(0, 255, 0)';
        if (total >= 12000) return 'rgb(255, 0, 0)';
        const red = Math.min(255, Math.floor(255 * (total - 9000) / 3000));
        const green = Math.max(0, 255 - red);
        return `rgb(${red}, ${green}, 0)`;
    };

    useEffect(() => {
        RestClient.get(`/finance/get-summary-months?months=${monthRange}`).then((response) => {
            setAggregateData(response.data);
            // Transform data to group by category instead of month
            const categories = response.data[0]?.categoryValues?.map(cat => cat.category) || [];
            const transformedData = categories.map(category => {
                const categoryObj = { category };
                response.data.forEach(monthData => {
                    const monthValue = monthData.categoryValues.find(cat => cat.category === category);
                    categoryObj[monthData.month] = monthValue ? monthValue.value : 0;
                });
                return categoryObj;
            });
            setChartData(transformedData);
        });
    }, [monthRange]); // Re-fetch when monthRange changes

    // Get months for the bars
    const months = aggregateData.map(data => data.month) || [];

    return (
        <Box>
            <Box sx={{ width: 300, mx: 'auto', mt: 4 }}>
                <Typography id="month-range-slider" gutterBottom>
                    Number of Months to Display
                </Typography>
                <Slider
                    value={monthRange}
                    onChange={(_, newValue) => setMonthRange(newValue)}
                    aria-labelledby="month-range-slider"
                    valueLabelDisplay="auto"
                    step={1}
                    marks
                    min={1}
                    max={12}
                />
            </Box>

            <Box
                display="flex"
                justifyContent="center"
                flexWrap="wrap"
                gap={2}
                sx={{ marginTop: 4 }}
            >
                {aggregateData.map((item, index) => (
                    <TotalBox key={index} bgcolor={getColor(item.totalMonthlySpend)}>
                        {item.month}: {item.totalMonthlySpend}
                    </TotalBox>
                ))}
            </Box>

            <Box mt={4} mb={4} sx={{ height: '800px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 150, bottom: 100 }}
                        layout="vertical"
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                            dataKey="category" 
                            type="category" 
                            width={150}
                            tick={{ fill: 'white' }}
                        />
                        <Tooltip />
                        <Legend />
                        {months.map((month, index) => (
                            <Bar 
                                key={month}
                                dataKey={month}
                                fill={["blue", "red", "green", "purple"][index % 5]}
                                barSize={30}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}