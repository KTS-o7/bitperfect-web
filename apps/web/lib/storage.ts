import { Track, Album } from "@bitperfect/shared/api";

// Minimal track info for playlist storage
export interface PlaylistTrack {
    id: number;
    title: string;
    duration: number;
    artist?: {
        id?: number;
        name: string;
    };
    artists?: Array<{
        id?: number;
        name: string;
        type?: string;
    }>;
    album?: {
        id?: number;
        title: string;
        cover?: string;
    };
}

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    trackIds: number[];  // Kept for backward compatibility
    tracks: PlaylistTrack[];  // Full track data
    createdAt: string;
    updatedAt: string;
    coverArt?: string;
    color?: string;
}

const PLAYLIST_COLORS = [
    'from-pink-600 to-rose-500',
    'from-violet-600 to-purple-500',
    'from-blue-600 to-cyan-500',
    'from-green-600 to-emerald-500',
    'from-yellow-500 to-orange-500',
    'from-red-600 to-pink-500',
    'from-indigo-600 to-blue-500',
    'from-teal-600 to-cyan-500',
];

export function getPlaylistColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PLAYLIST_COLORS[Math.abs(hash) % PLAYLIST_COLORS.length];
}

export interface UserSettings {
    quality: "LOW" | "HIGH" | "LOSSLESS";
    apiInstance?: string;
}

export interface UserData {
    likedTracks: Track[];
    history: Track[];
    savedAlbums: Album[];
    playlists: Playlist[];
    settings: UserSettings;
}

const STORAGE_KEY = "side-a-user-data";
const STORAGE_VERSION = 1;

interface VersionedData {
    version: number;
    data: UserData;
}

export const DEFAULT_SETTINGS: UserSettings = {
    quality: "LOSSLESS",
};

export const DEFAULT_USER_DATA: UserData = {
    likedTracks: [],
    history: [],
    savedAlbums: [],
    playlists: [],
    settings: DEFAULT_SETTINGS,
};

export const storage = {
    load(): UserData {
        if (typeof window === "undefined") return DEFAULT_USER_DATA;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULT_USER_DATA;
            
            const versioned: VersionedData = JSON.parse(raw);
            
            if (versioned.version !== STORAGE_VERSION) {
                console.log(`Migrating storage from v${versioned.version} to v${STORAGE_VERSION}`);
                return migrateData(versioned);
            }
            
            return {
                ...DEFAULT_USER_DATA,
                ...versioned.data,
            };
        } catch (e) {
            console.error("Failed to load user data", e);
            return DEFAULT_USER_DATA;
        }
    },

    save(data: UserData) {
        if (typeof window === "undefined") return;
        try {
            const versioned: VersionedData = {
                version: STORAGE_VERSION,
                data,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(versioned));
        } catch (e) {
            console.error("Failed to save user data", e);
        }
    },

    clear() {
        if (typeof window === "undefined") return;
        localStorage.removeItem(STORAGE_KEY);
    }
};

function migrateData(oldData: VersionedData): UserData {
    if (!oldData.data) return DEFAULT_USER_DATA;
    
    let migrated = { ...oldData.data };
    
    if (oldData.version < 1) {
        // Future migrations go here
    }
    
    return migrated;
}
