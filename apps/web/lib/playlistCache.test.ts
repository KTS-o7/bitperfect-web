import { describe, it, expect, beforeEach } from "vitest";
import { playlistTrackCache } from "./playlistCache";
import { Track } from "@bitperfect/shared/api";

describe("playlistTrackCache", () => {
    beforeEach(() => {
        playlistTrackCache.clear();
    });

    it("stores and retrieves tracks", () => {
        const track: Track = { id: 1, title: "Test", duration: 180 } as Track;
        playlistTrackCache.set(1, track);

        expect(playlistTrackCache.get(1)).toEqual(track);
    });

    it("evicts oldest entries when full", () => {
        for (let i = 0; i < 55; i++) {
            playlistTrackCache.set(i, { id: i, title: `Track ${i}` } as Track);
        }

        expect(playlistTrackCache.size).toBeLessThanOrEqual(50);
    });

    it("retrieves multiple tracks at once", () => {
        const track1: Track = { id: 1, title: "Test 1", duration: 180 } as Track;
        const track2: Track = { id: 2, title: "Test 2", duration: 200 } as Track;

        playlistTrackCache.set(1, track1);
        playlistTrackCache.set(2, track2);

        const tracks = playlistTrackCache.getMultiple([1, 2, 3]);
        expect(tracks).toHaveLength(2);
    });
});
