import { useCallback, useEffect, useState } from "react";
import {
  getWealthSummary,
  getSecurities,
  getTrades,
  addWealthItem,
  updateWealthItem,
  deleteWealthItem,
  addSecurity,
  addTrade,
  deleteTrade,
  setSecurityPrice,
  setFxRate,
  runNetWorthSnapshot,
} from "./finance-service";

// Loads the Total Wealth view for a display currency plus the raw securities and
// trades needed by the management tables, and exposes mutators that refresh after
// each change. Server-persisted (Spring Boot + PostgreSQL).
export function useWealth(currency = "AUD") {
  const [summary, setSummary] = useState(null);
  const [securities, setSecurities] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [sum, secs, trs] = await Promise.all([
        getWealthSummary(currency),
        getSecurities(),
        getTrades(),
      ]);
      setSummary(sum);
      setSecurities(secs || []);
      setTrades(trs || []);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Wrap a mutator so the view refreshes once the change lands.
  const wrap = useCallback(
    (fn) =>
      async (...args) => {
        const result = await fn(...args);
        await reload();
        return result;
      },
    [reload],
  );

  return {
    summary,
    securities,
    trades,
    loading,
    error,
    reload,
    addItem: wrap(addWealthItem),
    updateItem: wrap(updateWealthItem),
    removeItem: wrap(deleteWealthItem),
    addSecurity: wrap(addSecurity),
    addTrade: wrap(addTrade),
    removeTrade: wrap(deleteTrade),
    setPrice: wrap(setSecurityPrice),
    setFx: wrap(setFxRate),
    runSnapshot: wrap(runNetWorthSnapshot),
  };
}
