import { useState, useEffect, useCallback } from "react";
import RestClient from "../rest/CategoryClient";

export function useExcludedMerchants() {
  const [excluded, setExcluded] = useState(new Set());

  useEffect(() => {
    RestClient.get("/finance/excluded-merchants")
      .then((r) => setExcluded(new Set(r.data)))
      .catch((e) => console.error("Failed to load excluded merchants", e));
  }, []);

  const exclude = useCallback((key) => {
    const normalised = key.trim().toUpperCase();
    RestClient.post("/finance/excluded-merchants", { merchantKey: normalised })
      .then(() => setExcluded((prev) => new Set([...prev, normalised])))
      .catch((e) => console.error("Failed to exclude merchant", e));
  }, []);

  const restore = useCallback((key) => {
    const normalised = key.trim().toUpperCase();
    RestClient.delete(
      `/finance/excluded-merchants/${encodeURIComponent(normalised)}`,
    )
      .then(() =>
        setExcluded((prev) => {
          const next = new Set(prev);
          next.delete(normalised);
          return next;
        }),
      )
      .catch((e) => console.error("Failed to restore merchant", e));
  }, []);

  return { excluded, exclude, restore };
}
