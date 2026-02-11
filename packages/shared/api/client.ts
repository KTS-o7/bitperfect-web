import { APICache } from "./cache";
import { RATE_LIMIT_ERROR_MESSAGE, deriveTrackQuality, delay } from "./utils";
import type {
  APISettings,
  SearchResponse,
  Track,
  Album,
  Artist,
  Playlist,
  TrackLookup,
  CacheStats,
  LyricsData,
  LyricsPlusResponse,
  LyricLine,
  ArtistResponse,
  PlaylistResponse,
} from "./types";

export const DASH_MANIFEST_UNAVAILABLE_CODE = "DASH_MANIFEST_UNAVAILABLE";

export class LosslessAPI {
  private settings: APISettings;
  private cache: APICache;
  private streamCache: Map<string, string>;
  private lyricsCache: Map<number, LyricsData>;

  constructor(settings: APISettings) {
    this.settings = settings;
    this.cache = new APICache({
      maxSize: 200,
      ttl: 1000 * 60 * 30,
    });
    this.streamCache = new Map();
    this.lyricsCache = new Map();

    setInterval(() => {
      this.cache.clearExpired();
      this.pruneStreamCache();
      this.pruneLyricsCache();
    }, 1000 * 60 * 5);
  }

  private pruneStreamCache(): void {
    if (this.streamCache.size > 50) {
      const entries = Array.from(this.streamCache.entries());
      const toDelete = entries.slice(0, entries.length - 50);
      toDelete.forEach(([key]) => this.streamCache.delete(key));
    }
  }

  private pruneLyricsCache(): void {
    if (this.lyricsCache.size > 100) {
      const entries = Array.from(this.lyricsCache.entries());
      const toDelete = entries.slice(0, entries.length - 100);
      toDelete.forEach(([key]) => this.lyricsCache.delete(key));
    }
  }

