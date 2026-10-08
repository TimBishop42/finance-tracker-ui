import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import RestClient from "../../rest/CategoryClient";
import { addCategory } from "../../services/finance-service";
import DuplicateReviewModal from "./DuplicateReviewModal";

const TYPE_META = {
  EXPENSE: { label: "Expense", color: "error" },
  INCOME: { label: "Income", color: "success" },
  NEUTRAL: { label: "Neutral", color: "default" },
};

export default function TransactionUploader() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(1); // 1 for upload, 2 for review
  const [error, setError] = useState(null);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLoading, setNewCategoryLoading] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState(null);
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(null);
  const fileInputRef = useRef(null);
  const [duplicateModal, setDuplicateModal] = useState({
    open: false,
    duplicates: null,
  });
  const [columnMapping, setColumnMapping] = useState({
    date: 0,
    amount: 1,
    business: 2,
    debit: 1,
    credit: 2,
  });
  // 'single' = one signed Amount column; 'split' = separate Debit/Credit columns.
  const [amountMode, setAmountMode] = useState("single");
  // For single-column files: which sign represents an expense/outflow.
  const [expenseSign, setExpenseSign] = useState("negative");
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [rawCsvData, setRawCsvData] = useState(null);
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const MAX_TRANSACTIONS = 1000;
  const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"];

  const parseDateString = (value, format) => {
    const parts = value.match(/\d+/g);
    if (!parts || parts.length < 3) return null;

    const tokens = format.split(/[-/]/);
    const tokenIndex = tokens.reduce((acc, token, index) => {
      acc[token] = index;
      return acc;
    }, {});

    const day = parseInt(parts[tokenIndex.DD], 10);
    const month = parseInt(parts[tokenIndex.MM], 10);
    const year = parseInt(parts[tokenIndex.YYYY], 10);

    if ([day, month, year].some((n) => Number.isNaN(n))) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // Load categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await RestClient.get("/finance/get-categories");
      setCategories(response.data);
      setError(null);
    } catch (error) {
      console.error("Error loading categories:", error);
      setError("Failed to load categories");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split("\n").filter((row) => row.trim());

        if (rows.length > MAX_TRANSACTIONS + 1) {
          // +1 for header
          setError(
            `File contains too many transactions. Maximum allowed is ${MAX_TRANSACTIONS}.`,
          );
          return;
        }

        const headers = rows[0].split(/[,\t]/).map((h) => h.trim());
        setCsvHeaders(headers);
        setRawCsvData(rows);
        setColumnMappingOpen(true);
      };
      reader.readAsText(file);
    }
  };

  // Parse a number that may include $, commas, quotes or (parentheses) for negatives.
  const parseNumber = (raw) => {
    if (raw == null) return NaN;
    let s = String(raw).replace(/["$,\s]/g, "");
    let negate = false;
    if (/^\(.*\)$/.test(s)) {
      negate = true;
      s = s.replace(/[()]/g, "");
    }
    const v = parseFloat(s);
    if (Number.isNaN(v)) return NaN;
    return negate ? -v : v;
  };

  // From a row's columns, derive { amount: positive magnitude, type } using the
  // chosen mode: a single signed column, or separate Debit/Credit columns.
  const deriveAmount = (columns) => {
    if (amountMode === "split") {
      const debit = parseNumber(columns[columnMapping.debit]);
      const credit = parseNumber(columns[columnMapping.credit]);
      const d = Number.isNaN(debit) ? 0 : Math.abs(debit);
      const c = Number.isNaN(credit) ? 0 : Math.abs(credit);
      if (d > 0) return { amount: d, type: "EXPENSE" };
      if (c > 0) return { amount: c, type: "INCOME" };
      return null;
    }
    const signed = parseNumber(columns[columnMapping.amount]);
    if (Number.isNaN(signed) || signed === 0) return null;
    const isExpense = expenseSign === "negative" ? signed < 0 : signed > 0;
    return { amount: Math.abs(signed), type: isExpense ? "EXPENSE" : "INCOME" };
  };

  const handleColumnMappingConfirm = async () => {
    if (!rawCsvData) return;

    try {
      const rows = rawCsvData.slice(1); // Skip header row

      const formattedTransactions = rows
        .map((row) => {
          try {
            const columns = row.split(/[,\t]/).map((col) => col.trim());
            const date = columns[columnMapping.date];
            const business = columns[columnMapping.business];

            if (!date || !business) return null;

            const parsedDate = parseDateString(date, dateFormat);
            const parsedAmount = deriveAmount(columns);
            if (!parsedDate || !parsedAmount) return null;

            return {
              transactionDate: parsedDate.toISOString(),
              transactionAmount: parsedAmount.amount,
              transactionType: parsedAmount.type,
              transactionBusiness: business,
            };
          } catch (rowError) {
            console.warn("Error processing row:", row);
            return null;
          }
        })
        .filter((t) => t !== null); // Remove any failed rows

      if (formattedTransactions.length === 0) {
        setError("No valid transactions found in the file");
        setColumnMappingOpen(false);
        return;
      }

      // Auto-classify internal transfers / credit-card payments as NEUTRAL using
      // saved rules + built-in patterns so they don't count as spend or income.
      try {
        const names = [
          ...new Set(formattedTransactions.map((t) => t.transactionBusiness)),
        ];
        const res = await RestClient.post("/finance/neutral-merchants/match", {
          names,
        });
        const neutral = new Set(res.data || []);
        formattedTransactions.forEach((t) => {
          if (neutral.has(t.transactionBusiness)) t.transactionType = "NEUTRAL";
        });
      } catch (matchErr) {
        console.warn("Neutral classification unavailable:", matchErr);
      }

      setTransactions(formattedTransactions);
      setStage(2);
      setColumnMappingOpen(false);
    } catch (error) {
      console.error("Error processing CSV:", error);
      setError(
        "Error processing CSV file. Please check the format and try again.",
      );
      setColumnMappingOpen(false);
    }
  };

  const handleCategoryChange = (index, category) => {
    if (category === "new_category") {
      setCurrentTransactionIndex(index);
      setNewCategoryDialogOpen(true);
      return;
    }
    const updatedTransactions = [...transactions];
    updatedTransactions[index].userCorrectedCategory = category;
    setTransactions(updatedTransactions);
  };

  const handleNewCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setNewCategoryLoading(true);
      setNewCategoryError(null);
      await addCategory(newCategoryName);
      await fetchCategories();

      if (currentTransactionIndex !== null) {
        const updatedTransactions = [...transactions];
        updatedTransactions[currentTransactionIndex].userCorrectedCategory =
          newCategoryName;
        setTransactions(updatedTransactions);
      }

      setNewCategoryName("");
      setNewCategoryDialogOpen(false);
      setCurrentTransactionIndex(null);
    } catch (err) {
      setNewCategoryError("Failed to add category");
      console.error("Error adding category:", err);
    } finally {
      setNewCategoryLoading(false);
    }
  };

  const handleCommentChange = (index, comment) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index].comment = comment;
    setTransactions(updatedTransactions);
  };

  const handleTypeChange = (index, type) => {
    const updated = [...transactions];
    updated[index].transactionType = type;
    setTransactions(updated);
  };

  // Persist a rule so this merchant is always booked NEUTRAL on future imports,
  // and apply it to every matching row currently on screen.
  const handleAlwaysNeutral = async (index) => {
    const business = transactions[index].transactionBusiness;
    try {
      await RestClient.post("/finance/neutral-merchants", {
        businessName: business,
      });
    } catch (err) {
      console.error("Failed to save neutral rule:", err);
    }
    setTransactions((prev) =>
      prev.map((t) =>
        t.transactionBusiness === business
          ? { ...t, transactionType: "NEUTRAL" }
          : t,
      ),
    );
  };

  const handleExcludeTransaction = (index) => {
    const updatedTransactions = [...transactions];
    updatedTransactions.splice(index, 1);
    setTransactions(updatedTransactions);
  };

  const handleSubmit = () => {
    setIsProcessing(true);
    const formattedTransactions = transactions.map((t) => ({
      predictedCategory: t.predictedCategory,
      userCorrectedCategory:
        t.userCorrectedCategory || t.predictedCategory || "Miscellaneous",
      amount: t.transactionAmount.toString(),
      transactionType: t.transactionType || "EXPENSE",
      transactionDate: new Date(t.transactionDate).getTime(),
      transactionBusiness: t.transactionBusiness || "",
      comment: t.comment || "",
      essential: false,
      duplicateReviewed: false,
    }));

    RestClient.post("/finance/submit-transaction-batch", {
      transactionJsonList: formattedTransactions,
      dryRun: false,
    })
      .then((response) => {
        // Handle array response
        const responseData = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        if (responseData.hasDuplicates) {
          setDuplicateModal({
            open: true,
            duplicates: responseData.duplicates,
          });
        } else {
          setTransactions([]);
          setStage(1);
        }
      })
      .catch((error) => {
        console.error("Error submitting batch:", error);
        setError("Failed to submit transactions");
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleDuplicateConfirm = async (transactionsToSave) => {
    setDuplicateModal((prev) => ({ ...prev, open: false }));
    try {
      const formattedTransactions = transactionsToSave.map((t) => ({
        userCorrectedCategory: t.category,
        amount: t.amount.toString(),
        transactionType: t.transactionType || "EXPENSE",
        transactionDate: t.transactionDateTime,
        transactionBusiness: t.businessName || "",
        comment: t.comment || "",
        essential: t.essential || false,
        duplicateReviewed: true,
      }));

      const response = await RestClient.post(
        "/finance/submit-transaction-batch",
        {
          transactionJsonList: formattedTransactions,
          dryRun: false,
        },
      );
      if (response.data) {
        setTransactions([]);
        setStage(1);
      }
    } catch (err) {
      console.error("Error saving transactions:", err);
      setError("Failed to save transactions. Please try again.");
    }
  };

  const handlePredictCategories = () => {
    setIsProcessing(true);
    RestClient.post("/transactions/predict-batch", transactions)
      .then((response) => {
        const categorizedTransactions = response.data.map((cat, index) => ({
          ...transactions[index],
          predictedCategory: cat.predicted_category,
          confidenceScore: cat.confidence_score,
        }));
        setTransactions(categorizedTransactions);
      })
      .catch((error) => {
        console.error("Error predicting categories:", error);
        setError("Failed to predict categories");
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Bulk Upload Transactions
      </Typography>
      <Box sx={{ mt: 2 }}>
        {stage === 1 ? (
          <Box>
            <Typography variant="body1" gutterBottom>
              Upload a CSV file with transactions. The file should have the
              following columns: Date, Amount, Description. You can select the
              date format after upload.
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              ref={fileInputRef}
            />
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mt: 2 }}
            >
              Choose CSV File
            </Button>
          </Box>
        ) : (
          <>
            <Button
              onClick={handlePredictCategories}
              disabled={isProcessing}
              variant="contained"
              sx={{ mb: 2 }}
            >
              {isProcessing ? (
                <CircularProgress size={24} />
              ) : (
                "Predict Categories"
              )}
            </Button>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Predicted Category</TableCell>
                    <TableCell>User Corrected Category</TableCell>
                    <TableCell>Comment</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(
                          transaction.transactionDate,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        ${transaction.transactionAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transaction.transactionType || "EXPENSE"}
                          onChange={(e) =>
                            handleTypeChange(index, e.target.value)
                          }
                          size="small"
                          sx={{ minWidth: 110 }}
                        >
                          {Object.entries(TYPE_META).map(([value, meta]) => (
                            <MenuItem key={value} value={value}>
                              {meta.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>{transaction.transactionBusiness}</TableCell>
                      <TableCell>{transaction.predictedCategory}</TableCell>
                      <TableCell>
                        <Select
                          value={transaction.userCorrectedCategory || ""}
                          onChange={(e) =>
                            handleCategoryChange(index, e.target.value)
                          }
                          fullWidth
                        >
                          {categories.map((cat) => (
                            <MenuItem
                              key={cat.categoryName}
                              value={cat.categoryName}
                            >
                              {cat.categoryName}
                            </MenuItem>
                          ))}
                          <MenuItem value="new_category">
                            <Typography color="primary">
                              + Add New Category
                            </Typography>
                          </MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={transaction.comment || ""}
                          onChange={(e) =>
                            handleCommentChange(index, e.target.value)
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Always treat this merchant as neutral (ignore on future imports)">
                          <IconButton
                            onClick={() => handleAlwaysNeutral(index)}
                            color={
                              transaction.transactionType === "NEUTRAL"
                                ? "primary"
                                : "default"
                            }
                            size="small"
                          >
                            <SwapHorizIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          onClick={() => handleExcludeTransaction(index)}
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
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <CircularProgress size={24} />
                ) : (
                  "Submit Transactions"
                )}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Dialog
        open={newCategoryDialogOpen}
        onClose={() => setNewCategoryDialogOpen(false)}
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            error={!!newCategoryError}
            helperText={newCategoryError}
            disabled={newCategoryLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setNewCategoryDialogOpen(false)}
            disabled={newCategoryLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleNewCategorySubmit}
            variant="contained"
            disabled={newCategoryLoading || !newCategoryName.trim()}
          >
            {newCategoryLoading ? (
              <CircularProgress size={24} />
            ) : (
              "Add Category"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={columnMappingOpen}
        onClose={() => setColumnMappingOpen(false)}
      >
        <DialogTitle>Map CSV Columns</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2">Available Columns:</Typography>
            <Typography variant="body2" color="text.secondary">
              {csvHeaders.join(", ")}
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Date Column</InputLabel>
              <Select
                value={columnMapping.date}
                onChange={(e) =>
                  setColumnMapping((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                label="Date Column"
              >
                {csvHeaders.map((header, index) => (
                  <MenuItem key={`date-${index}`} value={index}>
                    {header}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Amount columns
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={amountMode}
                onChange={(_, v) => v && setAmountMode(v)}
              >
                <ToggleButton value="single">Single amount</ToggleButton>
                <ToggleButton value="split">Debit / Credit</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {amountMode === "single" ? (
              <>
                <FormControl fullWidth>
                  <InputLabel>Amount Column</InputLabel>
                  <Select
                    value={columnMapping.amount}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    label="Amount Column"
                  >
                    {csvHeaders.map((header, index) => (
                      <MenuItem key={`amount-${index}`} value={index}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    In this file, expenses (money out) are shown as:
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    fullWidth
                    value={expenseSign}
                    onChange={(_, v) => v && setExpenseSign(v)}
                    sx={{ mt: 0.5 }}
                  >
                    <ToggleButton value="negative">Negative (−)</ToggleButton>
                    <ToggleButton value="positive">Positive (+)</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </>
            ) : (
              <>
                <FormControl fullWidth>
                  <InputLabel>Debit Column (money out)</InputLabel>
                  <Select
                    value={columnMapping.debit}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        debit: e.target.value,
                      }))
                    }
                    label="Debit Column (money out)"
                  >
                    {csvHeaders.map((header, index) => (
                      <MenuItem key={`debit-${index}`} value={index}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Credit Column (money in)</InputLabel>
                  <Select
                    value={columnMapping.credit}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        credit: e.target.value,
                      }))
                    }
                    label="Credit Column (money in)"
                  >
                    {csvHeaders.map((header, index) => (
                      <MenuItem key={`credit-${index}`} value={index}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <FormControl fullWidth>
              <InputLabel>Business Name Column</InputLabel>
              <Select
                value={columnMapping.business}
                onChange={(e) =>
                  setColumnMapping((prev) => ({
                    ...prev,
                    business: e.target.value,
                  }))
                }
                label="Business Name Column"
              >
                {csvHeaders.map((header, index) => (
                  <MenuItem key={`business-${index}`} value={index}>
                    {header}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Date Format</InputLabel>
              <Select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                label="Date Format"
              >
                {DATE_FORMATS.map((format) => (
                  <MenuItem key={format} value={format}>
                    {format}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnMappingOpen(false)}>Cancel</Button>
          <Button onClick={handleColumnMappingConfirm} variant="contained">
            Confirm Mapping
          </Button>
        </DialogActions>
      </Dialog>

      <DuplicateReviewModal
        open={duplicateModal.open}
        onClose={() => setDuplicateModal((prev) => ({ ...prev, open: false }))}
        duplicates={duplicateModal.duplicates}
        onConfirm={handleDuplicateConfirm}
      />
    </Paper>
  );
}
