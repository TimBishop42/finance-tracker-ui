import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect} from 'react';
import TransactionForm from './components/TransactionForm';
import CategoryClient from './rest/CategoryClient';
import TransactionData from './components/TransactionData';
import {Button, IconButton} from '@mui/material';
import Stack from '@mui/material/Stack';
import AdminPanel from './components/AdminPanel';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function App() {
  const [categories, setCategories] = useState([]);
  const [aggregateData, setAggregateData] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    CategoryClient.get('/get-categories').then((response) => {
      setCategories(response.data);
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <IconButton 
          onClick={() => setAdminOpen(true)}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white'
          }}
        >
          <AdminPanelSettingsIcon />
        </IconButton>

        <div className="Forms">
          <TransactionForm categories={categories}/>
        </div>
        <Stack spacing={2} direction="row">
          <Button variant="contained" onClick={() => setAggregateData(false)}>Show All Transactions</Button>
          <Button variant="contained" onClick={() => setAggregateData(true)}>Show Aggregate Data</Button>
        </Stack>
        <div className="transactions">
          <TransactionData aggregateData={aggregateData} categories={categories}/>
        </div>

        <AdminPanel 
          open={adminOpen} 
          onClose={() => setAdminOpen(false)}
        />
      </header>
    </div>
  );
}

export default App;
