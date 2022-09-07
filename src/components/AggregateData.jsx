import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryStack } from 'victory';

export default function Transactions() {

    const [aggregateData, setAggregateData] = useState([]);

    useEffect(() => {
        RestClient.get('/get-summary-months').then((response) => {
            setAggregateData(response.data);
            console.log(aggregateData);
        });
    }, []);


    return (
        <VictoryChart theme={VictoryTheme.material} width={800} domainPadding={10}>
            <VictoryStack colorScale={["tomato", "orange", "gold", "white", "blue"]}>
        {aggregateData.map(vals => <VictoryBar data={vals.categoryValues} x="category" y="value" />)}
        </VictoryStack>
        </VictoryChart>
    )
}