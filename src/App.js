import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import TransactionForm from './components/transactions/TransactionForm';
import TransactionUploader from './components/transactions/TransactionUploader';
import AggregateData from './components/dashboard/AggregateData';
import { CategoriesProvider } from './context/CategoriesContext';

function App() {
  const [mode, setMode] = useState('light');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
      }),
    [mode],
  );

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CategoriesProvider>
        <Router>
          <Layout onToggleColorMode={toggleColorMode} mode={mode}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-transaction" element={<TransactionForm />} />
              <Route path="/bulk-upload" element={<TransactionUploader />} />
              <Route path="/summary" element={<AggregateData />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>
        </Router>
      </CategoriesProvider>
    </ThemeProvider>
  );
}

export default App;
