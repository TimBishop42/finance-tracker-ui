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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TransactionUploader from './components/TransactionUploader';
import {Box} from '@mui/material';

function App() {
  const [categories, setCategories] = useState([]);
  const [aggregateData, setAggregateData] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    CategoryClient.get('/finance/get-categories').then((response) => {
      setCategories(response.data);
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={() => setUploadOpen(true)}
            sx={{ color: 'white' }}
          >
            <UploadFileIcon />
          </IconButton>
          <IconButton 
            onClick={() => setAdminOpen(true)}
            sx={{ color: 'white' }}
          >
            <AdminPanelSettingsIcon />
          </IconButton>
        </Box>

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
        <TransactionUploader
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
        />
      </header>
    </div>
  );
}

export default App;
