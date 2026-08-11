import React, { useState, useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Layout from "./components/layout/Layout";
import Dashboard from "./components/dashboard/Dashboard";
import TransactionForm from "./components/transactions/TransactionForm";
import TransactionUploader from "./components/transactions/TransactionUploader";
import TransactionsBrowser from "./components/transactions/TransactionsBrowser";
import AggregateData from "./components/dashboard/AggregateData";
import SpendingHeatmap from "./components/dashboard/SpendingHeatmap";
import SubscriptionDashboard from "./components/subscriptions/SubscriptionDashboard";
import Bills from "./components/subscriptions/Bills";
import SuperTracker from "./components/super/SuperTracker";
import SalaryTracker from "./components/salary/SalaryTracker";
import WealthTracker from "./components/wealth/WealthTracker";
import KidsWealthTracker from "./components/wealth/KidsWealthTracker";
import { CategoriesProvider } from "./context/CategoriesContext";

const THEME_STORAGE_KEY = "themeMode";

function App() {
  // Restore the saved theme so dark/light survives a reload.
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === "dark" || saved === "light" ? saved : "light";
    } catch (e) {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      /* ignore unavailable storage */
    }
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#1976d2",
          },
          secondary: {
            main: "#dc004e",
          },
        },
      }),
    [mode],
  );

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CategoriesProvider>
        <Router>
          <Layout onToggleColorMode={toggleColorMode} mode={mode}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-transaction" element={<TransactionForm />} />
              <Route path="/bulk-upload" element={<TransactionUploader />} />
              <Route path="/transactions" element={<TransactionsBrowser />} />
              <Route path="/summary" element={<AggregateData />} />
              <Route path="/heatmap" element={<SpendingHeatmap />} />
              <Route
                path="/subscriptions"
                element={<SubscriptionDashboard />}
              />
              <Route path="/bills" element={<Bills />} />
              {/* Legacy paths → merged Bills tab */}
              <Route path="/calendar" element={<Bills />} />
              <Route path="/recurring" element={<Bills />} />
              <Route path="/super" element={<SuperTracker />} />
              <Route path="/salary" element={<SalaryTracker />} />
              <Route path="/wealth" element={<WealthTracker />} />
              <Route path="/kids-wealth" element={<KidsWealthTracker />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>
        </Router>
      </CategoriesProvider>
    </ThemeProvider>
  );
}

export default App;
