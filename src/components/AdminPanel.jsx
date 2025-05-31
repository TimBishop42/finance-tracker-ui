import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import RestClient from '../rest/CategoryClient';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCategoryManagement } from '../hooks/useCategoryManagement';
import { NewCategoryDialog } from './common/NewCategoryDialog';

export default function AdminPanel({ open, onClose }) {
  const [categories, setCategories] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });

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
    loadCategories();
  });

  useEffect(() => {
    if (open) {
    loadCategories();
    }
  }, [open]);

  const loadCategories = () => {
    RestClient.get('/finance/get-categories').then((response) => {
      setCategories(response.data);
    });
  };

  const handleDeleteCategory = (categoryName) => {
    RestClient.post('/finance/delete-category', { categoryName: categoryName })
      .then(() => {
        loadCategories();
        setDeleteDialog({ open: false, category: null });
      })
      .catch(error => {
        console.error('Error deleting category:', error);
      });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Admin Panel
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleNewCategory()}
            sx={{ mb: 2 }}
          >
            Add New Category
          </Button>

          <List>
            {categories.map((category) => (
              <ListItem key={category.categoryName}>
                <ListItemText primary={category.categoryName} />
                <IconButton 
                  onClick={() => setDeleteDialog({ open: true, category: category.categoryName })}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <NewCategoryDialog
        open={newCategoryDialogOpen}
        onClose={() => setNewCategoryDialogOpen(false)}
        categoryName={newCategoryName}
        onCategoryNameChange={(e) => setNewCategoryName(e.target.value)}
        onSubmit={handleNewCategorySubmit}
        loading={newCategoryLoading}
        error={newCategoryError}
      />

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, category: null })}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{deleteDialog.category}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, category: null })}>Cancel</Button>
          <Button onClick={() => handleDeleteCategory(deleteDialog.category)} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
