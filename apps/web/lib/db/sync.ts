// apps/web/lib/db/sync.ts
import { createClient } from '@/lib/supabase/client';
import {
  getAllPlaylists,
  getAllFavorites,
  getSettings,
  savePlaylist,
  addFavorite,
  saveSettings,
  Playlist,
  Favorite,
  UserSettings,
} from './indexeddb';

export interface SyncResult {
  playlistsSynced: number;
  favoritesSynced: number;
  settingsSynced: boolean;
  error?: string;
}

export async function syncFromCloud(): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = {
    playlistsSynced: 0,
    favoritesSynced: 0,
    settingsSynced: false,
  };

  try {
    const [{ data: playlists }, { data: favorites }, { data: settings }] = await Promise.all([
      supabase.from('playlists').select('*'),
      supabase.from('favorites').select('*'),
      supabase.from('user_settings').select('*').single(),
    ]);

    if (playlists) {
      const localPlaylists = await getAllPlaylists();
      const localMap = new Map(localPlaylists.map(p => [p.id, p]));

      for (const remotePlaylist of playlists) {
        const localPlaylist = localMap.get(remotePlaylist.id);
        
        if (!localPlaylist || new Date(remotePlaylist.updated_at) > new Date(localPlaylist.updatedAt)) {
          await savePlaylist({
            id: remotePlaylist.id,
            name: remotePlaylist.name,
            description: remotePlaylist.description || undefined,
            coverUrl: remotePlaylist.cover_url || undefined,
            trackIds: remotePlaylist.track_ids || [],
            isPublic: remotePlaylist.is_public || false,
            createdAt: remotePlaylist.created_at,
            updatedAt: remotePlaylist.updated_at,
            syncedAt: new Date().toISOString(),
          });
          result.playlistsSynced++;
        }
      }
    }

    if (favorites) {
      const localFavorites = await getAllFavorites();
      const localSet = new Set(localFavorites.map(f => `${f.type}:${f.itemId}`));

      for (const remoteFavorite of favorites) {
        const key = `${remoteFavorite.type}:${remoteFavorite.item_id}`;
        
        if (!localSet.has(key)) {
          await addFavorite({
            id: remoteFavorite.id,
            type: remoteFavorite.type,
            itemId: remoteFavorite.item_id,
            itemData: remoteFavorite.item_data || undefined,
            createdAt: remoteFavorite.created_at,
          });
          result.favoritesSynced++;
        }
      }
    }

    if (settings) {
      const localSettings = await getSettings();
      
      if (!localSettings || new Date(settings.updated_at) > new Date(localSettings.updatedAt)) {
        await saveSettings({
          theme: settings.theme as 'dark' | 'light',
          audioQuality: settings.audio_quality as 'low' | 'medium' | 'high',
          autoPlay: settings.auto_play,
          crossfadeSeconds: settings.crossfade_seconds,
          settingsJson: settings.settings_json as Record<string, unknown>,
          updatedAt: settings.updated_at,
        });
        result.settingsSynced = true;
      }
    }

    return result;
  } catch (error) {
    console.error('Sync from cloud failed:', error);
    return {
      ...result,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function syncToCloud(): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = {
    playlistsSynced: 0,
    favoritesSynced: 0,
    settingsSynced: false,
  };

  try {
    const [playlists, favorites, settings] = await Promise.all([
      getAllPlaylists(),
      getAllFavorites(),
      getSettings(),
    ]);

    const playlistUpserts = playlists
      .filter(p => !p.syncedAt || new Date(p.updatedAt) > new Date(p.syncedAt))
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || null,
        cover_url: p.coverUrl || null,
        track_ids: p.trackIds,
        is_public: p.isPublic,
        updated_at: p.updatedAt,
      }));

    if (playlistUpserts.length > 0) {
      const { error } = await supabase.from('playlists').upsert(playlistUpserts);
      if (error) throw error;
      result.playlistsSynced = playlistUpserts.length;
    }

    const favoriteUpserts = favorites.map(f => ({
      id: f.id,
      type: f.type,
      item_id: f.itemId,
      item_data: f.itemData || null,
      created_at: f.createdAt,
    }));

    if (favoriteUpserts.length > 0) {
      const { error } = await supabase.from('favorites').upsert(favoriteUpserts);
      if (error) throw error;
      result.favoritesSynced = favoriteUpserts.length;
    }

    if (settings) {
      const { error } = await supabase.from('user_settings').upsert({
        theme: settings.theme,
        audio_quality: settings.audioQuality,
        auto_play: settings.autoPlay,
        crossfade_seconds: settings.crossfadeSeconds,
        settings_json: settings.settingsJson,
        updated_at: settings.updatedAt,
      });
      if (error) throw error;
      result.settingsSynced = true;
    }

    for (const playlist of playlists) {
      if (!playlist.syncedAt || new Date(playlist.updatedAt) > new Date(playlist.syncedAt)) {
        await savePlaylist({ ...playlist, syncedAt: new Date().toISOString() });
      }
    }

    return result;
  } catch (error) {
    console.error('Sync to cloud failed:', error);
    return {
      ...result,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function performFullSync(): Promise<SyncResult> {
  const fromCloud = await syncFromCloud();
  const toCloud = await syncToCloud();

  return {
    playlistsSynced: fromCloud.playlistsSynced + toCloud.playlistsSynced,
    favoritesSynced: fromCloud.favoritesSynced + toCloud.favoritesSynced,
    settingsSynced: fromCloud.settingsSynced || toCloud.settingsSynced,
    error: fromCloud.error || toCloud.error,
  };
}
