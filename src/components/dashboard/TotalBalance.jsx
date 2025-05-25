import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

export default function TotalBalance() {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Total Balance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          (To Be Implemented)
        </Typography>
        <Typography variant="h4" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          $0.00
        </Typography>
      </Box>
    </Paper>
  );
} 