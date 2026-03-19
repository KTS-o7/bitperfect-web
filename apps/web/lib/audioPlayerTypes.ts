import { Track, LyricsData } from "@/lib/api/types";

export type RepeatMode = "off" | "all" | "one";

export interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  currentQueueIndex: number;
  shuffleActive: boolean;
  repeatMode: RepeatMode;
  currentQuality: string;
  streamUrl: string | null;
}

export interface AudioPlayerContextValue extends AudioPlayerState {
  playTrack: (track: Track, streamUrl: string) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  reorderQueue: (newQueue: Track[], newCurrentIndex: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  getAudioElement: () => HTMLAudioElement | null;
  isStatsOpen: boolean;
  setIsStatsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lyrics: LyricsData | null;
  currentLineIndex: number;
  isLoadingLyrics: boolean;
  lyricsError: string | null;
  hasLyrics: boolean;
  hasSyncedLyrics: boolean;
}

export interface PersistedState {
  volume: number;
  isMuted: boolean;
  shuffleActive: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  currentQueueIndex: number;
  currentTrack: Track | null;
  currentTime: number;
}
