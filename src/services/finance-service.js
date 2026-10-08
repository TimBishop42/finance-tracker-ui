export const getMonthlySpendComparison = async () => {
  try {
    const response = await fetch("/api/finance/monthly-spend-comparison");
    if (!response.ok) {
      throw new Error("Failed to fetch monthly spend comparison");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching monthly spend comparison:", error);
    throw error;
  }
};

export const getCumulativeSpend = async (month = null, year = null) => {
  try {
    let url = "/api/finance/get-cumulative-spend";
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch cumulative spend data");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching cumulative spend data:", error);
    throw error;
  }
};

export const getSummaryMonths = async (months = 2) => {
  try {
    const response = await fetch(
      `/api/finance/get-summary-months?months=${months}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch summary months");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching summary months:", error);
    throw error;
  }
};

export const getAllCategories = async () => {
  try {
    const response = await fetch("/api/finance/get-categories");
    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

export const addCategory = async (categoryName) => {
  try {
    const response = await fetch("/api/finance/add-category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ categoryName }),
    });
    if (!response.ok) {
      throw new Error("Failed to add category");
    }
    return await response.json();
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const deleteCategory = async (categoryName) => {
  try {
    const response = await fetch("/api/finance/delete-category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ categoryName }),
    });
    if (!response.ok) {
      throw new Error("Failed to delete category");
    }
    return await response.json();
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// monthlyBudget null clears the budget. Resolves to the saved category.
export const setCategoryBudget = async (categoryName, monthlyBudget) => {
  const response = await fetch("/api/finance/set-category-budget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryName, monthlyBudget }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const getMaxSpendValue = async () => {
  try {
    const response = await fetch("/api/finance/get-max-spend-value");
    if (!response.ok) {
      throw new Error("Failed to fetch max spend value");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching max spend value:", error);
    throw error;
  }
};

// Dispatched on window whenever the max spend value is saved, so components
// showing it (e.g. Dashboard) can stay in sync without polling.
export const MAX_SPEND_VALUE_UPDATED_EVENT = "maxSpendValueUpdated";

export const setMaxSpendValue = async (value) => {
  try {
    const response = await fetch("/api/finance/set-max-spend-value", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    });
    if (!response.ok) {
      throw new Error("Failed to set max spend value");
    }
    window.dispatchEvent(
      new CustomEvent(MAX_SPEND_VALUE_UPDATED_EVENT, { detail: value }),
    );
  } catch (error) {
    console.error("Error setting max spend value:", error);
    throw error;
  }
};

export const trainModel = async () => {
  try {
    const response = await fetch("/api/finance/train-model", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to train model");
    }
    return await response.json();
  } catch (error) {
    console.error("Error training model:", error);
    throw error;
  }
};

export const getSalaryHistory = async () => {
  const response = await fetch("/api/finance/salary-history");
  if (!response.ok) {
    throw new Error("Failed to fetch salary history");
  }
  return await response.json();
};

export const addSalaryEntry = async ({ date, amount, note }) => {
  const response = await fetch("/api/finance/salary-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, amount, note }),
  });
  if (!response.ok) {
    throw new Error("Failed to add salary entry");
  }
  return await response.json();
};

export const deleteSalaryEntry = async (id) => {
  const response = await fetch(`/api/finance/salary-history/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete salary entry");
  }
};

// ---------------------------------------------------------------------------
// Total Wealth / Net Worth tracker (feature §3)
// ---------------------------------------------------------------------------

const WEALTH = "/api/finance/wealth";

const asJson = async (res, what) => {
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch (e) {
      /* ignore */
    }
    throw new Error(
      `${what} failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const postJson = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const putJson = (url, body) =>
  fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const getWealthSummary = async (currency = "AUD") =>
  asJson(
    await fetch(`${WEALTH}/summary?currency=${encodeURIComponent(currency)}`),
    "fetch wealth summary",
  );

export const getKidsWealthSummary = async (currency = "AUD") =>
  asJson(
    await fetch(
      `${WEALTH}/kids/summary?currency=${encodeURIComponent(currency)}`,
    ),
    "fetch kids wealth summary",
  );

export const runKidsWealthSnapshot = async () =>
  asJson(await postJson(`${WEALTH}/kids/snapshot`, {}), "run kids snapshot");

export const getWealthItems = async () =>
  asJson(await fetch(`${WEALTH}/items`), "fetch wealth items");

export const addWealthItem = async (item) =>
  asJson(await postJson(`${WEALTH}/items`, item), "add wealth item");

export const updateWealthItem = async (id, patch) =>
  asJson(await putJson(`${WEALTH}/items/${id}`, patch), "update wealth item");

export const deleteWealthItem = async (id) => {
  const res = await fetch(`${WEALTH}/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete wealth item");
};

export const getSecurities = async () =>
  asJson(await fetch(`${WEALTH}/securities`), "fetch securities");

export const addSecurity = async (sec) =>
  asJson(await postJson(`${WEALTH}/securities`, sec), "add security");

export const getTrades = async (owner) =>
  asJson(
    await fetch(
      `${WEALTH}/trades${owner ? `?owner=${encodeURIComponent(owner)}` : ""}`,
    ),
    "fetch trades",
  );

export const addTrade = async (trade) =>
  asJson(await postJson(`${WEALTH}/trades`, trade), "add trade");

export const deleteTrade = async (id) => {
  const res = await fetch(`${WEALTH}/trades/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete trade");
};

export const getSplits = async () =>
  asJson(await fetch(`${WEALTH}/splits`), "fetch splits");

export const addSplit = async (split) =>
  asJson(await postJson(`${WEALTH}/splits`, split), "add split");

export const deleteSplit = async (id) => {
  const res = await fetch(`${WEALTH}/splits/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete split");
};

export const setSecurityPrice = async (price) =>
  asJson(await postJson(`${WEALTH}/prices`, price), "set security price");

export const updateSecurity = async (id, patch) =>
  asJson(await putJson(`${WEALTH}/securities/${id}`, patch), "update security");

export const refreshPrices = async () =>
  asJson(await postJson(`${WEALTH}/prices/refresh`, {}), "refresh prices");

export const quoteSecurity = async (securityId) =>
  asJson(
    await fetch(`${WEALTH}/prices/quote?securityId=${securityId}`),
    "fetch live quote",
  );

export const getLatestFxRate = async () =>
  asJson(await fetch(`${WEALTH}/fx-rates/latest`), "fetch FX rate");

export const setFxRate = async (rate) =>
  asJson(await postJson(`${WEALTH}/fx-rates`, rate), "set FX rate");

export const getOptionGrants = async () =>
  asJson(await fetch(`${WEALTH}/option-grants`), "fetch option grants");

export const addOptionGrant = async (grant) =>
  asJson(await postJson(`${WEALTH}/option-grants`, grant), "add option grant");

export const updateOptionGrant = async (id, patch) =>
  asJson(
    await putJson(`${WEALTH}/option-grants/${id}`, patch),
    "update option grant",
  );

export const deleteOptionGrant = async (id) => {
  const res = await fetch(`${WEALTH}/option-grants/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete option grant");
};

export const getNetWorthSnapshots = async () =>
  asJson(await fetch(`${WEALTH}/snapshots`), "fetch snapshots");

export const runNetWorthSnapshot = async () =>
  asJson(await postJson(`${WEALTH}/snapshots/run`, {}), "run snapshot");

export const getSuperBalance = async () =>
  asJson(await fetch(`${WEALTH}/super-balance`), "fetch super balance");

export const setSuperBalance = async (payload) =>
  asJson(
    await putJson(`${WEALTH}/super-balance`, payload),
    "set super balance",
  );
