import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import RestClient from '../rest/CategoryClient';

export default function TransactionUploader({ open, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(1); // 1 for upload, 2 for review
  const [dryRun, setDryRun] = useState(false);

  // Load categories when component mounts
  React.useEffect(() => {
    RestClient.get('/finance/get-categories')
      .then(response => setCategories(response.data))
      .catch(error => console.error('Error loading categories:', error));
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n')
          .filter(row => row.trim()) // Skip empty lines
          .map(row => {
            const columns = row.split(',');
            // Take only first 3 columns, ignore the rest
            const [date, amount, description] = columns;
            return {
              transactionDate: new Date(date.trim().split('/').reverse().join('-')).toISOString(), // Convert DD/MM/YYYY to ISO
              transactionAmount: Math.abs(parseFloat(amount.replace(/"/g, ''))), // Remove quotes and convert
              transactionBusiness: description.trim()
            };
          });
        setTransactions(rows);
        setStage(2); // Move to review stage
      };
      reader.readAsText(file);
    }
  };

  const handleCategoryChange = (index, category) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index].userCorrectedCategory = category;
    setTransactions(updatedTransactions);
  };

  const handleCommentChange = (index, comment) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index].comment = comment;
    setTransactions(updatedTransactions);
  };

  const handleExcludeTransaction = (index) => {
    const updatedTransactions = [...transactions];
    updatedTransactions.splice(index, 1);
    setTransactions(updatedTransactions);
  };

  const handleSubmit = () => {
    setIsProcessing(true);
    const formattedTransactions = transactions.map(t => ({
      predictedCategory: t.predictedCategory,
      userCorrectedCategory: t.userCorrectedCategory,
      amount: t.transactionAmount,
      transactionDate: new Date(t.transactionDate).getTime(),
      comment: t.comment,
      essential: false // Default value
    }));

    RestClient.post('/finance/submit-transaction-batch', { 
      transactionJsonList: formattedTransactions,
      dryRun: dryRun 
    })
      .then(response => {
        console.log('Batch submitted:', response.data);
        onClose();
      })
      .catch(error => {
        console.error('Error submitting batch:', error);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handlePredictCategories = () => {
    setIsProcessing(true);
    RestClient.post('/transactions/predict-batch', transactions)
      .then(response => {
        const categorizedTransactions = response.data.map((cat, index) => ({
          ...transactions[index],
          predictedCategory: cat.predictedCategory,
          confidenceScore: cat.confidenceScore
        }));
        setTransactions(categorizedTransactions);
      })
      .catch(error => {
        console.error('Error predicting categories:', error);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Upload Transactions
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {stage === 1 ? (
            <input
              accept=".csv"
              type="file"
              onChange={handleFileUpload}
              style={{ marginBottom: '20px' }}
            />
          ) : (
            <>
              <Button onClick={handlePredictCategories} disabled={isProcessing}>
                Predict Categories
              </Button>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Predicted Category</TableCell>
                      <TableCell>User Corrected Category</TableCell>
                      <TableCell>Comment</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.transactionAmount}</TableCell>
                        <TableCell>{transaction.transactionBusiness}</TableCell>
                        <TableCell>{transaction.predictedCategory}</TableCell>
                        <TableCell>
                          <Select
                            value={transaction.userCorrectedCategory || ''}
                            onChange={(e) => handleCategoryChange(index, e.target.value)}
                            fullWidth
                          >
                            {categories.map((cat) => (
                              <MenuItem key={cat.categoryName} value={cat.categoryName}>
                                {cat.categoryName}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={transaction.comment || ''}
                            onChange={(e) => handleCommentChange(index, e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            onClick={() => handleExcludeTransaction(index)}
                            color="error"
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
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {stage === 2 && (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  color="primary"
                />
              }
              label="Dry Run"
            />
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={isProcessing || transactions.some(t => !t.userCorrectedCategory && !t.predictedCategory)}
            >
              Submit Batch
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}