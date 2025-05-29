import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import RestClient from '../../rest/CategoryClient';

export default function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentMonthOnly, setRecentMonthOnly] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, transactionId: null });
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [recentMonthOnly]);

  const fetchTransactions = async () => {
    try {
      const response = await RestClient.get(`/finance/find-all-transactions?recentMonth=${recentMonthOnly}`);
      console.log('Transaction response:', response.data);
      setTransactions(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err);
      setLoading(false);
    }
  };

  const handleToggleChange = (event) => {
    setRecentMonthOnly(event.target.checked);
  };

  const handleDeleteClick = (transactionId) => {
    console.log('Transaction to delete:', transactionId);
    setDeleteDialog({ open: true, transactionId });
  };

  const handleDeleteConfirm = async () => {
    try {
      console.log('Dialog state:', deleteDialog);
      const payload = JSON.stringify({
        transactionId: deleteDialog.transactionId
      });
      console.log('Delete payload:', payload);
      const response = await RestClient.post('/finance/delete-transaction', payload);
      console.log('Delete response:', response);
      setDeleteDialog({ open: false, transactionId: null });
      fetchTransactions(); // Refresh the list
    } catch (err) {
      console.error('Error deleting transaction:', err);
      // You might want to show an error message to the user here
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, transactionId: null });
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const filteredTransactions = transactions
    .filter(transaction => selectedCategory === 'all' || transaction.category === selectedCategory);

  const categories = ['all', ...new Set(transactions.map(t => t.category))].sort();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">Error loading transactions. Please try again later.</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
          Recent Transactions
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Category"
            >
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={recentMonthOnly}
                onChange={handleToggleChange}
                color="primary"
              />
            }
            label="Recent Month Only"
          />
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Comments</TableCell>
              <TableCell>Essential</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.transactionId}>
                <TableCell>
                  {transaction.transactionDate}
                </TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell align="right">
                  ${parseFloat(transaction.amount).toFixed(2)}
                </TableCell>
                <TableCell>{transaction.comment}</TableCell>
                <TableCell>{transaction.essential ? 'Yes' : 'No'}</TableCell>
                <TableCell align="center">
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteClick(transaction.transactionId)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
} 