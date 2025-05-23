import React, { useState } from 'react';
import {
  Grid,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  TextField,
  Paper,
  Typography,
  Box,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useCategories } from '../../context/CategoriesContext';
import RestClient from '../../rest/CategoryClient';
import TransactionList from './TransactionList';

const defaultValues = {
  transactionCategory: "",
  amount: "",
  date: new Date(),
  comments: "",
  essential: false,
};

export default function TransactionForm() {
  const { categories, loading, error } = useCategories();
  const [formValues, setFormValues] = useState(defaultValues);
  const [submitted, setSubmitted] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
    setSubmitted(false);
  };

  const handleDateChange = (date) => {
    setFormValues({
      ...formValues,
      date,
    });
    setSubmitted(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const transactionData = {
      category: formValues.transactionCategory,
      amount: formValues.amount,
      transactionDate: formValues.date.getTime(),
      comment: formValues.comments,
      essential: formValues.essential === "true",
    };

    try {
      await RestClient.post('/finance/submit-transaction', transactionData);
      setSubmitted(true);
      setSubmissionSuccess(true);
      setFormValues(defaultValues);
    } catch (error) {
      setSubmitted(true);
      setSubmissionSuccess(false);
      setSubmissionMessage(error.response?.data || "An error occurred");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">Error loading categories. Please try again later.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Transaction
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <TextField
                  select
                  label="Category"
                  name="transactionCategory"
                  value={formValues.transactionCategory}
                  onChange={handleChange}
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category.categoryName} value={category.categoryName}>
                      {category.categoryName}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                name="amount"
                value={formValues.amount}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={formValues.date}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Comments"
                name="comments"
                value={formValues.comments}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Essential</FormLabel>
                <RadioGroup
                  name="essential"
                  value={formValues.essential}
                  onChange={handleChange}
                  row
                >
                  <FormControlLabel value="true" control={<Radio />} label="Yes" />
                  <FormControlLabel value="false" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
              >
                Submit Transaction
              </Button>
            </Grid>
          </Grid>
        </form>

        {submitted && (
          <Box mt={2}>
            <Typography
              color={submissionSuccess ? "success.main" : "error.main"}
              align="center"
            >
              {submissionSuccess
                ? "Transaction submitted successfully!"
                : `Error: ${submissionMessage}`}
            </Typography>
          </Box>
        )}
      </Paper>

      <TransactionList />
    </Box>
  );
}