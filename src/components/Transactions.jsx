import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import { TableHead, TableRow, Button, Select, MenuItem, FormControl, InputLabel  } from '@mui/material';

export default function Transactions(props) {

    const [transactions, setTransactions] = useState([]);
    const [recentMonthOnly, setRecentMonthOnly] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');

    useEffect(() => {
        const endpoint = `/find-all-transactions?recentMonth=${recentMonthOnly}`;
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

      const filteredTransactions = transactions.filter((transaction) =>
      categoryFilter === '' || transaction.category === categoryFilter
  );

    return (
        <Paper>
            <Button variant="contained" onClick={handleButtonClick}>
        {recentMonthOnly ? 'Show All Transactions' : 'Show Recent Month Transactions'}
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
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Transaction Category</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Comment</TableCell>
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
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        </Paper>
    )
}