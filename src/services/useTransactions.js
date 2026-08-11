import { useState, useEffect, useCallback } from "react";
import RestClient from "../rest/CategoryClient";

/**
 * Transaction review datasource: fetches the full history once and exposes
 * edit / delete / bulk-recategorise. Slicing (time range, filters, group-by) is
 * done client-side by consumers — fine at single-user volume and enables instant
 * re-slicing without round-trips.
 */
export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return RestClient.get("/finance/find-all-transactions")
      .then((r) => {
        setTransactions(r.data || []);
        setError(null);
      })
      .catch((e) => {
        console.error("Failed to load transactions", e);
        setError(e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    (patch) => RestClient.put("/finance/update-transaction", patch).then(load),
    [load],
  );

  const remove = useCallback(
    (transactionId) =>
      RestClient.post("/finance/delete-transaction", { transactionId }).then(
        load,
      ),
    [load],
  );

  const recategoriseMerchant = useCallback(
    (businessName, category) =>
      RestClient.post("/finance/recategorise-merchant", {
        businessName,
        category,
      }).then(load),
    [load],
  );

  return {
    transactions,
    loading,
    error,
    refetch: load,
    update,
    remove,
    recategoriseMerchant,
  };
}
