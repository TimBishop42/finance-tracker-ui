import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import RestClient from '../rest/CategoryClient';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AdminPanel({ open, onClose }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    RestClient.get('/get-categories').then((response) => {
      setCategories(response.data);
    });
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      RestClient.post('/add-category', newCategory.trim())
        .then(() => {
          loadCategories();
          setNewCategory('');
          setOpenDialog(false);
        })
        .catch(error => {
          console.error('Error saving category:', error);
        });
    }
  };

  const handleDeleteCategory = (categoryName) => {
    RestClient.post('/delete-category', { categoryName: categoryName })
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
            onClick={() => setOpenDialog(true)}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

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
