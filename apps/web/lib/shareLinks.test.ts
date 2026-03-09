import { describe, it, expect } from "vitest";
import { encodePlaylistForShare, decodePlaylistFromShare, SharedPlaylist } from "./shareLinks";
import { Playlist } from "./storage";
import { Track } from "@bitperfect/shared/api";

describe("shareLinks", () => {
    const mockPlaylist: Playlist = {
        id: "test-123",
        name: "My Test Playlist",
        description: "A test playlist",
        trackIds: [1, 2],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const mockTracks: Track[] = [
        { id: 1, title: "Song 1", duration: 180, artist: { name: "Artist 1" } } as Track,
        { id: 2, title: "Song 2", duration: 200, artist: { name: "Artist 2" } } as Track,
    ];

    it("encodes and decodes playlist", () => {
        const encoded = encodePlaylistForShare(mockPlaylist, mockTracks);
        const decoded = decodePlaylistFromShare(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded!.name).toBe("My Test Playlist");
        expect(decoded!.tracks).toHaveLength(2);
        expect(decoded!.tracks[0].title).toBe("Song 1");
    });

    it("returns null for invalid data", () => {
        const result = decodePlaylistFromShare("invalid-base64!!!");
        expect(result).toBeNull();
    });

    it("handles unicode characters in titles", () => {
        const unicodePlaylist: Playlist = {
            ...mockPlaylist,
            name: "Mi Playlistña",
        };
        const unicodeTracks: Track[] = [
            { id: 1, title: "Cañón", duration: 180, artist: { name: "Artista" } } as Track,
        ];

        const encoded = encodePlaylistForShare(unicodePlaylist, unicodeTracks);
        const decoded = decodePlaylistFromShare(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded!.name).toBe("Mi Playlistña");
        expect(decoded!.tracks[0].title).toBe("Cañón");
    });
});
