import { describe, it, expect, beforeEach } from "vitest";
import { storage, Playlist, DEFAULT_USER_DATA } from "./storage";

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
Object.defineProperty(globalThis, "window", { value: {} });

describe("storage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("saves and loads playlists", () => {
        const playlist: Playlist = {
            id: "playlist-1",
            name: "Test Playlist",
            trackIds: [1, 2, 3],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const data = { ...DEFAULT_USER_DATA, playlists: [playlist] };
        storage.save(data);

        const loaded = storage.load();
        expect(loaded.playlists).toHaveLength(1);
        expect(loaded.playlists[0].name).toBe("Test Playlist");
    });

    it("preserves existing data when saving", () => {
        const playlist: Playlist = {
            id: "playlist-1",
            name: "Test Playlist",
            trackIds: [1, 2, 3],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const data = {
            ...DEFAULT_USER_DATA,
            playlists: [playlist],
            likedTracks: [],
        };
        storage.save(data);

        const loaded = storage.load();
        expect(loaded.playlists).toHaveLength(1);
        expect(loaded.likedTracks).toHaveLength(0);
    });
});
