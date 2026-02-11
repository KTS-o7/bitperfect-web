import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Track } from "@bitperfect/shared/api/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useSearchTracks(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 300);
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setTotal(0);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const response = await api.searchTracks(debouncedQuery, {
          signal: controller.signal,
          limit: 25,
        });
        if (!cancelled) {
          setResults(response.items);
          setTotal(response.totalNumberOfItems);
        }
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof Error && error.name === "AbortError")
        ) {
          console.error("Search failed:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  return { results, loading, total };
}
