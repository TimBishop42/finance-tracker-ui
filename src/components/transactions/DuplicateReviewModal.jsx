import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

export default function DuplicateReviewModal({ open, onClose, duplicates, newTransaction, duplicateMap, onConfirm }) {
  const [selectedTransactions, setSelectedTransactions] = React.useState([]);

  React.useEffect(() => {
    if (duplicates && duplicates.length > 0) {
      // Both single and batch cases now use the same structure
      const transactions = duplicates.map(dup => ({
        transaction: { ...dup.newTransaction, shouldSave: true },
        duplicates: dup.existingDuplicates
      }));
      setSelectedTransactions(transactions);
    }
  }, [duplicates]);

  const handleToggleTransaction = (transactionId) => {
    setSelectedTransactions(prev =>
      prev.map(t => t.transaction.transactionId === transactionId 
        ? { ...t, transaction: { ...t.transaction, shouldSave: !t.transaction.shouldSave } }
        : t
      )
    );
  };

  const handleConfirm = () => {
    const transactionsToSave = selectedTransactions
      .filter(t => t.transaction.shouldSave)
      .map(t => {
        const { shouldSave, ...transaction } = t.transaction;
        return transaction;
      });
    onConfirm(transactionsToSave);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review Potential Duplicates</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          The following transactions may be duplicates. Please review and select which ones to save.
        </Typography>
        
        {selectedTransactions.map(({ transaction, duplicates }, index) => (
          <Box key={index} mt={index > 0 ? 4 : 2}>
            <Typography variant="h6" gutterBottom>New Transaction</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Save</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Business</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transaction.shouldSave}
                            onChange={() => handleToggleTransaction(transaction.transactionId)}
                          />
                        }
                        label=""
                      />
                    </TableCell>
                    <TableCell>{transaction.transactionDate}</TableCell>
                    <TableCell>${transaction.amount}</TableCell>
                    <TableCell>{transaction.businessName}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {duplicates.length > 0 && (
              <Box mt={2}>
                <Typography variant="h6" gutterBottom>Existing Similar Transactions</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Business</TableCell>
                        <TableCell>Category</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {duplicates.map((duplicate) => (
                        <TableRow key={duplicate.transactionId}>
                          <TableCell>{duplicate.transactionDate}</TableCell>
                          <TableCell>${duplicate.amount}</TableCell>
                          <TableCell>{duplicate.businessName}</TableCell>
                          <TableCell>{duplicate.category}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Save Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
} 