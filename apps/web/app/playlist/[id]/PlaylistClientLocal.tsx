"use client";

import { useEffect, useState, useCallback } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { Header } from "@/components/layout/Header";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Play, Share2, Trash2, MoreVertical, Heart, Camera } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatTime, getTrackTitle, getTrackArtists } from "@/lib/api/utils";
import { generateShareUrl } from "@/lib/shareLinks";
import { useToast } from "@/contexts/ToastContext";
import { PlaylistQRCode } from "@/components/playlists/PlaylistQRCode";
import { QRScanner } from "@/components/playlists/QRScanner";
import { AudioPlayer } from "@/components/player/AudioPlayer";

interface PlaylistClientProps {
    playlistId: string;
}

export function PlaylistClient({ playlistId }: PlaylistClientProps) {
    const { getPlaylist, deletePlaylist, removeTrackFromPlaylist, toggleLikeTrack, isLiked } = usePersistence();
    const { tracks, isLoading, loadTracks } = usePlaylistTracks();
    const { setQueue } = useAudioPlayer();
    const { success } = useToast();
    const [playlist, setPlaylist] = useState(() => getPlaylist(playlistId));
    const [showMenu, setShowMenu] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (playlist) {
            loadTracks(playlist.trackIds);
        }
    }, [playlist, loadTracks]);

    const handlePlayAll = useCallback(() => {
        if (tracks.length > 0) {
            setQueue(tracks, 0);
        }
    }, [tracks, setQueue]);

    const handleShare = useCallback(() => {
        if (!playlist) return;

        if (tracks.length > 10) {
            setShowQRCode(true);
        } else {
            const url = generateShareUrl(playlist, tracks);
            navigator.clipboard.writeText(url);
            success("Playlist link copied to clipboard!");
        }
    }, [playlist, tracks, success]);

    const handleDelete = useCallback(() => {
        if (confirm("Are you sure you want to delete this playlist?")) {
            deletePlaylist(playlistId);
            window.location.href = "/library";
        }
    }, [deletePlaylist, playlistId]);

    const handlePlayTrack = useCallback((track: Track, index: number) => {
        setQueue(tracks, index);
    }, [tracks, setQueue]);

    if (!playlist) {
        return (
            <div className="min-h-screen">
                <Header showBack />
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <p className="text-white/50">Playlist not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground transition-colors duration-300">
            <Header showBack />

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    <div className="w-40 h-40 bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {playlist.coverArt ? (
                            <img
                                src={playlist.coverArt}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <ListMusic className="w-16 h-16 text-white/20" />
                        )}
                    </div>

                    <div className="flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">
                            Playlist
                        </p>
                        <h1 className="text-3xl font-medium mb-2">{playlist.name}</h1>
                        {playlist.description && (
                            <p className="text-sm text-white/60 mb-4">{playlist.description}</p>
                        )}
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                            {playlist.trackIds.length} tracks
                        </p>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handlePlayAll}
                                disabled={tracks.length === 0}
                                className="flex items-center gap-2 px-6 py-2 border border-white 
                                           hover:bg-white/10 disabled:opacity-50 text-[10px] 
                                           font-mono uppercase tracking-widest"
                            >
                                <Play className="w-4 h-4" />
                                Play All
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 border border-white/20 
                                           hover:border-white/40 text-[10px] 
                                           font-mono uppercase tracking-widest"
                            >
                                <Share2 className="w-4 h-4" />
                                {tracks.length > 10 ? "QR Code" : "Share"}
                            </button>
                            <button
                                onClick={() => setShowScanner(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-white/20 
                                           hover:border-white/40 text-[10px] 
                                           font-mono uppercase tracking-widest"
                            >
                                <Camera className="w-4 h-4" />
                                Scan
                            </button>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 border border-white/20 hover:border-white/40"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {showMenu && (
                            <div className="mt-2 w-48 bg-black border border-white/10">
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left 
                                               hover:bg-red-500/10 text-red-500 text-[10px] 
                                               font-mono uppercase tracking-widest"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Playlist
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border border-white/10">
                    <div className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px_40px] 
                                    gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.02]">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                            #
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                            Title
                        </span>
                        <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest 
                                        text-white/40">
                            Artists
                        </span>
                        <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest 
                                        text-white/40 text-right">
                            Time
                        </span>
                        <span></span>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-white/40 text-[10px] font-mono uppercase tracking-widest">
                            Loading tracks...
                        </div>
                    ) : tracks.length === 0 ? (
                        <div className="p-8 text-center text-white/40 text-[10px] font-mono uppercase tracking-widest">
                            No tracks in this playlist
                        </div>
                    ) : (
                        tracks.map((track, index) => (
                            <PlaylistTrackRow
                                key={track.id}
                                track={track}
                                index={index}
                                onRemove={() => removeTrackFromPlaylist(playlistId, track.id)}
                                onPlay={() => handlePlayTrack(track, index)}
                                isLiked={isLiked(track.id)}
                                onToggleLike={() => toggleLikeTrack(track)}
                            />
                        ))
                    )}
                </div>
            </div>

            <PlaylistQRCode
                playlist={playlist}
                tracks={tracks}
                isOpen={showQRCode}
                onClose={() => setShowQRCode(false)}
            />

            <QRScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={(data) => {
                    window.location.href = `/playlist/shared#${data}`;
                }}
            />

            <AudioPlayer />
        </div>
    );
}

function PlaylistTrackRow({
    track,
    index,
    onRemove,
    onPlay,
    isLiked,
    onToggleLike,
}: {
    track: Track;
    index: number;
    onRemove: () => void;
    onPlay: () => void;
    isLiked: boolean;
    onToggleLike: () => void;
}) {
    return (
        <div
            className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px_40px] 
                        gap-4 items-center px-6 py-3 border-b border-white/10 
                        last:border-0 cursor-pointer hover:bg-white/[0.02]"
            onClick={onPlay}
        >
            <div className="text-center font-mono text-xs text-white/40">
                {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-medium truncate">{getTrackTitle(track)}</div>
                <div className="text-xs text-white/50 truncate md:hidden">
                    {getTrackArtists(track)}
                </div>
            </div>
            <div className="hidden lg:block text-xs text-white/40 truncate">
                {getTrackArtists(track)}
            </div>
            <div className="hidden lg:block text-right font-mono text-xs text-white/40 tabular-nums">
                {formatTime(track.duration)}
            </div>
            <div className="text-right flex items-center justify-end gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike();
                    }}
                    className="p-2 transition-transform active:scale-95 group/heart"
                >
                    <Heart
                        className={`w-3.5 h-3.5 transition-all ${
                            isLiked
                                ? "fill-red-500 text-red-500 scale-110"
                                : "text-white/20 group-hover/heart:text-white/40"
                        }`}
                    />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
