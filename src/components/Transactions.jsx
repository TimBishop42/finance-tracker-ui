import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import { Box, TableHead, TableRow, Button, Select, MenuItem, FormControl, InputLabel, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function Transactions(props) {

    const [transactions, setTransactions] = useState([]);
    const [recentMonthOnly, setRecentMonthOnly] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [commentFilter, setCommentFilter] = useState('');
    const [deleteDialog, setDeleteDialog] = useState({ open: false, transactionId: null });

    useEffect(() => {
        const endpoint = `/finance/find-all-transactions?recentMonth=${recentMonthOnly}`;
        RestClient.get(endpoint).then((response) => {
            setTransactions([].concat(response.data).sort((a, b) => a.transactionDateTime > b.transactionDateTime ? -1 : 1));
        });
    }, [recentMonthOnly]);

    const handleButtonClick = () => {
        setRecentMonthOnly(!recentMonthOnly);
      };

      const handleCategoryFilterChange = (event) => {
        setCategoryFilter(event.target.value);
      };

      const handleCommentFilterChange = (event) => {
        setCommentFilter(event.target.value);
      };

      const handleDeleteClick = (transactionId) => {
        setDeleteDialog({ open: true, transactionId });
    };

    const handleDeleteConfirm = () => {
        RestClient.post('/finance/delete-transaction', { transactionId: deleteDialog.transactionId })
            .then(() => {
                // Refresh the transactions list
                const endpoint = `/find-all-transactions?recentMonth=${recentMonthOnly}`;
                RestClient.get(endpoint).then((response) => {
                    setTransactions([].concat(response.data).sort((a, b) => a.transactionDateTime > b.transactionDateTime ? -1 : 1));
                });
                setDeleteDialog({ open: false, transactionId: null });
            })
            .catch(error => {
                console.error('Error deleting transaction:', error);
            });
    };

    const filteredTransactions = transactions.filter((transaction) => {
        const matchesCategory = categoryFilter === '' || transaction.category === categoryFilter;
        const matchesComment = commentFilter === '' || 
            (transaction.comment && transaction.comment.toLowerCase().includes(commentFilter.toLowerCase()));
        return matchesCategory && matchesComment;
    });

    return (
        <Paper>
           <Box 
      display="flex" 
      flexDirection="column" 
      gap={2}  // Use gap for spacing between children (this is in the theme's spacing unit, e.g., 8px)
    >
            <Button variant="contained" onClick={handleButtonClick}>
        {recentMonthOnly ? 'Show Recent Year Transactions' : 'Show Recent Month Transactions'}
      </Button>
      <FormControl variant="outlined" style={{ marginBottom: '1rem', minWidth: 200 }}>
        <InputLabel id="category-label">Category</InputLabel>
        <Select
          labelId="category-label"
          value={categoryFilter}
          onChange={handleCategoryFilterChange}
          label="Category"
        >
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          {props.categories.map((category) => (
            <MenuItem key={category.categoryName} value={category.categoryName}>
              {category.categoryName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Search Comments"
        variant="outlined"
        value={commentFilter}
        onChange={handleCommentFilterChange}
        style={{ marginBottom: '1rem' }}
      />
      </Box>
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Transaction Category</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Comment</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredTransactions.map((row) => (
                        <TableRow
                            key={row.transactionId}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell>{row.category}</TableCell>
                            <TableCell>{row.amount}</TableCell>
                            <TableCell>{row.transactionDate}</TableCell>
                            <TableCell>{row.comment}</TableCell>
                            <TableCell>
                                <IconButton 
                                    onClick={() => handleDeleteClick(row.transactionId)}
                                    color="error"
                                    size="small"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>

        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, transactionId: null })}>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogContent>
                Are you sure you want to delete this transaction?
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteDialog({ open: false, transactionId: null })}>Cancel</Button>
                <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
            </DialogActions>
        </Dialog>
        </Paper>
    )
}