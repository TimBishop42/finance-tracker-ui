import { useState, useEffect, useCallback } from "react";
import RestClient from "../rest/CategoryClient";

/**
 * Manages "neutral" merchant rules — internal transfers / credit-card payments
 * that are booked as NEUTRAL on CSV import (excluded from spend and cashflow).
 * The server normalises the business name into a stable key on add.
 *
 * Returns { neutralMerchants: string[] (keys), add, remove }.
 */
export function useNeutralMerchants() {
  const [neutralMerchants, setNeutralMerchants] = useState([]);

  const load = useCallback(() => {
    RestClient.get("/finance/neutral-merchants")
      .then((r) => setNeutralMerchants(r.data || []))
      .catch((e) => console.error("Failed to load neutral merchants", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback((businessName) => {
    const name = (businessName || "").trim();
    if (!name) return;
    RestClient.post("/finance/neutral-merchants", { businessName: name })
      .then((r) => {
        const key = r.data?.merchantKey;
        if (key) {
          setNeutralMerchants((prev) =>
            prev.includes(key) ? prev : [...prev, key],
          );
        }
      })
      .catch((e) => console.error("Failed to add neutral merchant", e));
  }, []);

  const remove = useCallback((key) => {
    RestClient.delete(`/finance/neutral-merchants/${encodeURIComponent(key)}`)
      .then(() => setNeutralMerchants((prev) => prev.filter((k) => k !== key)))
      .catch((e) => console.error("Failed to remove neutral merchant", e));
  }, []);

  return { neutralMerchants, add, remove };
}
