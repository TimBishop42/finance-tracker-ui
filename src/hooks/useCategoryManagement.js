import { useState } from 'react';
import { addCategory } from '../services/finance-service';

export const useCategoryManagement = (onCategoryAdded) => {
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLoading, setNewCategoryLoading] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);

  const handleNewCategory = (index = null) => {
    setCurrentItemIndex(index);
    setNewCategoryDialogOpen(true);
  };

  const handleNewCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setNewCategoryLoading(true);
      setNewCategoryError(null);
      await addCategory(newCategoryName);
      
      if (onCategoryAdded) {
        onCategoryAdded(newCategoryName, currentItemIndex);
      }
      
      setNewCategoryName("");
      setNewCategoryDialogOpen(false);
      setCurrentItemIndex(null);
    } catch (err) {
      setNewCategoryError('Failed to add category');
      console.error('Error adding category:', err);
    } finally {
      setNewCategoryLoading(false);
    }
  };

  return {
    newCategoryDialogOpen,
    setNewCategoryDialogOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryLoading,
    newCategoryError,
    handleNewCategory,
    handleNewCategorySubmit
  };
}; 