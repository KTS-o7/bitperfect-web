// apps/web/app/playlist/[id]/PlaylistClientLocal.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Header } from "@/components/layout/Header";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Play, Share2, Trash2, MoreVertical, Heart, Camera } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatTime, getTrackTitle, getTrackArtists } from "@/lib/api/utils";
import { generateShareUrl } from "@/lib/shareLinks";
import { getPlaylistColor, PlaylistTrack } from "@/lib/storage";
import { getCoverUrl } from "@/lib/api/utils";
import { useToast } from "@/contexts/ToastContext";
import { PlaylistQRCode } from "@/components/playlists/PlaylistQRCode";
import { QRScanner } from "@/components/playlists/QRScanner";
import { AudioPlayer } from "@/components/player/AudioPlayer";

interface PlaylistClientProps {
    playlistId: string;
}

// Convert stored PlaylistTrack to Track format
function convertToTrack(playlistTrack: PlaylistTrack): Track {
    return {
        id: playlistTrack.id,
        title: playlistTrack.title,
        duration: playlistTrack.duration,
        artist: playlistTrack.artist,
        artists: playlistTrack.artists,
        album: playlistTrack.album,
    } as Track;
}

export function PlaylistClient({ playlistId }: PlaylistClientProps) {
    const { getPlaylist, deletePlaylist, removeTrackFromPlaylist, toggleLikeTrack, isLiked } = usePersistence();
    const { setQueue } = useAudioPlayer();
    const { success } = useToast();
    const [playlist, setPlaylist] = useState(() => getPlaylist(playlistId));
    const [showMenu, setShowMenu] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        // Refresh playlist data when it changes in persistence
        const refreshedPlaylist = getPlaylist(playlistId);
        if (refreshedPlaylist) {
            setPlaylist(refreshedPlaylist);
        }
    }, [playlistId, getPlaylist]);

    // Convert stored tracks to Track format
    const tracks = playlist?.tracks?.map(convertToTrack) || [];

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
                    <p className="text-foreground/50">Playlist not found</p>
                </div>
            </div>
        );
    }

    const firstLetter = playlist.name.charAt(0).toUpperCase();

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground transition-colors duration-300">
            <Header showBack />

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    <div className={`w-40 h-40 bg-gradient-to-br ${getPlaylistColor(playlist.name)} border border-foreground/10 flex items-center justify-center shrink-0`}>
                        {playlist.coverArt ? (
                            <img
                                src={getCoverUrl(playlist.coverArt, "320")}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Hide image on error, show first letter instead
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : null}
                        {!playlist.coverArt && (
                            <span className="text-5xl font-bold text-white/90">{firstLetter}</span>
                        )}
                    </div>

                    <div className="flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mb-2">
                            Playlist
                        </p>
                        <h1 className="text-3xl font-medium mb-2">{playlist.name}</h1>
                        {playlist.description && (
                            <p className="text-sm text-foreground/60 mb-4">{playlist.description}</p>
                        )}
                        <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                            {playlist.trackIds.length} tracks
                        </p>

                        <div className="flex flex-wrap gap-3 mt-6">
                            <button
                                onClick={handlePlayAll}
                                disabled={tracks.length === 0}
                                className="flex items-center gap-2 px-6 py-2 border border-foreground 
                                           hover:bg-foreground/10 disabled:opacity-50 text-[10px] 
                                           font-mono uppercase tracking-widest"
                            >
                                <Play className="w-4 h-4" />
                                Play All
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 border border-foreground/20 
                                           hover:border-foreground/40 text-[10px] 
                                           font-mono uppercase tracking-widest"
                            >
                                <Share2 className="w-4 h-4" />
                                {tracks.length > 10 ? "QR Code" : "Share"}
                            </button>
                            <button
                                onClick={() => setShowScanner(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-foreground/20 
                                           hover:border-foreground/40 text-[10px] 
                                           font-mono uppercase tracking-widest"
                            >
                                <Camera className="w-4 h-4" />
                                Scan
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-2 border border-foreground/20 hover:border-foreground/40"
                                    aria-label="More options"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-48 border border-foreground/10 bg-background shadow-lg z-10">
                                        <button
                                            onClick={() => {
                                                handleDelete();
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-red-500 
                                                       hover:bg-foreground/5 text-[10px] font-mono uppercase tracking-widest"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Playlist
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border border-foreground/10">
                    {/* Header */}
                    <div className="flex gap-4 px-6 py-3 border-b border-foreground/10 bg-foreground/[0.02] text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                        <span className="w-8 text-center">#</span>
                        <span className="flex-1">Title</span>
                        <span className="hidden lg:block w-48">Artists</span>
                        <span className="hidden lg:block w-20 text-right">Time</span>
                        <span className="w-20 text-right"></span>
                    </div>

                    {tracks.length === 0 ? (
                        <div className="p-8 text-center text-foreground/40 text-[10px] font-mono uppercase tracking-widest">
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
            className="flex gap-4 items-center px-6 py-3 border-b border-foreground/10 
                        last:border-0 cursor-pointer hover:bg-foreground/[0.02]"
            onClick={onPlay}
        >
            <div className="w-8 text-center font-mono text-xs text-foreground/40">
                {String(index + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{getTrackTitle(track)}</div>
            </div>
            <div className="hidden lg:block w-48 text-xs text-foreground/40 truncate">
                {getTrackArtists(track)}
            </div>
            <div className="hidden lg:block w-20 text-right font-mono text-xs text-foreground/40 tabular-nums">
                {formatTime(track.duration)}
            </div>
            <div className="w-20 flex items-center justify-end gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike();
                    }}
                    className="p-2 transition-transform active:scale-95 group/heart"
                >
                    <Heart
                        className={`w-4 h-4 transition-all ${isLiked
                            ? "fill-red-500 text-red-500 scale-110"
                            : "text-foreground/20 group-hover/heart:text-foreground/40 group-hover/heart:scale-110"
                            }`}
                    />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-2 text-foreground/20 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
