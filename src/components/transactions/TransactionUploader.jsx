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
  Typography,
  CircularProgress,
  FormControl,
  InputLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestClient from '../../rest/CategoryClient';
import { addCategory } from '../../services/finance-service';
import DuplicateReviewModal from './DuplicateReviewModal';

export default function TransactionUploader() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(1); // 1 for upload, 2 for review
  const [error, setError] = useState(null);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLoading, setNewCategoryLoading] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState(null);
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(null);
  const fileInputRef = useRef(null);
  const [duplicateModal, setDuplicateModal] = useState({
    open: false,
    duplicates: null
  });
  const [columnMapping, setColumnMapping] = useState({
    date: 0,
    amount: 1,
    business: 2
  });
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [rawCsvData, setRawCsvData] = useState(null);
  const MAX_TRANSACTIONS = 1000;

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
        const rows = text.split('\n').filter(row => row.trim());
        
        if (rows.length > MAX_TRANSACTIONS + 1) { // +1 for header
          setError(`File contains too many transactions. Maximum allowed is ${MAX_TRANSACTIONS}.`);
          return;
        }

        const headers = rows[0].split(/[,\t]/).map(h => h.trim());
        setCsvHeaders(headers);
        setRawCsvData(rows);
        setColumnMappingOpen(true);
      };
      reader.readAsText(file);
    }
  };

  const handleColumnMappingConfirm = () => {
    if (!rawCsvData) return;

    try {
      console.log('Processing CSV data:', rawCsvData);
      const rows = rawCsvData.slice(1); // Skip header row
      console.log('Processing rows:', rows);
      
      const formattedTransactions = rows
        .map(row => {
          try {
            const columns = row.split(/[,\t]/).map(col => col.trim());
            const date = columns[columnMapping.date];
            const amount = columns[columnMapping.amount];
            const business = columns[columnMapping.business];
            
            // Skip row if any required field is empty
            if (!date || !amount || !business) {
              return null;
            }

            // Try to parse the date and amount
            try {
              // Parse DD/MM/YYYY format
              const [day, month, year] = date.split('/').map(num => parseInt(num, 10));
              const parsedDate = new Date(year, month - 1, day); // month is 0-based in JS Date
              const parsedAmount = Math.abs(parseFloat(amount.replace(/"/g, '')));
              
              // Skip if date or amount is invalid
              if (isNaN(parsedDate.getTime()) || isNaN(parsedAmount)) {
                return null;
              }

              return {
                transactionDate: parsedDate.toISOString(),
                transactionAmount: parsedAmount,
                transactionBusiness: business
              };
            } catch (parseError) {
              console.warn('Failed to parse date or amount:', { date, amount });
              return null;
            }
          } catch (rowError) {
            console.warn('Error processing row:', row);
            return null;
          }
        })
        .filter(t => t !== null); // Remove any failed rows

      console.log('Formatted transactions:', formattedTransactions);
      
      if (formattedTransactions.length === 0) {
        setError('No valid transactions found in the file');
        setColumnMappingOpen(false);
        return;
      }

      setTransactions(formattedTransactions);
      setStage(2);
      setColumnMappingOpen(false);
    } catch (error) {
      console.error('Error processing CSV:', error);
      setError('Error processing CSV file. Please check the format and try again.');
      setColumnMappingOpen(false);
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
      userCorrectedCategory: t.userCorrectedCategory || t.predictedCategory,
      amount: t.transactionAmount.toString(),
      transactionDate: new Date(t.transactionDate).getTime(),
      transactionBusiness: t.transactionBusiness || '',
      comment: t.comment || '',
      essential: false,
      duplicateReviewed: false
    }));

    RestClient.post('/finance/submit-transaction-batch', { 
      transactionJsonList: formattedTransactions,
      dryRun: false 
    })
      .then(response => {
        console.log('Batch response:', response.data);
        // Handle array response
        const responseData = Array.isArray(response.data) ? response.data[0] : response.data;
        console.log('Processed response:', responseData);
        
        if (responseData.hasDuplicates) {
          console.log('Setting duplicate modal with:', responseData.duplicates);
          setDuplicateModal({
            open: true,
            duplicates: responseData.duplicates
          });
        } else {
          console.log('Batch submitted:', responseData);
          setTransactions([]);
          setStage(1);
        }
      })
      .catch(error => {
        console.error('Error submitting batch:', error);
        setError('Failed to submit transactions');
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleDuplicateConfirm = async (transactionsToSave) => {
    setDuplicateModal(prev => ({ ...prev, open: false }));
    try {
      console.log('Raw transactions from modal:', transactionsToSave);
      const formattedTransactions = transactionsToSave.map(t => {
        console.log('Raw transaction:', t);
        // The transaction is directly in the object, not in newTransaction
        return {
          userCorrectedCategory: t.category,
          amount: t.amount.toString(),
          transactionDate: t.transactionDateTime,
          transactionBusiness: t.businessName || '',
          comment: t.comment || '',
          essential: t.essential || false,
          duplicateReviewed: true
        };
      });
      console.log('Formatted transactions:', formattedTransactions);

      const response = await RestClient.post('/finance/submit-transaction-batch', {
        transactionJsonList: formattedTransactions,
        dryRun: false
      });
      if (response.data) {
        setTransactions([]);
        setStage(1);
      }
    } catch (err) {
      console.error('Error saving transactions:', err);
      setError('Failed to save transactions. Please try again.');
    }
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

      <Dialog open={columnMappingOpen} onClose={() => setColumnMappingOpen(false)}>
        <DialogTitle>Map CSV Columns</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">Available Columns:</Typography>
            <Typography variant="body2" color="text.secondary">
              {csvHeaders.join(', ')}
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Date Column</InputLabel>
              <Select
                value={columnMapping.date}
                onChange={(e) => setColumnMapping(prev => ({ ...prev, date: e.target.value }))}
                label="Date Column"
              >
                {csvHeaders.map((header, index) => (
                  <MenuItem key={`date-${index}`} value={index}>{header}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Amount Column</InputLabel>
              <Select
                value={columnMapping.amount}
                onChange={(e) => setColumnMapping(prev => ({ ...prev, amount: e.target.value }))}
                label="Amount Column"
              >
                {csvHeaders.map((header, index) => (
                  <MenuItem key={`amount-${index}`} value={index}>{header}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Business Name Column</InputLabel>
              <Select
                value={columnMapping.business}
                onChange={(e) => setColumnMapping(prev => ({ ...prev, business: e.target.value }))}
                label="Business Name Column"
              >
                {csvHeaders.map((header, index) => (
                  <MenuItem key={`business-${index}`} value={index}>{header}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnMappingOpen(false)}>Cancel</Button>
          <Button onClick={handleColumnMappingConfirm} variant="contained">
            Confirm Mapping
          </Button>
        </DialogActions>
      </Dialog>

      <DuplicateReviewModal
        open={duplicateModal.open}
        onClose={() => setDuplicateModal(prev => ({ ...prev, open: false }))}
        duplicates={duplicateModal.duplicates}
        onConfirm={handleDuplicateConfirm}
      />
    </Paper>
  );
}