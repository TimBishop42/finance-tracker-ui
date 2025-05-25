import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, CssBaseline } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import Dashboard from './components/dashboard/Dashboard';
import SettingsDialog from './components/settings/SettingsDialog';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Finance Tracker
            </Typography>
            <IconButton 
              color="inherit" 
              onClick={() => setSettingsOpen(true)}
              aria-label="settings"
            >
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Dashboard />
        </Box>

        <SettingsDialog 
          open={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
      </Box>
    </>
  );
}

export default App; 