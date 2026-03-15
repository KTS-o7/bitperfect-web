"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Track } from "@bitperfect/shared/api";

interface AddToPlaylistContextType {
    isOpen: boolean;
    track: Track | null;
    open: (track: Track) => void;
    close: () => void;
}

const AddToPlaylistContext = createContext<AddToPlaylistContextType | undefined>(undefined);

export function AddToPlaylistProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [track, setTrack] = useState<Track | null>(null);

    const open = useCallback((track: Track) => {
        setTrack(track);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setTrack(null);
    }, []);

    return (
        <AddToPlaylistContext.Provider value={{ isOpen, track, open, close }}>
            {children}
        </AddToPlaylistContext.Provider>
    );
}

export function useAddToPlaylist() {
    const context = useContext(AddToPlaylistContext);
    if (context === undefined) {
        throw new Error("useAddToPlaylist must be used within an AddToPlaylistProvider");
    }
    return context;
}
