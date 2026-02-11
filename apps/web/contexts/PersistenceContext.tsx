"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage, UserData, DEFAULT_USER_DATA } from "@/lib/storage";
import { Track, Album } from "@bitperfect/shared/api";
import { useToast } from "./ToastContext";

interface PersistenceContextType extends UserData {
    toggleLikeTrack: (track: Track) => void;
    addToHistory: (track: Track) => void;
    toggleSaveAlbum: (album: Album) => void;
    updateSettings: (settings: Partial<UserData["settings"]>) => void;
    clearAll: () => void;
    isLiked: (trackId: number) => boolean;
    isAlbumSaved: (albumId: number) => boolean;
}

const PersistenceContext = createContext<PersistenceContextType | undefined>(undefined);

export function PersistenceProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<UserData>(DEFAULT_USER_DATA);
    const [isLoaded, setIsLoaded] = useState(false);
    const { success, toast } = useToast();

    // Load from storage on mount
    useEffect(() => {
        setData(storage.load());
        setIsLoaded(true);
    }, []);

    // Save to storage whenever data changes
    useEffect(() => {
        if (isLoaded) {
            storage.save(data);
        }
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

    const isLiked = useCallback((trackId: number) => {
        return data.likedTracks.some((t) => t.id === trackId);
    }, [data.likedTracks]);

    const isAlbumSaved = useCallback((albumId: number) => {
        return data.savedAlbums.some((a) => a.id === albumId);
    }, [data.savedAlbums]);

    return (
        <PersistenceContext.Provider
            value={{
                ...data,
                toggleLikeTrack,
                addToHistory,
                toggleSaveAlbum,
                updateSettings,
                clearAll,
                isLiked,
                isAlbumSaved,
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
