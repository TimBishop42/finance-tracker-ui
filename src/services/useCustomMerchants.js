import { useState, useEffect, useCallback } from "react";
import RestClient from "../rest/CategoryClient";

export function useCustomMerchants() {
  const [customMerchants, setCustomMerchants] = useState([]);

  useEffect(() => {
    RestClient.get("/finance/custom-merchants")
      .then((r) => setCustomMerchants(r.data))
      .catch((e) => console.error("Failed to load custom merchants", e));
  }, []);

  const add = useCallback((merchantPattern, merchantType) => {
    const pattern = merchantPattern.trim();
    if (!pattern) return;
    RestClient.post("/finance/custom-merchants", {
      merchantPattern: pattern,
      merchantType,
    })
      .then(() =>
        setCustomMerchants((prev) => [
          ...prev.filter((m) => m.merchantPattern !== pattern),
          { merchantPattern: pattern, merchantType },
        ]),
      )
      .catch((e) => console.error("Failed to add custom merchant", e));
  }, []);

  const remove = useCallback((merchantPattern) => {
    const pattern = merchantPattern.trim();
    RestClient.delete(
      `/finance/custom-merchants/${encodeURIComponent(pattern)}`,
    )
      .then(() =>
        setCustomMerchants((prev) =>
          prev.filter((m) => m.merchantPattern !== pattern),
        ),
      )
      .catch((e) => console.error("Failed to remove custom merchant", e));
  }, []);

  return { customMerchants, add, remove };
}
