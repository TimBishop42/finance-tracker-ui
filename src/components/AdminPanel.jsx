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

export default function AdminPanel({ open, onClose }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

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
    </Dialog>
  );
}
