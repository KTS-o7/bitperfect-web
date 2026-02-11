"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlaylistResponse, Track } from "@bitperfect/shared/api";
import {
    useAudioPlayer,
    usePlaybackState,
    useQueue,
} from "@/contexts/AudioPlayerContext";
import { Play, Pause, ListMusic, Heart } from "lucide-react";
import { getTrackTitle, getTrackArtists, formatTime } from "@/lib/api/utils";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import { Header } from "@/components/layout/Header";
import { usePersistence } from "@/contexts/PersistenceContext";

interface PlaylistClientProps {
    playlistData: PlaylistResponse;
}

export function PlaylistClient({ playlistData }: PlaylistClientProps) {
    const router = useRouter();
    const { isPlaying } = usePlaybackState();
    const { currentTrack } = useQueue();
    const { setQueue, togglePlayPause } = useAudioPlayer();
    const { toggleLikeTrack, isLiked } = usePersistence();

    const { playlist, tracks } = playlistData;

    const handlePlayPlaylist = () => {
        if (tracks.length > 0) {
            setQueue(tracks, 0);
        }
    };

    const handlePlayTrack = (track: Track, index: number) => {
        if (currentTrack?.id === track.id) {
            togglePlayPause();
        } else {
            setQueue(tracks, index);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground transition-colors duration-300">
            <Header showBack />

            {/* Content Container */}
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Playlist Header Section */}
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-12 pb-8 border-b border-foreground/10">
                    <div className="relative shrink-0 w-[200px] md:w-[240px] aspect-square border border-foreground/10 overflow-hidden bg-foreground/5 flex items-center justify-center">
                        <ListMusic className="w-20 h-20 text-foreground/20" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-3">
                            Playlist
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-foreground tracking-tight leading-tight mb-4">
                            {playlist.title}
                        </h1>
                        {playlist.description && (
                            <p className="text-sm text-foreground/50 mb-6 line-clamp-2 max-w-2xl italic">
                                {playlist.description}
                            </p>
                        )}

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handlePlayPlaylist}
                                className="px-6 py-3 border-2 border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground transition-all flex items-center gap-2 font-mono uppercase text-xs tracking-widest"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>Play Playlist</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tracks Section */}
                <section>
                    <div className="border border-foreground/10">
                        <div className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px_40px] gap-4 px-6 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">#</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Title</span>
                            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40">Artists</span>
                            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">Time</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right"></span>
                        </div>
                        <div>
                            {tracks.map((track, index) => {
                                const isCurrent = currentTrack?.id === track.id;
                                return (
                                    <div
                                        key={`${track.id}-${index}`}
                                        onClick={() => handlePlayTrack(track, index)}
                                        className={`grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px_40px] gap-4 items-center px-6 py-3 border-b border-foreground/10 last:border-0 cursor-pointer transition-all hover:bg-foreground/[0.02] ${isCurrent ? "border-l-4 border-l-foreground pl-[21px]" : "border-l-4 border-l-transparent"
                                            }`}
                                    >
                                        <div className="text-center font-mono text-xs text-foreground/40">
                                            {String(index + 1).padStart(2, "0")}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{getTrackTitle(track)}</div>
                                            <div className="text-xs text-foreground/50 truncate md:hidden">{getTrackArtists(track)}</div>
                                        </div>
                                        <div className="hidden lg:block text-xs text-foreground/40 truncate min-w-0">
                                            <span className="truncate block">{getTrackArtists(track)}</span>
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
                </section>
            </div>

            <AudioPlayer />
        </div>
    );
}
