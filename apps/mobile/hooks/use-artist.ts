import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Album, Track } from "@bitperfect/shared/api/types";

export function useArtist(artistId: number, artistName: string) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistName) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.searchAlbums(artistName, { limit: 20 }),
      api.searchTracks(artistName, { limit: 10 }),
    ]).then(([albumRes, trackRes]) => {
      if (cancelled) return;
      const artistAlbums = albumRes.items.filter(
        (a) => a.artist?.id === artistId || a.artists?.some((ar) => ar.id === artistId)
      );
      const artistTracks = trackRes.items.filter(
        (t) => t.artist?.id === artistId || t.artists?.some((ar) => ar.id === artistId)
      );
      setAlbums(artistAlbums);
      setTracks(artistTracks);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [artistId, artistName]);

  return { albums, tracks, loading };
}
