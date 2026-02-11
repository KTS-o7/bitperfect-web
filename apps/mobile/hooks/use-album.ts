import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Album, Track } from "@bitperfect/shared/api/types";

export function useAlbum(albumId: number) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getAlbum(albumId).then(({ album, tracks }) => {
      if (cancelled) return;
      setAlbum(album);
      setTracks(tracks);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [albumId]);

  return { album, tracks, loading };
}