  private async fetchWithRetry(
    relativePath: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<Response> {
    const instances = await this.settings.getInstances();
    if (instances.length === 0) {
      throw new Error("No API instances configured.");
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (const baseUrl of instances) {
      const url = baseUrl.endsWith("/")
        ? `${baseUrl}${relativePath.substring(1)}`
        : `${baseUrl}${relativePath}`;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, { signal: options.signal });

          if (response.status === 429) {
            throw new Error(RATE_LIMIT_ERROR_MESSAGE);
          }

          if (response.ok) {
            return response;
          }

          if (response.status === 401) {
            let errorData:
              | { subStatus?: number; userMessage?: string }
              | undefined;
            try {
              errorData = await response.clone().json();
            } catch { }

            if (errorData?.subStatus === 11002) {
              lastError = new Error(
                errorData?.userMessage || "Authentication failed"
              );
              if (attempt < maxRetries) {
                await delay(200 * attempt);
                continue;
              }
            }
          }

          if (response.status >= 500 && attempt < maxRetries) {
            await delay(200 * attempt);
            continue;
          }

          lastError = new Error(
            `Request failed with status ${response.status}`
          );
          break;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            throw error;
          }

          lastError =
            error instanceof Error ? error : new Error("Unknown error");

          if (attempt < maxRetries) {
            await delay(200 * attempt);
          }
        }
      }
    }

    throw (
      lastError || new Error(`All API instances failed for: ${relativePath}`)
    );
  }

  private findSearchSection(
    source: unknown,
    key: string,
    visited: Set<unknown>
  ): { items: unknown[] } | undefined {
    if (!source || typeof source !== "object") return;

    if (Array.isArray(source)) {
      for (const e of source) {
        const f = this.findSearchSection(e, key, visited);
        if (f) return f;
      }
      return;
    }

    if (visited.has(source)) return;
    visited.add(source);

    const obj = source as Record<string, unknown>;

    if ("items" in obj && Array.isArray(obj.items))
      return obj as { items: unknown[] };

    if (key in obj) {
      const f = this.findSearchSection(obj[key], key, visited);
      if (f) return f;
    }

    for (const v of Object.values(obj)) {
      const f = this.findSearchSection(v, key, visited);
      if (f) return f;
    }
  }

  private buildSearchResponse<T>(section?: {
    items?: T[];
    limit?: number;
    offset?: number;
    totalNumberOfItems?: number;
  }): SearchResponse<T> {
    const items = section?.items ?? [];
    return {
      items,
      limit: section?.limit ?? items.length,
      offset: section?.offset ?? 0,
      totalNumberOfItems: section?.totalNumberOfItems ?? items.length,
    };
  }

  private normalizeSearchResponse<T>(
    data: unknown,
    key: string
  ): SearchResponse<T> {
    const section = this.findSearchSection(data, key, new Set());
    return this.buildSearchResponse<T>(section as { items?: T[] });
  }

  private prepareTrack(track: Track): Track {
    let normalized = track;

    if (
      !track.artist &&
      Array.isArray(track.artists) &&
      track.artists.length > 0
    ) {
      normalized = { ...track, artist: track.artists[0] };
    }

    const derivedQuality = deriveTrackQuality(normalized);
    if (derivedQuality && normalized.audioQuality !== derivedQuality) {
      normalized = { ...normalized, audioQuality: derivedQuality };
    }

    return normalized;
  }

  private prepareAlbum(album: Album): Album {
    if (
      !album.artist &&
      Array.isArray(album.artists) &&
      album.artists.length > 0
    ) {
      return { ...album, artist: album.artists[0] };
    }
    return album;
  }

  private preparePlaylist(playlist: Playlist): Playlist {
    return playlist;
  }

  private prepareArtist(artist: Artist): Artist {
    if (
      !artist.type &&
      Array.isArray(artist.artistTypes) &&
      artist.artistTypes.length > 0
    ) {
      return { ...artist, type: artist.artistTypes[0] };
    }
    return artist;
  }

  private parseTrackLookup(data: unknown): TrackLookup {
    const entries = Array.isArray(data) ? data : [data];
    let track: Track | undefined;
    let info: { manifest: string } | undefined;
    let originalTrackUrl: string | undefined;

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;

      const obj = entry as Record<string, unknown>;

      if (!track && "duration" in obj) {
        track = entry as Track;
        continue;
      }

      if (!info && "manifest" in obj) {
        info = entry as { manifest: string };
        continue;
      }

      if (!originalTrackUrl && "OriginalTrackUrl" in obj) {
        const candidate = obj.OriginalTrackUrl;
        if (typeof candidate === "string") {
          originalTrackUrl = candidate;
        }
      }
    }

    if (!track || !info) {
      throw new Error("Malformed track response");
    }

    return { track, info, originalTrackUrl };
  }

  private extractStreamUrlFromManifest(manifest: string): string | null {
    try {
      const decoded = atob(manifest);

      try {
        const parsed = JSON.parse(decoded);
        if (parsed?.urls?.[0]) {
          return parsed.urls[0];
        }
      } catch {
        const match = decoded.match(/https?:\/\/[\w\-.~:?#[@!$&'()*+,;=%/]+/);
        return match ? match[0] : null;
      }
    } catch (error) {
      console.error("Failed to decode manifest:", error);
      return null;
    }
    return null;
  }

  async searchTracks(
    query: string,
    options: { signal?: AbortSignal; offset?: number; limit?: number } = {}
  ): Promise<SearchResponse<Track>> {
    const { offset = 0, limit = 25 } = options;
    const cacheKey = `${query}_${offset}_${limit}`;
    const cached = (await this.cache.get(
      "search_tracks",
      cacheKey
    )) as SearchResponse<Track> | null;
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        s: query,
        offset: offset.toString(),
        limit: limit.toString(),
      });
      const response = await this.fetchWithRetry(
        `/search/?${params.toString()}`,
        options
      );
      const data = await response.json();
      const normalized = this.normalizeSearchResponse<Track>(data, "tracks");
      const result: SearchResponse<Track> = {
        ...normalized,
        items: normalized.items.map((t) => this.prepareTrack(t)),
      };

      await this.cache.set("search_tracks", cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.error("Track search failed:", error);
      return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
    }
  }

  async searchAlbums(
    query: string,
    options: { signal?: AbortSignal; offset?: number; limit?: number } = {}
  ): Promise<SearchResponse<Album>> {
    const { offset = 0, limit = 25 } = options;
    const cacheKey = `${query}_${offset}_${limit}`;
    const cached = (await this.cache.get(
      "search_albums",
      cacheKey
    )) as SearchResponse<Album> | null;
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        al: query,
        offset: offset.toString(),
        limit: limit.toString(),
      });
      const response = await this.fetchWithRetry(
        `/search/?${params.toString()}`,
        options
      );
      const data = await response.json();
      const normalized = this.normalizeSearchResponse<Album>(data, "albums");
      const result: SearchResponse<Album> = {
        ...normalized,
        items: normalized.items.map((album) => this.prepareAlbum(album)),
      };

      await this.cache.set("search_albums", cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.error("Album search failed:", error);
      return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
    }
  }

  async searchArtists(
    query: string,
    options: { signal?: AbortSignal; offset?: number; limit?: number } = {}
  ): Promise<SearchResponse<Artist>> {
    const { offset = 0, limit = 25 } = options;
    const cacheKey = `${query}_${offset}_${limit}`;
    const cached = (await this.cache.get(
      "search_artists",
      cacheKey
    )) as SearchResponse<Artist> | null;
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        a: query,
        offset: offset.toString(),
        limit: limit.toString(),
      });
      const response = await this.fetchWithRetry(
        `/search/?${params.toString()}`,
        options
      );
      const data = await response.json();
      const normalized = this.normalizeSearchResponse<Artist>(data, "artists");
      const result: SearchResponse<Artist> = {
        ...normalized,
        items: normalized.items.map((a) => this.prepareArtist(a)),
      };

      await this.cache.set("search_artists", cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.error("Artist search failed:", error);
      return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
    }
  }

  async getAlbum(
    albumId: number,
    options: { signal?: AbortSignal } = {}
  ): Promise<{ album: Album; tracks: Track[] }> {
    const cacheKey = `album_${albumId}`;
    const cached = (await this.cache.get("album", cacheKey)) as {
      album: Album;
      tracks: Track[];
    } | null;
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(
        `/album/?id=${albumId}`,
        options
      );
      const data = await response.json();

      let album: Album | undefined;
      let tracks: Track[] = [];

      const responseData = data.data || data;

      if (data.album) {
        album = this.prepareAlbum(data.album);
      } else if (
        responseData.items &&
        Array.isArray(responseData.items) &&
        responseData.items.length > 0
      ) {
        const firstItem = responseData.items[0];
        const firstTrack = firstItem.item || firstItem;
        if (firstTrack.album) {
          album = this.prepareAlbum(firstTrack.album);
        }
      }

      if (Array.isArray(data.tracks)) {
        tracks = data.tracks.map((t: Track) => this.prepareTrack(t));
      } else if (Array.isArray(responseData.items)) {
        tracks = responseData.items
          .map((item: { item?: Track; track?: Track } | Track) => {
            if ("item" in item) return item.item;
            if ("track" in item) return item.track;
            return item;
          })
          .filter(
            (track: Track | undefined): track is Track =>
              track !== undefined && "id" in track
          )
          .map((track: Track) => this.prepareTrack(track));
      }

      if (!album) {
        throw new Error("Album not found in response");
      }

      const result = { album, tracks };
      await this.cache.set("album", cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.error("Failed to fetch album:", error);
      throw error;
    }
  }

  async getArtist(
    artistId: number,
    options: { signal?: AbortSignal } = {}
  ): Promise<ArtistResponse> {
    const cacheKey = `artist_${artistId}`;
    const cached = (await this.cache.get(
      "artist",
      cacheKey
    )) as ArtistResponse | null;
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(
        `/artist/?id=${artistId}`,
        options
      );
      const data = await response.json();
      const responseData = data.data || data;

      const items = responseData.items || [];
      const albums = items
        .filter((i: any) => i.type === "ALBUM")
        .map((i: any) => this.prepareAlbum(i));
      const eps = items
        .filter((i: any) => i.type === "EP")
        .map((i: any) => this.prepareAlbum(i));
      const tracks = items
        .filter((i: any) => i.type === "TRACK")
        .map((i: any) => this.prepareTrack(i));

      const result: ArtistResponse = {
        id: artistId,
        name: responseData.name || "Unknown Artist",
        picture: responseData.picture,
        type: responseData.type,
        albums,
        eps,
        tracks,
      };

      await this.cache.set("artist", cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.error("Failed to fetch artist:", error);
      throw error;
    }
  }

  async getPlaylist(
    playlistId: string | number,
    options: { signal?: AbortSignal } = {}
  ): Promise<PlaylistResponse> {
    const cacheKey = `playlist_${playlistId}`;
    const cached = (await this.cache.get(
      "playlist",
      cacheKey
    )) as PlaylistResponse | null;
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(
        `/playlist/?id=${playlistId}`,
        options
      );
      const data = await response.json();
      const responseData = data.data || data;

      const playlist: Playlist = {
        id: String(playlistId),
        title: responseData.title || "Unknown Playlist",
        description: responseData.description,
        numberOfTracks: responseData.numberOfTracks,
        creator: responseData.creator,
      };

      const tracks = (responseData.items || [])
        .map((i: any) => i.item || i.track || i)
        .filter((t: any) => t && typeof t === "object")
        .map((t: Track) => this.prepareTrack(t));

      const result: PlaylistResponse = { playlist, tracks };
      await this.cache.set("playlist", cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.error("Failed to fetch playlist:", error);
      throw error;
    }
  }

  async getStreamUrl(
    trackId: number,
    quality: string = "LOSSLESS"
  ): Promise<string | null> {
    const cacheKey = `stream_${trackId}_${quality}`;
    const cached = this.streamCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(
        `/track/?id=${trackId}&quality=${quality}`
      );
      const data = await response.json();

      let manifest: string | null = null;

      if (data?.data?.manifest) {
        manifest = data.data.manifest;
      } else if (data?.manifest) {
        manifest = data.manifest;
      } else {
        const lookup = this.parseTrackLookup(data);
        manifest = lookup.info.manifest;
      }

      if (!manifest) {
        console.error("No manifest found in response");
        return null;
      }

      const streamUrl = this.extractStreamUrlFromManifest(manifest);

      if (streamUrl) {
        this.streamCache.set(cacheKey, streamUrl);
      }

      return streamUrl;
    } catch (error) {
      console.error("Failed to get stream URL:", error);
      return null;
    }
  }

  getCoverUrl(id: string | number, size: string = "1280"): string {
    if (!id) {
      return `https://picsum.photos/seed/${Math.random()}/${size}`;
    }

    const formattedId = String(id).replace(/-/g, "/");
    return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
  }

  async fetchLyrics(track: Track): Promise<LyricsData | null> {
    if (this.lyricsCache.has(track.id)) {
      return this.lyricsCache.get(track.id)!;
    }

    try {
      const title = encodeURIComponent(track.title);
      const artist = encodeURIComponent(
        track.artist?.name || track.artists?.[0]?.name || ""
      );
      const album = encodeURIComponent(track.album?.title || "");
      const duration = Math.floor(track.duration);
      const source = "apple,lyricsplus,musixmatch,spotify";

      const lyricsUrl = `https://lyricsplus.prjktla.workers.dev/v2/lyrics/get?title=${title}&artist=${artist}&album=${album}&duration=${duration}&source=${source}`;

      const response = await fetch(lyricsUrl);

      if (!response.ok) {
        return null;
      }

      const data: LyricsPlusResponse = await response.json();

      if (data && data.lyrics && data.lyrics.length > 0) {
        const lyricsData: LyricsData = {
          lyricsPlus: data,
          parsed: this.convertLyricsPlusToSynced(data.lyrics),
        };

        this.lyricsCache.set(track.id, lyricsData);
        return lyricsData;
      }
    } catch (error) {
      console.error("Failed to fetch lyrics:", error);
    }
    return null;
  }

  private convertLyricsPlusToSynced(lyrics: LyricLine[]): LyricsData["parsed"] {
    if (!lyrics || lyrics.length === 0) return [];

    return lyrics.map((line) => ({
      time: line.time / 1000,
      text: line.text,
    }));
  }

  private parseSyncedLyrics(subtitles: string): LyricsData["parsed"] {
    if (!subtitles) return [];

    const lines = subtitles.split("\n").filter((line) => line.trim());
    return lines
      .map((line) => {
        const match = line.match(/\[(\d+):(\d+)\.(\d+)\]\s*(.+)/);
        if (match) {
          const [, minutes, seconds, centiseconds, text] = match;
          const timeInSeconds =
            parseInt(minutes) * 60 +
            parseInt(seconds) +
            parseInt(centiseconds) / 100;
          return { time: timeInSeconds, text: text.trim() };
        }
        return null;
      })
      .filter((item): item is { time: number; text: string } => item !== null);
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.streamCache.clear();
    this.lyricsCache.clear();
  }

  getCacheStats(): CacheStats {
    return {
      ...this.cache.getCacheStats(),
      streamUrls: this.streamCache.size,
    };
  }
}
