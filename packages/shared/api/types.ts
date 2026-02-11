export interface Artist {
  id: number;
  name: string;
  picture?: string;
  type?: string;
  artistTypes?: string[];
}

export interface Album {
  id: number;
  title: string;
  numberOfTracks?: number;
  releaseDate?: string;
  artist?: Artist;
  artists?: Artist[];
  type?: string;
  explicit?: boolean;
  cover?: string;
  imageCover?: string[];
  mediaMetadata?: {
    tags?: string[];
  };
}

export interface Track {
  id: number;
  title: string;
  duration: number;
  trackNumber?: number;
  volumeNumber?: number;
  version?: string;
  explicit?: boolean;
  explicitLyrics?: boolean;
  audioQuality?: string;
  audioModes?: string[];
  popularity?: number;
  streamStartDate?: string;
  artist?: Artist;
  artists?: Artist[];
  album?: Album;
  mediaMetadata?: {
    tags?: string[];
  };
  replayGain?: number;
  peak?: number;
  allowStreaming?: boolean;
  streamReady?: boolean;
  payToStream?: boolean;
  adSupportedStreamReady?: boolean;
  djReady?: boolean;
  stemReady?: boolean;
  premiumStreamingOnly?: boolean;
  copyright?: string;
  bpm?: number;
  key?: string;
  keyScale?: string;
  url?: string;
  isrc?: string;
  editable?: boolean;
  upload?: boolean;
  accessType?: string | null;
  spotlighted?: boolean;
  mixes?: {
    TRACK_MIX?: string;
  };
}

export interface Playlist {
  id: string;
  uuid?: string;
  title: string;
  numberOfTracks?: number;
  description?: string;
  creator?: string;
  explicit?: boolean;
  explicitLyrics?: boolean;
}

export interface SearchResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  totalNumberOfItems: number;
}

export interface TrackInfo {
  manifest: string;
}

export interface TrackLookup {
  track: Track;
  info: TrackInfo;
  originalTrackUrl?: string;
}

export interface AlbumResponse {
  album: Album;
  tracks: Track[];
}

export interface PlaylistResponse {
  playlist: Playlist;
  tracks: Track[];
}

export interface ArtistResponse {
  id: number;
  name: string;
  picture?: string;
  type?: string;
  albums: Album[];
  eps: Album[];
  tracks: Track[];
}

export interface CacheStats {
  total: number;
  byType: Record<string, number>;
  streamUrls?: number;
}

export interface APISettings {
  getInstances: () => Promise<string[]>;
}

export interface WordSyllabus {
  time: number;
  duration: number;
  text: string;
  isBackground?: boolean;
}

export interface LyricLine {
  time: number;
  duration: number;
  text: string;
  syllabus: WordSyllabus[];
  element: {
    key: string;
    songPart: string;
    singer: string;
  };
}

export interface LyricsMetadata {
  source: string;
  songWriters?: string[];
  title?: string;
  language?: string;
  totalDuration?: string;
}

export interface LyricsPlusResponse {
  type: string;
  metadata: LyricsMetadata;
  lyrics: LyricLine[];
  cached?: string;
  processingTime?: {
    timeElapsed: number;
    lastProcessed: number;
  };
}

export interface SyncedLyric {
  time: number;
  text: string;
}

export interface LyricsData {
  lyrics?: string;
  subtitles?: string;
  parsed?: SyncedLyric[];
  lyricsPlus?: LyricsPlusResponse;
}

export interface LyricsResponse {
  lyrics?: string;
  subtitles?: string;
}
