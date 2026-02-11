import { Track, Album } from "@bitperfect/shared/api";

export interface UserSettings {
    quality: "LOW" | "HIGH" | "LOSSLESS";
    apiInstance?: string;
}

export interface UserData {
    likedTracks: Track[];
    history: Track[];
    savedAlbums: Album[];
    settings: UserSettings;
}

const STORAGE_KEY = "side-a-user-data";

export const DEFAULT_SETTINGS: UserSettings = {
    quality: "LOSSLESS",
};

export const DEFAULT_USER_DATA: UserData = {
    likedTracks: [],
    history: [],
    savedAlbums: [],
    settings: DEFAULT_SETTINGS,
};

export const storage = {
    load(): UserData {
        if (typeof window === "undefined") return DEFAULT_USER_DATA;
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return DEFAULT_USER_DATA;
            const parsed = JSON.parse(data);
            return {
                ...DEFAULT_USER_DATA,
                ...parsed,
                // Ensure nested objects are also spread if needed, 
                // but here top-level keys should suffice
            };
        } catch (e) {
            console.error("Failed to load user data", e);
            return DEFAULT_USER_DATA;
        }
    },

    save(data: UserData) {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save user data", e);
        }
    },

    clear() {
        if (typeof window === "undefined") return;
        localStorage.removeItem(STORAGE_KEY);
    }
};
