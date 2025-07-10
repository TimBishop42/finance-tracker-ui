import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { getAllCategories, deleteCategory, getMaxSpendValue, setMaxSpendValue as updateMaxSpendValue, trainModel } from '../../services/finance-service';
import { useCategoryManagement } from '../../hooks/useCategoryManagement';
import { NewCategoryDialog } from '../common/NewCategoryDialog';

export default function SettingsDialog({ open, onClose }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maxSpendValue, setMaxSpendValue] = useState(12000);
  const [maxSpendInput, setMaxSpendInput] = useState('12000');
  const [maxSpendLoading, setMaxSpendLoading] = useState(false);
  const [maxSpendError, setMaxSpendError] = useState(null);
  const [trainDialog, setTrainDialog] = useState({ open: false, loading: false, error: null, result: null });

  const {
    newCategoryDialogOpen,
    setNewCategoryDialogOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryLoading,
    newCategoryError,
    handleNewCategory,
    handleNewCategorySubmit
  } = useCategoryManagement((newCategory) => {
    fetchCategories();
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchMaxSpendValue();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getAllCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      console.error('Error in fetchCategories:', err);
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaxSpendValue = async () => {
    try {
      setMaxSpendLoading(true);
      const value = await getMaxSpendValue();
      setMaxSpendValue(value);
      setMaxSpendInput(value.toString());
      setMaxSpendError(null);
    } catch (err) {
      console.error('Error fetching max spend value:', err);
      setMaxSpendError('Failed to load max spend value');
    } finally {
      setMaxSpendLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    try {
      setLoading(true);
      await deleteCategory(categoryName);
      await fetchCategories();
      setError(null);
    } catch (err) {
      console.error('Error in handleDeleteCategory:', err);
      setError('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxSpendInputChange = (event) => {
    const value = event.target.value;
    // Allow empty input for better UX
    if (value === '') {
      setMaxSpendInput('');
      return;
    }
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setMaxSpendInput(value);
    }
  };

  const handleMaxSpendSave = async () => {
    console.log('Save button clicked');
    const value = parseInt(maxSpendInput);
    console.log('Parsed value:', value);
    if (isNaN(value) || value <= 0) {
      setMaxSpendError('Please enter a valid number greater than 0');
      return;
    }

    try {
      console.log('Calling updateMaxSpendValue with:', value);
      setMaxSpendLoading(true);
      await updateMaxSpendValue(value);
      console.log('updateMaxSpendValue completed successfully');
      setMaxSpendValue(value);
      setMaxSpendError(null);
    } catch (err) {
      console.error('Error setting max spend value:', err);
      setMaxSpendError('Failed to save max spend value');
    } finally {
      setMaxSpendLoading(false);
    }
  };

  const handleTrainModel = () => {
    setTrainDialog({ open: true, loading: false, error: null, result: null });
  };

  const handleTrainModelConfirm = async () => {
    setTrainDialog(prev => ({ ...prev, loading: true, error: null, result: null }));
    
    try {
      const result = await trainModel();
      setTrainDialog(prev => ({ 
        ...prev, 
        loading: false, 
        result: result,
        error: null 
      }));
    } catch (error) {
      setTrainDialog(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message,
        result: null 
      }));
    }
  };

  const handleCloseTrainDialog = () => {
    setTrainDialog({ open: false, loading: false, error: null, result: null });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        {loading && (
          <Typography sx={{ mb: 2 }}>Loading...</Typography>
        )}
        
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="categories-content"
            id="categories-header"
          >
            <Typography>Categories</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => handleNewCategory()}
                disabled={loading}
                fullWidth
              >
                Add New Category
              </Button>
            </Box>

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <List>
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <ListItem key={category.categoryName}>
                    <ListItemText primary={category.categoryName} />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteCategory(category.categoryName)}
                        disabled={loading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              ) : (
                <Typography color="text.secondary">
                  No categories found
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="spending-limits-content"
            id="spending-limits-header"
          >
            <Typography>Spending Limits</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Monthly Spend Target
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Set the target total spend for the month
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="Maximum Spend Value"
                  value={maxSpendInput}
                  onChange={handleMaxSpendInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  fullWidth
                  sx={{ mt: 1 }}
                  disabled={maxSpendLoading}
                  error={!!maxSpendError}
                  helperText={maxSpendError}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleMaxSpendSave();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleMaxSpendSave}
                  disabled={maxSpendLoading || maxSpendInput === maxSpendValue.toString()}
                  sx={{ mt: 1 }}
                >
                  {maxSpendLoading ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="model-training-content"
            id="model-training-header"
          >
            <Typography>Model Training</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Machine Learning Model
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Retrain the model with current transaction data to improve category prediction accuracy.
              </Typography>
              <Button
                variant="contained"
                color="warning"
                onClick={handleTrainModel}
                fullWidth
                sx={{ mt: 2 }}
              >
                Train Model
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        <NewCategoryDialog
          open={newCategoryDialogOpen}
          onClose={() => setNewCategoryDialogOpen(false)}
          categoryName={newCategoryName}
          onCategoryNameChange={(e) => setNewCategoryName(e.target.value)}
          onSubmit={handleNewCategorySubmit}
          loading={newCategoryLoading}
          error={newCategoryError}
        />

        <Dialog open={trainDialog.open} onClose={handleCloseTrainDialog}>
          <DialogTitle>Train Model</DialogTitle>
          <DialogContent>
            {trainDialog.loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CircularProgress size={24} />
                <Typography>Training model... This may take several minutes.</Typography>
              </Box>
            )}
            
            {trainDialog.error && (
              <Typography color="error" sx={{ mb: 2 }}>
                Error: {trainDialog.error}
              </Typography>
            )}
            
            {trainDialog.result && (
              <Typography color="success.main" sx={{ mb: 2 }}>
                Model training completed successfully! Trained on {trainDialog.result.transactionCount} transactions.
              </Typography>
            )}
            
            {!trainDialog.loading && !trainDialog.error && !trainDialog.result && (
              <Typography>
                Are you sure you want to retrain the ML model? This will use all available transaction data and may take several minutes to complete.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTrainDialog} disabled={trainDialog.loading}>
              {trainDialog.result || trainDialog.error ? 'Close' : 'Cancel'}
            </Button>
            {!trainDialog.loading && !trainDialog.error && !trainDialog.result && (
              <Button onClick={handleTrainModelConfirm} color="warning" variant="contained">
                Train Model
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 