import { useCallback, useEffect, useState } from "react";
import {
  getKidsWealthSummary,
  getSecurities,
  getTrades,
  addSecurity,
  addTrade,
  deleteTrade,
  refreshPrices,
  runKidsWealthSnapshot,
} from "./finance-service";

// Loads the Kids' Portfolios view (Chloe's + Millie's holdings/totals) plus the
// shared securities catalog and each kid's own trades, and exposes mutators that
// refresh after each change. Mirrors useWealth's Promise.all + reload convention.
export function useKidsWealth(currency = "AUD") {
  const [summary, setSummary] = useState(null);
  const [securities, setSecurities] = useState([]);
  const [trades, setTrades] = useState({ CHLOE: [], MILLIE: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [sum, secs, chloeTrades, millieTrades] = await Promise.all([
        getKidsWealthSummary(currency),
        getSecurities(),
        getTrades("CHLOE"),
        getTrades("MILLIE"),
      ]);
      setSummary(sum);
      setSecurities(secs || []);
      setTrades({ CHLOE: chloeTrades || [], MILLIE: millieTrades || [] });
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
    addSecurity: wrap(addSecurity),
    addTrade: wrap(addTrade),
    removeTrade: wrap(deleteTrade),
    // Prices are per-security, not per-owner, so this refreshes the shared catalog
    // (same endpoint the Total Wealth page uses) — needed here too, since a
    // security only a kid holds otherwise never gets a price and P/L stays $0.
    refreshPrices: wrap(refreshPrices),
    runSnapshot: wrap(runKidsWealthSnapshot),
  };
}
