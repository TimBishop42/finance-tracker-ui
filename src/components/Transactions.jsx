import RestClient from '../rest/CategoryClient';
import React, { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import { TableHead, TableRow } from '@mui/material';

export default function Transactions() {

    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        RestClient.get('/find-all-transactions').then((response) => {
            setTransactions([].concat(response.data).sort((a, b) => a.transactionDateTime > b.transactionDateTime ? -1 : 1));
        });
    }, []);

    return (
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
                    {transactions.map((row) => (
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
    )
}