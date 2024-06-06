import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect} from 'react';
import TransactionForm from './components/TransactionForm';
import CategoryClient from './rest/CategoryClient';
import TransactionData from './components/TransactionData';
import {Button} from '@mui/material';
import Stack from '@mui/material/Stack';



function App() {

  const [categories, setCategories] = useState([]);

  const [aggregateData, setAggregateData] = useState()

  useEffect(() => {
    CategoryClient.get('/get-categories').then((response) => {
      setCategories(response.data);
    });
 }, []);


  return (
    <div className="App">
      <header className="App-header">
        <div class="Forms">
          <TransactionForm categories={categories}/>
        </div>
        <Stack spacing={2} direction="row">
        <Button variant="contained" onClick= {() => setAggregateData(false)} >Show All Transactions</Button>
        <Button variant="contained" onClick= {() => setAggregateData(true)}>Show Aggregate Data</Button>
        </Stack>
        <div class="transactions">
        <TransactionData aggregateData={aggregateData} categories={categories}/>
        </div>
      </header>
    </div>
  );
}

export default App;
