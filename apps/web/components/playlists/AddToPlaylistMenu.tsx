"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Plus, Check } from "lucide-react";
import { CreatePlaylistModal } from "./CreatePlaylistModal";

interface AddToPlaylistMenuProps {
    track: Track;
    isOpen: boolean;
    onClose: () => void;
}

export function AddToPlaylistMenu({ track, isOpen, onClose }: AddToPlaylistMenuProps) {
    const { playlists, addTrackToPlaylist } = usePersistence();
    const [showCreateModal, setShowCreateModal] = useState(false);

    if (!isOpen) return null;

    const handleAddToPlaylist = (playlistId: string) => {
        addTrackToPlaylist(playlistId, track);
        onClose();
    };

    return (
        <>
            <div className="absolute right-0 top-full mt-1 w-64 bg-black border border-white/10 z-50">
                <div className="p-2 border-b border-white/10">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left 
                                   hover:bg-white/[0.02] text-[10px] font-mono uppercase tracking-widest"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Playlist
                    </button>
                </div>

                <div className="max-h-64 overflow-y-auto">
                    {playlists.length === 0 ? (
                        <div className="p-4 text-center text-[10px] font-mono uppercase tracking-widest text-white/40">
                            No playlists yet
                        </div>
                    ) : (
                        playlists.map((playlist) => (
                            <button
                                key={playlist.id}
                                onClick={() => handleAddToPlaylist(playlist.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left 
                                           hover:bg-white/[0.02] text-[10px] font-mono uppercase tracking-widest"
                            >
                                <ListMusic className="w-4 h-4 text-white/40" />
                                <span className="flex-1 truncate">{playlist.name}</span>
                                {playlist.trackIds.includes(track.id) && (
                                    <Check className="w-4 h-4 text-green-500" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            <CreatePlaylistModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    onClose();
                }}
            />
        </>
    );
}
