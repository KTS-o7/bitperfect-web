"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { storage, UserData, DEFAULT_USER_DATA, Playlist } from "@/lib/storage";
import { Track, Album } from "@bitperfect/shared/api";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { syncToCloud } from "@/lib/db/sync";

interface PersistenceContextType extends UserData {
    toggleLikeTrack: (track: Track) => void;
    addToHistory: (track: Track) => void;
    toggleSaveAlbum: (album: Album) => void;
    updateSettings: (settings: Partial<UserData["settings"]>) => void;
    clearAll: () => void;
    isLiked: (trackId: number) => boolean;
    isAlbumSaved: (albumId: number) => boolean;
    createPlaylist: (name: string, description?: string) => Playlist;
    deletePlaylist: (playlistId: string) => void;
    addTrackToPlaylist: (playlistId: string, track: Track) => void;
    removeTrackFromPlaylist: (playlistId: string, trackId: number) => void;
    reorderPlaylistTracks: (playlistId: string, trackIds: number[]) => void;
    updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
    getPlaylist: (playlistId: string) => Playlist | undefined;
    reloadFromStorage: () => void;
}

const PersistenceContext = createContext<PersistenceContextType | undefined>(undefined);

export function PersistenceProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<UserData>(DEFAULT_USER_DATA);
    const [isLoaded, setIsLoaded] = useState(false);
    const likedTrackIdSet = useMemo(
        () => new Set(data.likedTracks.map((t) => t.id)),
        [data.likedTracks]
    );
    const { success, toast } = useToast();
    const { isAuthenticated } = useAuth();
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const latestDataRef = useRef(data);

    // Load from storage on mount
    useEffect(() => {
        setData(storage.load());
        setIsLoaded(true);
    }, []);

    // Always-current data ref — updated synchronously on every render
    useEffect(() => {
        latestDataRef.current = data;
    });

    // Flush latest data to storage on unmount only
    useEffect(() => {
        return () => {
            storage.save(latestDataRef.current);
        };
    }, []); // empty deps = unmount only

    // Note: Sync is now manual only (on login/logout and via button)
    // to avoid hitting rate limits

    // Save to storage whenever data changes (debounced by 500ms)
    useEffect(() => {
        if (!isLoaded) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            storage.save(data);
        }, 500);

        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                // No flush here — the unmount effect handles that
            }
        };
    }, [data, isLoaded]);

    const toggleLikeTrack = useCallback((track: Track) => {
        const isCurrentlyLiked = data.likedTracks.some((t) => t.id === track.id);

        setData((prev) => {
            const newLiked = isCurrentlyLiked
                ? prev.likedTracks.filter((t) => t.id !== track.id)
                : [track, ...prev.likedTracks];
            return { ...prev, likedTracks: newLiked };
        });

        if (isCurrentlyLiked) {
            success(`Removed ${track.title} from favorites`);
        } else {
            success(`Added ${track.title} to favorites`);
        }
    }, [data.likedTracks, success]);

    const addToHistory = useCallback((track: Track) => {
        setData((prev) => {
            const filtered = prev.history.filter((t) => t.id !== track.id);
            const newHistory = [track, ...filtered].slice(0, 100); // Keep last 100
            return { ...prev, history: newHistory };
        });
    }, []);

    const toggleSaveAlbum = useCallback((album: Album) => {
        const isCurrentlySaved = data.savedAlbums.some((a) => a.id === album.id);

        setData((prev) => {
            const newSaved = isCurrentlySaved
                ? prev.savedAlbums.filter((a) => a.id !== album.id)
                : [album, ...prev.savedAlbums];
            return { ...prev, savedAlbums: newSaved };
        });

        if (isCurrentlySaved) {
            success(`Removed ${album.title} from library`);
        } else {
            success(`Saved ${album.title} to library`);
        }
    }, [data.savedAlbums, success]);

    const updateSettings = useCallback((settings: Partial<UserData["settings"]>) => {
        setData((prev) => ({
            ...prev,
            settings: { ...prev.settings, ...settings },
        }));
    }, []);

    const clearAll = useCallback(() => {
        setData(DEFAULT_USER_DATA);
        storage.clear();
        success("All local data has been cleared");
    }, [success]);

    const reloadFromStorage = useCallback(() => {
        setData(storage.load());
    }, []);

    const isLiked = useCallback((trackId: number) => {
        return likedTrackIdSet.has(trackId);
    }, [likedTrackIdSet]);

    const isAlbumSaved = useCallback((albumId: number) => {
        return data.savedAlbums.some((a) => a.id === albumId);
    }, [data.savedAlbums]);

    const createPlaylist = useCallback((name: string, description?: string) => {
        const newPlaylist: Playlist = {
            id: crypto.randomUUID(),
            name,
            description,
            trackIds: [],
            tracks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setData((prev) => ({
            ...prev,
            playlists: [newPlaylist, ...prev.playlists],
        }));

        success(`Created playlist "${name}"`);
        return newPlaylist;
    }, [success]);

    const deletePlaylist = useCallback((playlistId: string) => {
        setData((prev) => ({
            ...prev,
            playlists: prev.playlists.filter((p) => p.id !== playlistId),
        }));
        success("Playlist deleted");
    }, [success]);

    const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
        setData((prev) => {
            const playlist = prev.playlists.find((p) => p.id === playlistId);
            if (!playlist) return prev;

            if (playlist.trackIds.includes(track.id)) {
                toast("Track already in playlist", "info");
                return prev;
            }

            // Extract minimal track data for storage
            const playlistTrack = {
                id: track.id,
                title: track.title,
                duration: track.duration,
                artist: track.artist,
                artists: track.artists,
                album: track.album,
            };

            // Only save cover if it's a valid string
            const newCoverArt = track.album?.cover;
            const isValidCover = typeof newCoverArt === 'string' && newCoverArt.length > 0;

            const updatedPlaylists = prev.playlists.map((p) =>
                p.id === playlistId
                    ? {
                        ...p,
                        trackIds: [...p.trackIds, track.id],
                        tracks: [...(p.tracks || []), playlistTrack],
                        updatedAt: new Date().toISOString(),
                        coverArt: p.coverArt || (isValidCover ? newCoverArt : undefined),
                    }
                    : p
            );

            return { ...prev, playlists: updatedPlaylists };
        });

        success("Added to playlist");
    }, [success, toast]);

    const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: number) => {
        setData((prev) => ({
            ...prev,
            playlists: prev.playlists.map((p) =>
                p.id === playlistId
                    ? {
                        ...p,
                        trackIds: p.trackIds.filter((id) => id !== trackId),
                        tracks: (p.tracks || []).filter((t) => t.id !== trackId),
                        updatedAt: new Date().toISOString(),
                    }
                    : p
            ),
        }));
    }, []);

    const reorderPlaylistTracks = useCallback((playlistId: string, trackIds: number[]) => {
        setData((prev) => ({
            ...prev,
            playlists: prev.playlists.map((p) =>
                p.id === playlistId
                    ? { ...p, trackIds, updatedAt: new Date().toISOString() }
                    : p
            ),
        }));
    }, []);

    const updatePlaylist = useCallback((playlistId: string, updates: Partial<Playlist>) => {
        setData((prev) => ({
            ...prev,
            playlists: prev.playlists.map((p) =>
                p.id === playlistId
                    ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                    : p
            ),
        }));
    }, []);

    const playlistsRef = useRef(data.playlists);
    useEffect(() => {
        playlistsRef.current = data.playlists;
    });

    const getPlaylist = useCallback((playlistId: string) => {
        return playlistsRef.current.find((p) => p.id === playlistId);
    }, []); // stable — reads from ref, no deps

    return (
        <PersistenceContext.Provider
            value={{
                ...data,
                toggleLikeTrack,
                addToHistory,
                toggleSaveAlbum,
                updateSettings,
                clearAll,
                reloadFromStorage,
                isLiked,
                isAlbumSaved,
                createPlaylist,
                deletePlaylist,
                addTrackToPlaylist,
                removeTrackFromPlaylist,
                reorderPlaylistTracks,
                updatePlaylist,
                getPlaylist,
            }}
        >
            {children}
        </PersistenceContext.Provider>
    );
}

export function usePersistence() {
    const context = useContext(PersistenceContext);
    if (context === undefined) {
        throw new Error("usePersistence must be used within a PersistenceProvider");
    }
    return context;
}
