"use client";

import { useEffect, useState } from "react";
import { decodePlaylistFromShare, SharedPlaylist } from "@/lib/shareLinks";
import { Header } from "@/components/layout/Header";
import { ListMusic, Play, Plus } from "lucide-react";
import { useAudioPlayerActions } from "@/contexts/AudioPlayerContext";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Track } from "@bitperfect/shared/api";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

export default function SharedPlaylistPage() {
    const [playlist, setPlaylist] = useState<SharedPlaylist | null>(null);
    const [isValid, setIsValid] = useState(true);
    const { setQueue } = useAudioPlayerActions();
    const { createPlaylist, addTrackToPlaylist } = usePersistence();

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const decoded = decodePlaylistFromShare(hash);
            if (decoded) {
                setPlaylist(decoded);
            } else {
                setIsValid(false);
            }
        } else {
            setIsValid(false);
        }
    }, []);

    const handlePlayAll = () => {
        if (playlist) {
            const tracks = playlist.tracks.map((t) => ({
                id: t.id,
                title: t.title,
                duration: t.duration,
                artist: { name: t.artist },
                album: { title: t.album },
            })) as Track[];
            setQueue(tracks, 0);
        }
    };

    const handleSaveToLibrary = async () => {
        if (!playlist) return;

        const newPlaylist = createPlaylist(playlist.name, playlist.description);

        for (const track of playlist.tracks) {
            const fullTrack: Track = {
                id: track.id,
                title: track.title,
                duration: track.duration,
                artist: { name: track.artist },
                album: { title: track.album },
            } as Track;

            addTrackToPlaylist(newPlaylist.id, fullTrack);
        }

        window.location.href = `/playlist/${newPlaylist.id}`;
    };

    if (!isValid) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-background text-foreground">
                    <Header showBack />
                    <div className="max-w-6xl mx-auto px-6 py-8 text-center">
                        <h1 className="text-2xl font-medium mb-4">Invalid Playlist Link</h1>
                        <p className="text-foreground/50 mb-6 text-[10px] font-mono uppercase tracking-widest">
                            This playlist link appears to be invalid or expired.
                        </p>
                        <Link
                            href="/"
                            className="px-6 py-2 border border-foreground hover:bg-foreground/10 text-[10px] font-mono uppercase tracking-widest"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!playlist) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-background text-foreground">
                    <Header showBack />
                    <div className="max-w-6xl mx-auto px-6 py-8 text-center">
                        <p className="text-foreground/40 text-[10px] font-mono uppercase tracking-widest">Loading...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
        <div className="relative min-h-screen w-full bg-background text-foreground transition-colors duration-300">
            <Header showBack />

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    <div className="w-40 h-40 bg-foreground/5 border border-foreground/10 flex items-center justify-center shrink-0">
                        <ListMusic className="w-16 h-16 text-foreground/20" />
                    </div>

                    <div className="flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mb-2">
                            Shared Playlist
                        </p>
                        <h1 className="text-3xl font-medium mb-2">{playlist.name}</h1>
                        {playlist.description && (
                            <p className="text-sm text-foreground/60 mb-4">{playlist.description}</p>
                        )}
                        <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                            {playlist.tracks.length} tracks
                        </p>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handlePlayAll}
                                className="flex items-center gap-2 px-6 py-2 border border-foreground hover:bg-foreground/10 text-[10px] font-mono uppercase tracking-widest"
                            >
                                <Play className="w-4 h-4" />
                                Play All
                            </button>
                            <button
                                onClick={handleSaveToLibrary}
                                className="flex items-center gap-2 px-4 py-2 border border-foreground/20 hover:border-foreground/40 text-[10px] font-mono uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" />
                                Save to Library
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border border-foreground/10">
                    <div className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px] gap-4 px-6 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">#</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Title</span>
                        <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40">Artists</span>
                        <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">Time</span>
                    </div>

                    {playlist.tracks.map((track, index) => (
                        <div
                            key={track.id}
                            className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px] gap-4 items-center px-6 py-3 border-b border-foreground/10 last:border-0 cursor-pointer hover:bg-foreground/[0.02]"
                        >
                            <div className="text-center font-mono text-xs text-foreground/40">
                                {String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{track.title}</div>
                                <div className="text-xs text-foreground/50 truncate md:hidden">
                                    {track.artist}
                                </div>
                            </div>
                            <div className="hidden lg:block text-xs text-foreground/40 truncate">
                                {track.artist}
                            </div>
                            <div className="hidden lg:block text-right font-mono text-xs text-foreground/40 tabular-nums">
                                {formatTime(track.duration)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </AppLayout>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}
