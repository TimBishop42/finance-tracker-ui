import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryStack, VictoryGroup, VictoryAxis, VictoryLabel } from 'victory';
import { getByLabelText } from '@testing-library/react';

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

    useEffect(() => {
        RestClient.get('/get-summary-months').then((response) => {
            setAggregateData(response.data);
            console.log(aggregateData);
        });
    }, []);

    function getByLabel(val) {
        return val.month +": " + val.value;
    }


    return (
        <VictoryChart theme={VictoryTheme.material} width={1100} height={2000} domainPadding={20}>
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
    )
}