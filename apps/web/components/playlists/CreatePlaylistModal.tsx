"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const { createPlaylist } = usePersistence();
    const shouldReduceMotion = useReducedMotion();

    const springTransition = shouldReduceMotion
        ? { duration: 0 as const }
        : { type: "spring" as const, damping: 25, stiffness: 300 };

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
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[250] md:hidden"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 100 }}
                        transition={springTransition}
                        className="fixed bottom-0 left-0 right-0 z-[251] bg-background border-t border-foreground/10 md:hidden touch-manipulation"
                        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Create playlist"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-foreground/10">
                            <h2 className="text-sm font-medium">Create Playlist</h2>
                            <button onClick={onClose} className="p-1" aria-label="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest 
                                                  text-foreground/40 mb-2">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Awesome Playlist"
                                    className="w-full px-3 py-2 bg-transparent border border-foreground/20 
                                               focus:border-foreground outline-none text-sm"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest 
                                                  text-foreground/40 mb-2">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description..."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-transparent border border-foreground/20 
                                               focus:border-foreground outline-none text-sm resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-foreground/20 
                                               hover:border-foreground/40 text-[10px] 
                                               font-mono uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim()}
                                    className="flex-1 px-4 py-2 border border-foreground 
                                               hover:bg-foreground/10 disabled:opacity-50 text-[10px] 
                                               font-mono uppercase tracking-widest"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Desktop Modal */}
                    <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/80 overflow-y-auto">
                        <div className="w-full max-w-md mx-4 my-8 bg-background border border-foreground/10 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-medium">Create Playlist</h2>
                                <button onClick={onClose} className="p-1 hover:text-foreground/70" aria-label="Close">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest 
                                                      text-foreground/40 mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="My Awesome Playlist"
                                        className="w-full px-3 py-2 bg-transparent border border-foreground/20 
                                                   focus:border-foreground outline-none text-sm"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest 
                                                      text-foreground/40 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a description..."
                                        rows={3}
                                        className="w-full px-3 py-2 bg-transparent border border-foreground/20 
                                                   focus:border-foreground outline-none text-sm resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 border border-foreground/20 
                                                   hover:border-foreground/40 text-[10px] 
                                                   font-mono uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!name.trim()}
                                        className="flex-1 px-4 py-2 border border-foreground 
                                                   hover:bg-foreground/10 disabled:opacity-50 text-[10px] 
                                                   font-mono uppercase tracking-widest"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
