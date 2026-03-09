"use client";

import { usePersistence } from "@/contexts/PersistenceContext";
import { Playlist } from "@/lib/storage";
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
                className="w-full flex items-center gap-3 p-4 border border-dashed border-white/20 
                           hover:border-white/40 transition-colors text-left"
            >
                <Plus className="w-5 h-5 text-white/40" />
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
    return (
        <Link
            href={`/playlist/${playlist.id}`}
            className="group block p-4 border border-white/10 hover:border-white/30 
                       transition-all hover:bg-white/[0.02]"
        >
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white/5 border border-white/10 
                                flex items-center justify-center shrink-0">
                    {playlist.coverArt ? (
                        <img
                            src={playlist.coverArt}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <ListMusic className="w-6 h-6 text-white/20" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate group-hover:text-white/90">
                        {playlist.name}
                    </h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">
                        {playlist.trackIds.length} tracks
                    </p>
                    {playlist.description && (
                        <p className="text-[10px] text-white/30 truncate mt-1">
                            {playlist.description}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
