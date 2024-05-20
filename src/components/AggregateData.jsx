import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryStack, VictoryGroup, VictoryAxis, VictoryLabel, VictoryZoomContainer } from 'victory';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

export default function Transactions() {

    const [aggregateData, setAggregateData] = useState([]);

    const chartTheme = {
        axis: {
            style: {
                tickLabels: {
                    // this changed the color of my numbers to white
                    fill: 'white',
                },
            },
        },
    };

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
        if (total <= 9000) return 'rgb(0, 255, 0)'; // Green in rgb format
        if (total >= 12000) return 'rgb(255, 0, 0)'; // Red in rgb format
        console.log("Total is: "+total)
      
        // Calculate the gradient color between green and red
        const red = Math.min(255, Math.floor(255 * (total - 9000) / 3000));
        const green = Math.max(0, 255 - red);
        console.log("Colour is: redscale: "+red+" greenscale: "+ green)
        return `rgb(${red}, ${green}, 0)`;
      };
      

    useEffect(() => {
        RestClient.get('/get-summary-months').then((response) => {
            setAggregateData(response.data);
            console.log(aggregateData);
        });
    }, []);

    function getByLabel(val) {
        return val.month + ": " + val.intValue;
    }


    return (
        <Box>
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

      
    <Box mt={4} mb={4} display="flex" justifyContent="center">
        <VictoryChart
            theme={VictoryTheme.material}
            width={1100}
            height={3500}
            domainPadding={20}
            padding = {{ left: 100, right: 150, top: 100, bottom: 100}}
            // containerComponent={<VictoryZoomContainer responsive={true} />}
            >
            <VictoryAxis
                tickLabelComponent={<VictoryLabel dy={0} dx={10} angle={55} />}
                style={{
                    axis: {
                        stroke: 'white'  //CHANGE COLOR OF X-AXIS
                    },
                    tickLabels: {
                        fill: 'white', //CHANGE COLOR OF X-AXIS LABELS
                        fontSize: 20
                    },
                    grid: {
                        stroke: 'white', //CHANGE COLOR OF X-AXIS GRID LINES
                        strokeDasharray: '7',
                    }
                }}
            />
            <VictoryGroup
                horizontal
                offset={25}
                style={{ data: { width: 20 } }}
                colorScale={["blue", "white", "red", "green", "purple"]}>
                {aggregateData.map(vals =>
                    <VictoryBar
                        data={vals.categoryValues}
                        x="category"
                        y="value"
                        labels={({ datum }) => `${getByLabel(datum)}`}
                        style={{
                            // data: { fill: "tomato", opacity: 0.7 },
                            labels: { fontSize: 14, fill: "white" },
                            // parent: { border: "1px solid #ccc" }
                        }}
                    />)}
            </VictoryGroup>
        </VictoryChart>
        </Box>
        </Box>
    )
}