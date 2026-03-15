import { useState, useEffect, useCallback } from "react";
import { Track } from "@bitperfect/shared/api";
import { api } from "@/lib/api";
import { playlistTrackCache } from "@/lib/playlistCache";

interface UsePlaylistTracksResult {
    tracks: Track[];
    isLoading: boolean;
    loadTracks: (trackIds: number[]) => Promise<void>;
    loadTrack: (trackId: number) => Promise<Track | null>;
}

export function usePlaylistTracks(): UsePlaylistTracksResult {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadTrack = useCallback(async (trackId: number): Promise<Track | null> => {
        const cached = playlistTrackCache.get(trackId);
        if (cached) {
            return cached;
        }

        try {
            const track = await api.getTrack(trackId);
            if (track) {
                playlistTrackCache.set(trackId, track);
            }
            return track;
        } catch (error) {
            console.error("[usePlaylistTracks] Failed to load track:", trackId, error);
            return null;
        }
    }, []);

    const loadTracks = useCallback(async (trackIds: number[]) => {
        const numericTrackIds = trackIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
        setIsLoading(true);
        setTracks([]);

        const loadedTracks: Track[] = [];
        const batchSize = 10;

        for (let i = 0; i < numericTrackIds.length; i += batchSize) {
            const batch = numericTrackIds.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map((id) => loadTrack(id))
            );
            
            loadedTracks.push(...batchResults.filter((t): t is Track => t !== null));

            setTracks([...loadedTracks]);
        }

        setIsLoading(false);
    }, [loadTrack]);

    return { tracks, isLoading, loadTracks, loadTrack };
}
