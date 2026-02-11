"use client";

import { usePersistence } from "@/contexts/PersistenceContext";
import {
    useAudioPlayer,
    usePlaybackState,
    useQueue,
} from "@/contexts/AudioPlayerContext";
import { Track } from "@bitperfect/shared/api";
import { Play, Pause, Heart, History, Music2 } from "lucide-react";
import { getTrackTitle, getTrackArtists, formatTime } from "@/lib/api/utils";
import { Header } from "@/components/layout/Header";
import { useState } from "react";

type LibraryTab = "liked" | "history";

export function LibraryClient() {
    const { likedTracks, history, toggleLikeTrack, isLiked } = usePersistence();
    const { isPlaying } = usePlaybackState();
    const { currentTrack } = useQueue();
    const { setQueue, togglePlayPause } = useAudioPlayer();

    const [activeTab, setActiveTab] = useState<LibraryTab>("liked");

    const handlePlayTrack = (track: Track, tracks: Track[], index: number) => {
        if (currentTrack?.id === track.id) {
            togglePlayPause();
        } else {
            setQueue(tracks, index);
        }
    };

    const displayedTracks = activeTab === "liked" ? likedTracks : history;

    return (
        <div className="min-h-screen">
            <Header />

            <div className="max-w-6xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-medium tracking-tight mb-8">Library</h1>

                {/* Library Tabs */}
                <div className="flex items-center gap-8 border-b border-foreground/10 mb-8">
                    <button
                        onClick={() => setActiveTab("liked")}
                        className={`flex items-center gap-2 pb-4 text-xs font-mono uppercase tracking-widest transition-all relative ${activeTab === "liked" ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"
                            }`}
                    >
                        <Heart className={`w-3.5 h-3.5 ${activeTab === "liked" ? "fill-current" : ""}`} />
                        Liked Tracks ({likedTracks.length})
                        {activeTab === "liked" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-2 pb-4 text-xs font-mono uppercase tracking-widest transition-all relative ${activeTab === "history" ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"
                            }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        History ({history.length})
                        {activeTab === "history" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
                    </button>
                </div>

                {/* Tracks List */}
                {displayedTracks.length > 0 ? (
                    <div className="border border-foreground/10">
                        <div className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px] gap-4 px-6 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">#</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Title</span>
                            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40">Artists</span>
                            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">Time</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right"></span>
                        </div>
                        <div>
                            {displayedTracks.map((track, index) => {
                                const isCurrent = currentTrack?.id === track.id;
                                return (
                                    <div
                                        key={`${track.id}-${index}`}
                                        onClick={() => handlePlayTrack(track, displayedTracks, index)}
                                        className={`grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px] gap-4 items-center px-6 py-3 border-b border-foreground/10 last:border-0 cursor-pointer transition-all hover:bg-foreground/[0.02] ${isCurrent ? "border-l-4 border-l-foreground pl-[21px]" : "border-l-4 border-l-transparent"
                                            }`}
                                    >
                                        <div className="text-center font-mono text-xs text-foreground/40">
                                            {String(index + 1).padStart(2, "0")}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{getTrackTitle(track)}</div>
                                            <div className="text-xs text-foreground/50 truncate md:hidden">{getTrackArtists(track)}</div>
                                        </div>
                                        <div className="hidden lg:block text-xs text-foreground/40 truncate">
                                            {getTrackArtists(track)}
                                        </div>
                                        <div className="hidden lg:block text-right font-mono text-xs text-foreground/40 tabular-nums">
                                            {formatTime(track.duration)}
                                        </div>
                                        <div className="text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleLikeTrack(track);
                                                }}
                                                className="p-2 transition-transform active:scale-95 group/heart"
                                                aria-label={isLiked(track.id) ? "Remove from Favorites" : "Add to Favorites"}
                                            >
                                                <Heart
                                                    className={`w-3.5 h-3.5 transition-all ${isLiked(track.id)
                                                        ? "fill-red-500 text-red-500 scale-110"
                                                        : "text-foreground/20 group-hover/heart:text-foreground/40 group-hover/heart:scale-110"
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-foreground/20 border border-dashed border-foreground/10">
                        <Music2 className="w-12 h-12 mb-4" />
                        <p className="text-sm font-mono uppercase tracking-widest">No tracks found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
