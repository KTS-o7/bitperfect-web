"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { X } from "lucide-react";

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const { createPlaylist } = usePersistence();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            createPlaylist(name.trim(), description.trim() || undefined);
            setName("");
            setDescription("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="w-full max-w-md mx-4 bg-black border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-medium">Create Playlist</h2>
                    <button onClick={onClose} className="p-1 hover:text-white/70">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest 
                                          text-white/40 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Playlist"
                            className="w-full px-3 py-2 bg-transparent border border-white/20 
                                       focus:border-white outline-none text-sm"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest 
                                          text-white/40 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            rows={3}
                            className="w-full px-3 py-2 bg-transparent border border-white/20 
                                       focus:border-white outline-none text-sm resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-white/20 
                                       hover:border-white/40 text-[10px] 
                                       font-mono uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 px-4 py-2 border border-white 
                                       hover:bg-white/10 disabled:opacity-50 text-[10px] 
                                       font-mono uppercase tracking-widest"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
