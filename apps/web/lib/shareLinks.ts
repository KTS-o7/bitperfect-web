import { Playlist } from "./storage";
import { Track } from "@bitperfect/shared/api";

export interface SharedPlaylist {
    name: string;
    description?: string;
    tracks: Array<{
        id: number;
        title: string;
        artist: string;
        album?: string;
        duration: number;
    }>;
}

export function encodePlaylistForShare(playlist: Playlist, tracks: Track[]): string {
    const shareData: SharedPlaylist = {
        name: playlist.name,
        description: playlist.description,
        tracks: tracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist?.name || "Unknown Artist",
            album: t.album?.title,
            duration: t.duration,
        })),
    };

    const json = JSON.stringify(shareData);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return base64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

export function decodePlaylistFromShare(encoded: string): SharedPlaylist | null {
    try {
        const base64 = encoded
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const padding = base64.length % 4;
        const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;

        const json = decodeURIComponent(escape(atob(paddedBase64)));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function generateShareUrl(playlist: Playlist, tracks: Track[]): string {
    const encoded = encodePlaylistForShare(playlist, tracks);
    return `${typeof window !== "undefined" ? window.location.origin : ""}/playlist/shared#${encoded}`;
}
