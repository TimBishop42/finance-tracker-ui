import React, { createContext, useState, useContext, useEffect } from 'react';
import RestClient from '../rest/CategoryClient';

const CategoriesContext = createContext();

// Mock data for development
const mockCategories = [
  { categoryName: 'Groceries' },
  { categoryName: 'Transportation' },
  { categoryName: 'Utilities' },
  { categoryName: 'Entertainment' },
  { categoryName: 'Dining Out' },
  { categoryName: 'Shopping' },
  { categoryName: 'Healthcare' },
  { categoryName: 'Housing' },
];

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState(mockCategories); // Initialize with mock data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await RestClient.get('/finance/get-categories');
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
      setLoading(false);
    } catch (err) {
      console.warn('Failed to fetch categories, using mock data:', err);
      // Keep using mock data, don't set error
      setLoading(false);
    }
  };

  return (
    <CategoriesContext.Provider value={{ categories, loading, error, refetch: fetchCategories }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
} 