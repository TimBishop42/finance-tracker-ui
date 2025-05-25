import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
} from '@mui/material';
import { Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { getAllCategories, deleteCategory, getMaxSpendValue, setMaxSpendValue as updateMaxSpendValue } from '../../services/finance-service';
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

        <NewCategoryDialog
          open={newCategoryDialogOpen}
          onClose={() => setNewCategoryDialogOpen(false)}
          categoryName={newCategoryName}
          onCategoryNameChange={(e) => setNewCategoryName(e.target.value)}
          onSubmit={handleNewCategorySubmit}
          loading={newCategoryLoading}
          error={newCategoryError}
        />
      </DialogContent>
    </Dialog>
  );
} 