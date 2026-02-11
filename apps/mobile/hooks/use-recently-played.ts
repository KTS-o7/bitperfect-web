import { useState, useEffect, useCallback } from "react";
import {
  getRecentlyPlayed,
  addRecentlyPlayed as dbAdd,
} from "@/lib/database";
import type { Track } from "@bitperfect/shared/api/types";

export function useRecentlyPlayed() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      const recent = getRecentlyPlayed(20);
      setTracks(recent);
    } catch (error) {
      console.error("Failed to load recently played:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    (track: Track) => {
      dbAdd(track);
      refresh();
    },
    [refresh]
  );

  return { tracks, loading, add, refresh };
}
