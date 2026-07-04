import { useState, useEffect, useCallback } from "react";
import RestClient from "../rest/CategoryClient";

/**
 * Loads recurring/subscription detections from the backend v2 engine
 * (GET /api/finance/recurring). Detection now runs server-side over the full
 * transaction history; this hook is a thin fetch + dismiss/restore wrapper.
 *
 * Returns { candidates, engine, generatedAt, loading, error, refetch,
 *           dismiss, restore }.
 */
export function useRecurring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return RestClient.get("/finance/recurring")
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => {
        console.error("Failed to load recurring detections", e);
        setError(e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dismiss / restore reuse the existing excluded-merchants endpoints; the
  // candidate.dismissed flag is recomputed by the server, so we refetch after.
  const dismiss = useCallback(
    (key) =>
      RestClient.post("/finance/excluded-merchants", { merchantKey: key })
        .then(load)
        .catch((e) => console.error("Failed to dismiss merchant", e)),
    [load],
  );

  const restore = useCallback(
    (key) =>
      RestClient.delete(
        `/finance/excluded-merchants/${encodeURIComponent(key)}`,
      )
        .then(load)
        .catch((e) => console.error("Failed to restore merchant", e)),
    [load],
  );

  return {
    candidates: data?.candidates ?? [],
    engine: data?.engine ?? null,
    generatedAt: data?.generatedAt ?? null,
    loading,
    error,
    refetch: load,
    dismiss,
    restore,
  };
}
