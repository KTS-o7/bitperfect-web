// apps/web/lib/db/indexeddb.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  trackIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface Favorite {
  id: string;
  type: 'album' | 'artist' | 'track' | 'playlist';
  itemId: string;
  itemData?: Record<string, unknown>;
  createdAt: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  audioQuality: 'low' | 'medium' | 'high';
  autoPlay: boolean;
  crossfadeSeconds: number;
  settingsJson: Record<string, unknown>;
  updatedAt: string;
}

interface BitperfectDB extends DBSchema {
  playlists: {
    key: string;
    value: Playlist;
    indexes: { 'by-updated': string };
  };
  favorites: {
    key: string;
    value: Favorite;
    indexes: { 'by-type': string; 'by-item': [string, string] };
  };
  settings: {
    key: string;
    value: UserSettings & { id: string };
  };
}

const DB_NAME = 'bitperfect-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BitperfectDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BitperfectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BitperfectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('by-updated', 'updatedAt');

        const favoriteStore = db.createObjectStore('favorites', { keyPath: 'id' });
        favoriteStore.createIndex('by-type', 'type');
        favoriteStore.createIndex('by-item', ['type', 'itemId']);

        db.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  playlist.updatedAt = new Date().toISOString();
  await db.put('playlists', playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

export async function getAllFavorites(): Promise<Favorite[]> {
  const db = await getDB();
  return db.getAll('favorites');
}

export async function getFavoritesByType(type: Favorite['type']): Promise<Favorite[]> {
  const db = await getDB();
  return db.getAllFromIndex('favorites', 'by-type', type);
}

export async function isFavorited(type: Favorite['type'], itemId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.getFromIndex('favorites', 'by-item', [type, itemId]);
  return !!result;
}

export async function addFavorite(favorite: Favorite): Promise<void> {
  const db = await getDB();
  favorite.createdAt = new Date().toISOString();
  await db.put('favorites', favorite);
}

export async function removeFavorite(type: Favorite['type'], itemId: string): Promise<void> {
  const db = await getDB();
  const favorite = await db.getFromIndex('favorites', 'by-item', [type, itemId]);
  if (favorite) {
    await db.delete('favorites', favorite.id);
  }
}

export async function getSettings(): Promise<UserSettings | undefined> {
  const db = await getDB();
  const result = await db.get('settings', 'user-settings');
  if (result) {
    const { id, ...settings } = result;
    return settings;
  }
  return undefined;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDB();
  settings.updatedAt = new Date().toISOString();
  await db.put('settings', { ...settings, id: 'user-settings' });
}

export async function getOrCreateSettings(): Promise<UserSettings> {
  const existing = await getSettings();
  if (existing) return existing;
  
  const defaults: UserSettings = {
    theme: 'dark',
    audioQuality: 'high',
    autoPlay: true,
    crossfadeSeconds: 0,
    settingsJson: {},
    updatedAt: new Date().toISOString(),
  };
  
  await saveSettings(defaults);
  return defaults;
}
