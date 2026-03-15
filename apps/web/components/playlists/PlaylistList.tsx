"use client";

import { usePersistence } from "@/contexts/PersistenceContext";
import { Playlist, getPlaylistColor } from "@/lib/storage";
import { getCoverUrl } from "@/lib/api/utils";
import { ListMusic, Plus } from "lucide-react";
import Link from "next/link";

interface PlaylistListProps {
    onCreateClick: () => void;
}

export function PlaylistList({ onCreateClick }: PlaylistListProps) {
    const { playlists } = usePersistence();

    return (
        <div className="space-y-4">
            <button
                onClick={onCreateClick}
                className="w-full flex items-center gap-3 p-4 border border-dashed border-foreground/20 
                           hover:border-foreground/40 transition-colors text-left"
            >
                <Plus className="w-5 h-5 text-foreground/40" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Create New Playlist</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
            </div>
        </div>
    );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
    const gradientColor = getPlaylistColor(playlist.name);
    const firstLetter = playlist.name.charAt(0).toUpperCase();

    return (
        <Link
            href={`/playlist/${playlist.id}`}
            className="group block p-4 border border-foreground/10 hover:border-foreground/30 
                       transition-all hover:bg-foreground/[0.02]"
        >
            <div className="flex items-start gap-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${gradientColor} border border-foreground/10 
                                flex items-center justify-center shrink-0`}>
                    {playlist.coverArt ? (
                        <img
                            src={getCoverUrl(playlist.coverArt, "160")}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : null}
                    {!playlist.coverArt && (
                        <span className="text-2xl font-bold text-white/90">{firstLetter}</span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate group-hover:text-foreground/90">
                        {playlist.name}
                    </h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mt-1">
                        {playlist.trackIds.length} tracks
                    </p>
                    {playlist.description && (
                        <p className="text-[10px] text-foreground/30 truncate mt-1">
                            {playlist.description}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
