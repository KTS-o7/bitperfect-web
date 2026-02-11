import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Track, Album, Artist } from "@bitperfect/shared/api/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSearchAll(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 300);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      api.searchTracks(debouncedQuery, { signal: controller.signal, limit: 20 }),
      api.searchAlbums(debouncedQuery, { signal: controller.signal, limit: 10 }),
      api.searchArtists(debouncedQuery, { signal: controller.signal, limit: 10 }),
    ])
      .then(([trackRes, albumRes, artistRes]) => {
        if (cancelled) return;
        setTracks(trackRes.items);
        setAlbums(albumRes.items);
        setArtists(artistRes.items);
      })
      .catch((err) => {
        if (!cancelled && !(err instanceof Error && err.name === "AbortError")) {
          console.error("Search failed:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  return { tracks, albums, artists, loading };
}
