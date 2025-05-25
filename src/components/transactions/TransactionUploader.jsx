import React, { useState, useEffect, useRef } from 'react';
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
  Checkbox,
  Typography,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestClient from '../../rest/CategoryClient';
import { addCategory } from '../../services/finance-service';

export default function TransactionUploader() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(1); // 1 for upload, 2 for review
  const [dryRun, setDryRun] = useState(false);
  const [error, setError] = useState(null);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLoading, setNewCategoryLoading] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState(null);
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Load categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await RestClient.get('/finance/get-categories');
      setCategories(response.data);
      setError(null);
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
    }
  };

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
    if (category === "new_category") {
      setCurrentTransactionIndex(index);
      setNewCategoryDialogOpen(true);
      return;
    }
    const updatedTransactions = [...transactions];
    updatedTransactions[index].userCorrectedCategory = category;
    setTransactions(updatedTransactions);
  };

  const handleNewCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setNewCategoryLoading(true);
      setNewCategoryError(null);
      await addCategory(newCategoryName);
      await fetchCategories();
      
      if (currentTransactionIndex !== null) {
        const updatedTransactions = [...transactions];
        updatedTransactions[currentTransactionIndex].userCorrectedCategory = newCategoryName;
        setTransactions(updatedTransactions);
      }
      
      setNewCategoryName("");
      setNewCategoryDialogOpen(false);
      setCurrentTransactionIndex(null);
    } catch (err) {
      setNewCategoryError('Failed to add category');
      console.error('Error adding category:', err);
    } finally {
      setNewCategoryLoading(false);
    }
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
      transactionBusiness: t.transactionBusiness,
      comment: t.comment,
      essential: false // Default value
    }));

    RestClient.post('/finance/submit-transaction-batch', { 
      transactionJsonList: formattedTransactions,
      dryRun: dryRun 
    })
      .then(response => {
        console.log('Batch submitted:', response.data);
        setTransactions([]);
        setStage(1);
      })
      .catch(error => {
        console.error('Error submitting batch:', error);
        setError('Failed to submit transactions');
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
          predictedCategory: cat.predicted_category,
          confidenceScore: cat.confidence_score
        }));
        setTransactions(categorizedTransactions);
      })
      .catch(error => {
        console.error('Error predicting categories:', error);
        setError('Failed to predict categories');
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Bulk Upload Transactions
      </Typography>
      <Box sx={{ mt: 2 }}>
        {stage === 1 ? (
          <Box>
            <Typography variant="body1" gutterBottom>
              Upload a CSV file with transactions. The file should have the following columns:
              Date (DD/MM/YYYY), Amount, Description
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mt: 2 }}
            >
              Choose CSV File
            </Button>
          </Box>
        ) : (
          <>
            <Button 
              onClick={handlePredictCategories} 
              disabled={isProcessing}
              variant="contained"
              sx={{ mb: 2 }}
            >
              {isProcessing ? <CircularProgress size={24} /> : 'Predict Categories'}
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
                      <TableCell>${transaction.transactionAmount.toFixed(2)}</TableCell>
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
                          <MenuItem value="new_category">
                            <Typography color="primary">+ Add New Category</Typography>
                          </MenuItem>
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
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    color="primary"
                  />
                }
                label="Dry Run (Don't save transactions)"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? <CircularProgress size={24} /> : 'Submit Transactions'}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Dialog open={newCategoryDialogOpen} onClose={() => setNewCategoryDialogOpen(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            error={!!newCategoryError}
            helperText={newCategoryError}
            disabled={newCategoryLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialogOpen(false)} disabled={newCategoryLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleNewCategorySubmit} 
            variant="contained" 
            disabled={newCategoryLoading || !newCategoryName.trim()}
          >
            {newCategoryLoading ? <CircularProgress size={24} /> : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}