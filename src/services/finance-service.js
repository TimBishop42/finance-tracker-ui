export const getMonthlySpendComparison = async () => {
  try {
    const response = await fetch('/api/finance/monthly-spend-comparison');
    if (!response.ok) {
      throw new Error('Failed to fetch monthly spend comparison');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching monthly spend comparison:', error);
    throw error;
  }
};

export const getCumulativeSpend = async () => {
  try {
    const response = await fetch('/api/finance/get-cumulative-spend');
    if (!response.ok) {
      throw new Error('Failed to fetch cumulative spend data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching cumulative spend data:', error);
    throw error;
  }
};

export const getSummaryMonths = async (months = 2) => {
  try {
    const response = await fetch(`/api/finance/get-summary-months?months=${months}`);
    if (!response.ok) {
      throw new Error('Failed to fetch summary months');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching summary months:', error);
    throw error;
  }
};

export const getAllCategories = async () => {
  try {
    const response = await fetch('/api/finance/get-categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const addCategory = async (categoryName) => {
  try {
    const response = await fetch('/api/finance/add-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryName }),
    });
    if (!response.ok) {
      throw new Error('Failed to add category');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryName) => {
  try {
    const response = await fetch('/api/finance/delete-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categoryName }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete category');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const getMaxSpendValue = async () => {
  try {
    const response = await fetch('/api/finance/get-max-spend-value');
    if (!response.ok) {
      throw new Error('Failed to fetch max spend value');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching max spend value:', error);
    throw error;
  }
};

export const setMaxSpendValue = async (value) => {
  try {
    const response = await fetch('/api/finance/set-max-spend-value', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });
    if (!response.ok) {
      throw new Error('Failed to set max spend value');
    }
  } catch (error) {
    console.error('Error setting max spend value:', error);
    throw error;
  }
};

export const trainModel = async () => {
  try {
    const response = await fetch('/api/finance/train-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to train model');
    }
    return await response.json();
  } catch (error) {
    console.error('Error training model:', error);
    throw error;
  }
}; 