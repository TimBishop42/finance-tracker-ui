import { useState, useEffect, useCallback } from "react";
import {
  getSalaryHistory,
  addSalaryEntry,
  deleteSalaryEntry,
} from "./finance-service";

// Salary history persisted server-side (Spring Boot + PostgreSQL).
// Server entry shape: { id, effectiveDate: "YYYY-MM-DD", amount, note }.
// We normalise to { id, date, amount, note } for the UI.
const byDate = (a, b) => String(a.date).localeCompare(String(b.date));

const normalise = (e) => ({
  id: e.id,
  date: e.effectiveDate,
  amount: Number(e.amount),
  note: e.note || "",
});

export function useSalaryHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getSalaryHistory();
      setEntries((data || []).map(normalise).sort(byDate));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (entry) => {
      await addSalaryEntry({
        date: entry.date,
        amount: Number(entry.amount) || 0,
        note: entry.note || "",
      });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id) => {
      await deleteSalaryEntry(id);
      await refresh();
    },
    [refresh],
  );

  // Most recent salary (latest effective date).
  const current = entries.length ? entries[entries.length - 1] : null;

  return { entries, add, remove, current, loading, error, refresh };
}
