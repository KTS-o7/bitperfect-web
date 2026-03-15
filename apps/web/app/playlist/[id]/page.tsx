import { api } from "@/lib/api";
import { PlaylistClient } from "./PlaylistClient";
import { PlaylistClient as LocalPlaylistClient } from "./PlaylistClientLocal";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PlaylistPageProps {
    params: Promise<{ id: string }>;
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
    const { id } = await params;
    const playlistId = decodeURIComponent(id);

    // Check if this is a local playlist (user-created)
    if (playlistId.startsWith("playlist-")) {
        return <LocalPlaylistClient playlistId={playlistId} />;
    }

    // Otherwise, fetch from API (TIDAL)
    try {
        const playlistData = await api.getPlaylist(playlistId);

        if (!playlistData) {
            notFound();
        }

        return <PlaylistClient playlistData={playlistData} />;
    } catch (error) {
        console.error("Failed to load playlist:", error);
        notFound();
    }
}

export async function generateMetadata({
    params,
}: PlaylistPageProps): Promise<Metadata> {
    const { id } = await params;
    const playlistId = decodeURIComponent(id);

    // Local playlist metadata
    if (playlistId.startsWith("playlist-")) {
        return {
            title: "My Playlist",
        };
    }

    try {
        const playlistData = await api.getPlaylist(playlistId);
        return {
            title: `${playlistData.playlist.title} - Playlist`,
            description: `Listen to ${playlistData.playlist.title}`,
        };
    } catch {
        return {
            title: "Playlist Detail",
        };
    }
}
