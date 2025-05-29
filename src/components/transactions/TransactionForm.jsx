import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RestClient from '../../rest/CategoryClient';
import DuplicateReviewModal from './DuplicateReviewModal';
import TransactionList from './TransactionList';

export default function TransactionForm({ onTransactionAdded }) {
  const [formData, setFormData] = useState({
    transactionDate: new Date(),
    amount: '',
    businessName: '',
    category: '',
    comment: '',
    essential: false,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [duplicateModal, setDuplicateModal] = useState({
    open: false,
    duplicates: [],
    newTransaction: null
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await RestClient.get('/finance/get-categories');
      setCategories(response.data.map(cat => cat.categoryName));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'essential' ? checked : value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      transactionDate: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    console.log('Form data amount:', formData.amount);
    const payload = {
      ...formData,
      transactionDate: formData.transactionDate.getTime(),
      transactionBusiness: formData.businessName || '',
      duplicateReviewed: false
    };
    console.log('Submitting transaction with payload:', payload);

    try {
      const response = await RestClient.post('/finance/submit-transaction', payload);
      console.log('API response:', response.data);

      if (response.data.hasDuplicates) {
        console.log('Duplicates found:', response.data.duplicates);
        setDuplicateModal({
          open: true,
          duplicates: response.data.duplicates
        });
        return;
      }

      setSuccess(true);
      setFormData({
        transactionDate: new Date(),
        amount: '',
        businessName: '',
        category: '',
        comment: '',
        essential: false,
      });
      if (onTransactionAdded) {
        onTransactionAdded();
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Failed to save transaction. Please try again.');
    }
  };

  const handleDuplicateConfirm = async (transactionsToSave) => {
    setDuplicateModal(prev => ({ ...prev, open: false }));
    try {
      const transaction = transactionsToSave[0];
      console.log('Transaction from modal:', transaction);
      console.log('Amount from modal:', transaction.amount);
      
      const payload = {
        ...transaction,
        transactionDate: transaction.transactionDateTime,
        transactionBusiness: transaction.businessName || '',
        duplicateReviewed: true
      };
      console.log('Payload to API:', payload);

      const response = await RestClient.post('/finance/submit-transaction', payload);
      console.log('Final API response:', response.data);

      if (response.data) {
        setSuccess(true);
        setFormData({
          transactionDate: new Date(),
          amount: '',
          businessName: '',
          category: '',
          comment: '',
          essential: false,
        });
        if (onTransactionAdded) {
          onTransactionAdded();
        }
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Failed to save transaction. Please try again.');
    }
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Transaction
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Transaction Date"
              value={formData.transactionDate}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            label="Amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Business Name"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              label="Category"
              required
            >
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Comments"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                name="essential"
                checked={formData.essential}
                onChange={handleChange}
              />
            }
            label="Essential Expense"
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Transaction added successfully!
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Add Transaction
          </Button>
        </Box>

        <DuplicateReviewModal
          open={duplicateModal.open}
          onClose={() => setDuplicateModal(prev => ({ ...prev, open: false }))}
          duplicates={duplicateModal.duplicates}
          newTransaction={duplicateModal.newTransaction}
          onConfirm={handleDuplicateConfirm}
        />
      </Paper>

      <TransactionList />
    </>
  );
}