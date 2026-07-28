import { useState, useEffect, useCallback } from "react";
import RestClient from "../rest/CategoryClient";

/**
 * Unified subscriptions/bills datasource (feature doc §2A.4/§2A.5). Both the Bill
 * Calendar (kind=bill) and the Subscription dashboard read/edit through this one
 * hook. The server returns each row shaped as a RecurringCandidate (with the extra
 * §2A fields: kind, status, paymentMethod, payer, url, billingCycle, priceHistory,
 * cancelCandidate, subscriptionId), so it merges directly with detected candidates.
 */
export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return RestClient.get("/finance/subscriptions")
      .then((r) => {
        setSubscriptions(r.data || []);
        setError(null);
      })
      .catch((e) => {
        console.error("Failed to load subscriptions", e);
        setError(e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    (body) => RestClient.post("/finance/subscriptions", body).then(load),
    [load],
  );

  const update = useCallback(
    (id, body) =>
      RestClient.put(`/finance/subscriptions/${id}`, body).then(load),
    [load],
  );

  const remove = useCallback(
    (id) => RestClient.delete(`/finance/subscriptions/${id}`).then(load),
    [load],
  );

  const confirm = useCallback(
    (candidate) =>
      RestClient.post("/finance/subscriptions/confirm", candidate).then(
        async (r) => {
          await load();
          return r.data;
        },
      ),
    [load],
  );

  const setPaid = useCallback(
    (id, date, paid) =>
      RestClient.post(
        `/finance/subscriptions/${id}/paid?date=${encodeURIComponent(date)}&paid=${paid}`,
      ).then(load),
    [load],
  );

  const setLinks = useCallback(
    (id, transactionIds) =>
      RestClient.put(`/finance/subscriptions/${id}/links`, {
        transactionIds,
      }).then(load),
    [load],
  );

  return {
    subscriptions,
    loading,
    error,
    refetch: load,
    add,
    update,
    remove,
    confirm,
    setPaid,
    setLinks,
  };
}

// All transactions, for the "link transactions" picker.
export const getAllTransactions = () =>
  RestClient.get("/finance/find-all-transactions").then((r) => r.data);

export const getSubscriptionDashboard = () =>
  RestClient.get("/finance/subscriptions/dashboard").then((r) => r.data);

export const getSubscriptionBudget = () =>
  RestClient.get("/finance/subscriptions/budget").then((r) => r.data);

export const setSubscriptionBudget = (budget) =>
  RestClient.put("/finance/subscriptions/budget", { budget });
