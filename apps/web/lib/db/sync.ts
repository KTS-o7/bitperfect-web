// apps/web/lib/db/sync.ts
import { createClient } from '@/lib/supabase/client';
import { storage, UserData, Playlist, PlaylistTrack } from '@/lib/storage';
import { Track, Album } from "@bitperfect/shared/api";

interface SyncResult {
  success: boolean;
  message: string;
}

interface DbPlaylist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  track_ids: string[];
  tracks_data: PlaylistTrack[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface DbFavorite {
  id: string;
  user_id: string;
  type: 'album' | 'artist' | 'track' | 'playlist';
  item_id: string;
  item_data: Record<string, unknown> | null;
  created_at: string;
}

interface DbUserSettings {
  user_id: string;
  theme: string;
  audio_quality: string;
  auto_play: boolean;
  crossfade_seconds: number;
  settings_json: Record<string, unknown>;
  updated_at: string;
}

export async function syncFromCloud(): Promise<SyncResult> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Not logged in' };
    }

    const [playlistsResult, favoritesResult, settingsResult] = await Promise.all([
      supabase.from('playlists').select('*').eq('user_id', user.id),
      supabase.from('favorites').select('*').eq('user_id', user.id),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    ]);

    const localData = storage.load();

    const cloudPlaylists: Playlist[] = (playlistsResult.data || []).map((p: DbPlaylist) => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      trackIds: (p.track_ids || []).map(id => parseInt(String(id), 10)),
      tracks: (p.tracks_data || []) as PlaylistTrack[],
      coverArt: p.cover_url || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    const cloudLikedTracks: Track[] = (favoritesResult.data || [])
      .filter((f: DbFavorite) => f.type === 'track')
      .map((f: DbFavorite) => f.item_data as unknown as Track);

    const cloudSavedAlbums: Album[] = (favoritesResult.data || [])
      .filter((f: DbFavorite) => f.type === 'album')
      .map((f: DbFavorite) => f.item_data as unknown as Album);

    const mergedPlaylists = mergePlaylists(localData.playlists, cloudPlaylists);
    const mergedLikedTracks = mergeTracks(localData.likedTracks, cloudLikedTracks);
    const mergedSavedAlbums = mergeAlbums(localData.savedAlbums, cloudSavedAlbums);

    let mergedSettings = localData.settings;
    if (settingsResult.data) {
      const dbSettings = settingsResult.data as DbUserSettings;
      mergedSettings = {
        quality: (dbSettings.audio_quality as 'LOW' | 'HIGH' | 'LOSSLESS') || 'LOSSLESS',
        ...(dbSettings.settings_json as Record<string, unknown>),
      };
    }

    const mergedData: UserData = {
      likedTracks: mergedLikedTracks,
      history: localData.history,
      savedAlbums: mergedSavedAlbums,
      playlists: mergedPlaylists,
      settings: mergedSettings,
    };
    
    storage.save(mergedData);
    return { success: true, message: 'Synced from cloud' };

  } catch (error) {
    console.error('Sync from cloud failed:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function uuidv4(): string {
  return crypto.randomUUID();
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function syncToCloud(): Promise<SyncResult> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Not logged in' };
    }

    const localData = storage.load();

    const playlistRows = localData.playlists.map((p: Playlist) => ({
      id: isValidUUID(p.id) ? p.id : uuidv4(),
      user_id: user.id,
      name: p.name,
      description: p.description || null,
      cover_url: p.coverArt || null,
      track_ids: p.trackIds.map(String),
      tracks_data: p.tracks as unknown as Record<string, unknown>[],
      is_public: false,
      updated_at: new Date().toISOString(),
    }));

    if (playlistRows.length > 0) {
      const { error: playlistError } = await supabase
        .from('playlists')
        .upsert(playlistRows, { onConflict: 'id' });
      
      if (playlistError) {
        console.error('Playlist sync error:', playlistError);
        return { success: false, message: playlistError.message };
      }
    }

    const favoriteRows = localData.likedTracks.map((track: Track) => ({
      user_id: user.id,
      type: 'track' as const,
      item_id: String(track.id),
      item_data: track as unknown as Record<string, unknown>,
      created_at: new Date().toISOString(),
    }));

    if (favoriteRows.length > 0) {
      const { error: favError } = await supabase
        .from('favorites')
        .upsert(favoriteRows, { onConflict: 'user_id,type,item_id' });
      
      if (favError) {
        console.error('Favorite sync error:', favError);
        return { success: false, message: favError.message };
      }
    }

    const albumRows = localData.savedAlbums.map((album: Album) => ({
      user_id: user.id,
      type: 'album' as const,
      item_id: String(album.id),
      item_data: album as unknown as Record<string, unknown>,
      created_at: new Date().toISOString(),
    }));

    if (albumRows.length > 0) {
      const { error: albumError } = await supabase
        .from('favorites')
        .upsert(albumRows, { onConflict: 'user_id,type,item_id' });
      
      if (albumError) {
        console.error('Album sync error:', albumError);
      }
    }

    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        theme: 'dark',
        audio_quality: localData.settings.quality || 'LOSSLESS',
        auto_play: true,
        crossfade_seconds: 0,
        settings_json: localData.settings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (settingsError) {
      console.error('Settings sync error:', settingsError);
    }

    return { success: true, message: 'Synced to cloud' };
  } catch (error) {
    console.error('Sync to cloud failed:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function performSync(): Promise<SyncResult> {
  const fromCloud = await syncFromCloud();
  if (!fromCloud.success) {
    return fromCloud;
  }
  return await syncToCloud();
}

function mergePlaylists(local: Playlist[], cloud: Playlist[]): Playlist[] {
  const map = new Map<string, Playlist>();
  
  local.forEach(p => map.set(p.id, p));
  
  cloud.forEach(p => {
    const existing = map.get(p.id);
    if (!existing) {
      map.set(p.id, p);
    } else {
      const localDate = new Date(existing.updatedAt);
      const cloudDate = new Date(p.updatedAt);
      if (cloudDate > localDate) {
        map.set(p.id, p);
      }
    }
  });
  
  return Array.from(map.values());
}

function mergeTracks(local: Track[], cloud: Track[]): Track[] {
  const map = new Map<number, Track>();
  
  local.forEach(t => map.set(t.id, t));
  
  cloud.forEach(t => {
    if (!map.has(t.id)) {
      map.set(t.id, t);
    }
  });
  
  return Array.from(map.values());
}

function mergeAlbums(local: Album[], cloud: Album[]): Album[] {
  const map = new Map<number, Album>();
  
  local.forEach(a => map.set(a.id, a));
  
  cloud.forEach(a => {
    if (!map.has(a.id)) {
      map.set(a.id, a);
    }
  });
  
  return Array.from(map.values());
}
