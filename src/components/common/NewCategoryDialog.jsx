import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress
} from '@mui/material';

export const NewCategoryDialog = ({
  open,
  onClose,
  categoryName,
  onCategoryNameChange,
  onSubmit,
  loading,
  error
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Add New Category</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        margin="dense"
        label="Category Name"
        fullWidth
        value={categoryName}
        onChange={onCategoryNameChange}
        error={!!error}
        helperText={error}
        disabled={loading}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button 
        onClick={onSubmit} 
        variant="contained" 
        disabled={loading || !categoryName.trim()}
      >
        {loading ? <CircularProgress size={24} /> : 'Add Category'}
      </Button>
    </DialogActions>
  </Dialog>
); 