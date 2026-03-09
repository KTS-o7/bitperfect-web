"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Plus, Check, X } from "lucide-react";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { motion, AnimatePresence } from "motion/react";

interface AddToPlaylistSheetProps {
    track: Track | null;
    isOpen: boolean;
    onClose: () => void;
}

export function AddToPlaylistSheet({ track, isOpen, onClose }: AddToPlaylistSheetProps) {
    const { playlists, addTrackToPlaylist } = usePersistence();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleAddToPlaylist = (playlistId: string) => {
        if (track) {
            addTrackToPlaylist(playlistId, track);
            onClose();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-[200]"
                            onClick={onClose}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[201] bg-black border-t border-white/10 max-h-[70vh] flex flex-col"
                            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                <h3 className="text-sm font-medium">Add to Playlist</h3>
                                <button onClick={onClose} className="p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1">
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 active:bg-white/5"
                                >
                                    <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-white/40" />
                                    </div>
                                    <span className="text-sm">Create New Playlist</span>
                                </button>

                                {playlists.length === 0 ? (
                                    <div className="p-8 text-center text-white/40 text-xs">
                                        No playlists yet
                                    </div>
                                ) : (
                                    playlists.map((playlist) => (
                                        <button
                                            key={playlist.id}
                                            onClick={() => handleAddToPlaylist(playlist.id)}
                                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 last:border-0 active:bg-white/5"
                                        >
                                            <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                                {playlist.coverArt ? (
                                                    <img
                                                        src={playlist.coverArt}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ListMusic className="w-5 h-5 text-white/20" />
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm truncate">{playlist.name}</div>
                                                <div className="text-xs text-white/40">
                                                    {playlist.trackIds.length} tracks
                                                </div>
                                            </div>
                                            {track && playlist.trackIds.includes(track.id) && (
                                                <Check className="w-5 h-5 text-green-500" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
