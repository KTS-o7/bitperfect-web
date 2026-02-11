"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
  Dispatch,
  SetStateAction,
  ReactNode,
} from "react";
import { Track } from "@/lib/api/types";
import { api } from "@/lib/api";
import { usePersistence } from "./PersistenceContext";

type RepeatMode = "off" | "all" | "one";

interface AudioPlayerState {
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

interface AudioPlayerContextValue extends AudioPlayerState {
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
  setIsStatsOpen: Dispatch<SetStateAction<boolean>>;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const STORAGE_KEY = "audio-player-state";

// Generate multiple artwork sizes for Media Session API
function getMediaSessionArtwork(coverId: string | number | undefined): MediaImage[] {
  if (!coverId) return [];

  const coverIdStr = String(coverId);
  const sizes = [
    { size: "96", dimensions: "96x96" },
    { size: "160", dimensions: "160x160" },
    { size: "320", dimensions: "320x320" },
    { size: "640", dimensions: "640x640" },
    { size: "1280", dimensions: "1280x1280" },
  ];

  return sizes.map(({ size, dimensions }) => ({
    src: api.getCoverUrl(coverIdStr, size),
    sizes: dimensions,
    type: "image/jpeg",
  }));
}

// Interface for what we persist to localStorage
interface PersistedState {
  volume: number;
  isMuted: boolean;
  shuffleActive: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  currentQueueIndex: number;
  currentTrack: Track | null;
  currentTime: number;
}

// Helper function to load persisted state from localStorage
function getPersistedState(): Partial<PersistedState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(
      "Failed to load audio player state from localStorage:",
      error
    );
  }

  return {};
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { addToHistory } = usePersistence();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayPromiseRef = useRef<Promise<void> | null>(null);

  // Initialize state from localStorage using lazy initialization
  const [state, setState] = useState<AudioPlayerState>(() => {
    const persistedState = getPersistedState();
    return {
      currentTrack: persistedState.currentTrack || null,
      isPlaying: false, // Never auto-play on reload
      currentTime: persistedState.currentTime || 0,
      duration: 0,
      volume: persistedState.volume ?? 1,
      isMuted: persistedState.isMuted ?? false,
      queue: persistedState.queue || [],
      currentQueueIndex: persistedState.currentQueueIndex ?? -1,
      shuffleActive: persistedState.shuffleActive ?? false,
      repeatMode: persistedState.repeatMode || "off",
      currentQuality: "LOSSLESS",
      streamUrl: null,
    };
  });

  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const preloadCache = useRef<Map<number, string>>(new Map());
  const originalQueueBeforeShuffle = useRef<Track[]>([]);
  const shuffledQueue = useRef<Track[]>([]);
  const playNextRef = useRef<(() => Promise<void>) | null>(null);
  const persistTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to safely play audio, handling AbortError from interrupted loads
  const safePlay = useCallback(async (audio: HTMLAudioElement) => {
    // Wait for any pending play promise to settle first
    if (currentPlayPromiseRef.current) {
      await currentPlayPromiseRef.current.catch(() => {
        // Silently ignore errors from previous play attempts
      });
    }

    // Create new play promise
    const playPromise = audio.play().catch((error) => {
      // AbortError is expected when switching tracks rapidly
      // Only log other types of errors
      if (error.name !== 'AbortError') {
        console.error("Playback failed:", error);
        setState((prev) => ({ ...prev, isPlaying: false }));
      }
    });

    // Store the promise so we can wait for it if needed
    currentPlayPromiseRef.current = playPromise;

    return playPromise;
  }, []);

  // Debounce persistence to avoid frequent localStorage writes
  useEffect(() => {
    // Clear any existing timer
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }

    // Don't persist currentTime changes immediately - debounce them
    persistTimerRef.current = setTimeout(() => {
      try {
        const stateToPersist: PersistedState = {
          volume: state.volume,
          isMuted: state.isMuted,
          shuffleActive: state.shuffleActive,
          repeatMode: state.repeatMode,
          queue: state.queue,
          currentQueueIndex: state.currentQueueIndex,
          currentTrack: state.currentTrack,
          currentTime: state.currentTime,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
      } catch (error) {
        console.error(
          "Failed to save audio player state to localStorage:",
          error
        );
      }
    }, 1000); // Debounce by 1 second

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [
    state.volume,
    state.isMuted,
    state.shuffleActive,
    state.repeatMode,
    state.queue,
    state.currentQueueIndex,
    state.currentTrack,
    state.currentTime,
  ]);

  // Restore the audio element state from persisted data
  useEffect(() => {
    const currentTrack = state.currentTrack;
    if (!audioRef.current || !currentTrack) return;

    let cancelled = false;
    const restoreAudioState = async () => {
      try {
        // Get stream URL for the persisted track
        const streamUrl = await api.getStreamUrl(
          currentTrack.id,
          state.currentQuality
        );
        if (streamUrl && !cancelled && audioRef.current) {
          audioRef.current.src = streamUrl;
          audioRef.current.currentTime = state.currentTime;
          audioRef.current.volume = state.volume;
          audioRef.current.muted = state.isMuted;

          setState((prev) => ({
            ...prev,
            streamUrl: streamUrl,
            duration: audioRef.current?.duration || 0,
          }));
        }
      } catch (error) {
        console.error("Failed to restore audio state:", error);
      }
    };

    restoreAudioState();

    return () => {
      cancelled = true;
    };
  }, []); // Empty deps array - only restore on mount

  // Create Audio element once on mount
  useEffect(() => {
    const audio = new Audio();
    // Set crossOrigin to allow Web Audio API access for spectrum analyzer
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Set up event listeners with stable refs
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };

    const handleEnded = () => {
      // Handle ended via ref callback that has access to current state
      if (playNextRef.current) {
        playNextRef.current();
      }
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleError = (e: Event) => {
      console.error("Audio element error:", e);
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleCanPlay = () => {
      // Audio is ready to play
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, []); // Empty deps - listeners are stable

  const playTrack = useCallback((track: Track, streamUrl: string) => {
    if (!audioRef.current || !streamUrl) return;

    audioRef.current.src = streamUrl;
    safePlay(audioRef.current);
    addToHistory(track);

    // Determine quality from track metadata
    const quality = track.audioQuality || "HIGH";

    setState((prev) => ({
      ...prev,
      currentTrack: track,
      isPlaying: true,
      currentTime: 0,
      currentQuality: quality,
      streamUrl: streamUrl,
    }));

    // Update Media Session metadata with multiple artwork sizes
    if ("mediaSession" in navigator) {
      const coverId = track.album?.cover || track.album?.id;
      const artwork = getMediaSessionArtwork(coverId);
      const artistName =
        track.artist?.name ||
        track.artists?.find((a) => a.type === "MAIN")?.name ||
        track.artists?.[0]?.name ||
        "Unknown Artist";

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: artistName,
        album: track.album?.title || "Unknown Album",
        artwork,
      });
    }
  }, [safePlay]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;

    // If no source is set, try to load the current track
    if (!audioRef.current.src && state.currentTrack) {
      try {
        const streamUrl = await api.getStreamUrl(
          state.currentTrack.id,
          state.currentQuality
        );
        if (streamUrl && audioRef.current) {
          audioRef.current.src = streamUrl;
          setState((prev) => ({ ...prev, streamUrl }));
        } else {
          console.error("Failed to get stream URL for current track");
          return;
        }
      } catch (error) {
        console.error("Failed to load track for playback:", error);
        return;
      }
    }

    if (!audioRef.current.src) {
      console.error("No audio source set and no current track to load");
      return;
    }

    await safePlay(audioRef.current);
  }, [state.currentTrack, state.currentQuality, safePlay]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !state.isMuted;
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, [state.isMuted]);

  // Queue management functions
  const addToQueue = useCallback((track: Track) => {
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, track],
    }));
  }, []);

  // Reorder queue without interrupting playback
  const reorderQueue = useCallback((newQueue: Track[], newCurrentIndex: number) => {
    setState((prev) => ({
      ...prev,
      queue: newQueue,
      currentQueueIndex: newCurrentIndex,
    }));
  }, []);

  const setQueue = useCallback(
    async (tracks: Track[], startIndex: number = 0) => {
      setState((prev) => {
        const quality = prev.currentQuality;

        // Start async loading after state update
        if (tracks.length > 0 && startIndex >= 0 && startIndex < tracks.length) {
          const track = tracks[startIndex];

          // Load and play asynchronously
          (async () => {
            try {
              const streamUrl = await api.getStreamUrl(track.id, quality);
              if (!streamUrl) {
                console.error("Failed to get stream URL for track:", track.id);
                return;
              }

              if (audioRef.current) {
                audioRef.current.src = streamUrl;

                const trackQuality = track.audioQuality || "HIGH";

                setState((prev) => ({
                  ...prev,
                  currentTrack: track,
                  currentTime: 0,
                  currentQuality: trackQuality,
                  streamUrl: streamUrl,
                }));

                // Play after state is set
                await safePlay(audioRef.current);
                addToHistory(track);
              }
            } catch (error) {
              console.error("Error setting up playback:", error);
            }
          })();
        }

        return {
          ...prev,
          queue: tracks,
          currentQueueIndex: startIndex,
        };
      });
    },
    [safePlay]
  );

  const playNext = useCallback(async () => {
    setState((prev) => {
      // Handle repeat-one mode
      if (prev.repeatMode === "one" && audioRef.current) {
        audioRef.current.currentTime = 0;
        safePlay(audioRef.current);
        return prev;
      }

      const currentQueue = prev.shuffleActive
        ? shuffledQueue.current
        : prev.queue;
      if (currentQueue.length === 0) return prev;

      let nextIndex: number;
      if (prev.repeatMode === "all") {
        nextIndex = (prev.currentQueueIndex + 1) % currentQueue.length;
      } else {
        nextIndex = prev.currentQueueIndex + 1;
        if (nextIndex >= currentQueue.length) {
          return { ...prev, isPlaying: false };
        }
      }

      const track = currentQueue[nextIndex];

      // Load and play asynchronously
      (async () => {
        try {
          const streamUrl =
            preloadCache.current.get(track.id) ||
            (await api.getStreamUrl(track.id, prev.currentQuality));

          if (!streamUrl) {
            console.error("Failed to get stream URL for track:", track.id);
            return;
          }

          if (audioRef.current) {
            audioRef.current.src = streamUrl;

            const quality = track.audioQuality || "HIGH";

            setState((s) => ({
              ...s,
              currentTrack: track,
              currentQueueIndex: nextIndex,
              currentTime: 0,
              currentQuality: quality,
              streamUrl: streamUrl,
            }));

            await safePlay(audioRef.current);
            addToHistory(track);

            // Update Media Session metadata with multiple artwork sizes
            if ("mediaSession" in navigator) {
              const coverId = track.album?.cover || track.album?.id;
              const artwork = getMediaSessionArtwork(coverId);
              const artistName =
                track.artist?.name ||
                track.artists?.find((a) => a.type === "MAIN")?.name ||
                track.artists?.[0]?.name ||
                "Unknown Artist";

              navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: artistName,
                album: track.album?.title || "Unknown Album",
                artwork,
              });
            }
          }
        } catch (error) {
          console.error("Error playing next track:", error);
        }
      })();

      return prev;
    });
  }, [safePlay]);

  // Keep ref updated
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrev = useCallback(async () => {
    setState((prev) => {
      const currentQueue = prev.shuffleActive
        ? shuffledQueue.current
        : prev.queue;
      if (currentQueue.length === 0) return prev;

      // If more than 3 seconds into the song, restart it
      if (prev.currentTime > 3) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        return { ...prev, currentTime: 0 };
      }

      let prevIndex: number;
      if (prev.repeatMode === "all") {
        prevIndex = prev.currentQueueIndex - 1;
        if (prevIndex < 0) {
          prevIndex = currentQueue.length - 1;
        }
      } else {
        prevIndex = Math.max(0, prev.currentQueueIndex - 1);
      }

      const track = currentQueue[prevIndex];

      // Load and play asynchronously
      (async () => {
        try {
          const streamUrl = await api.getStreamUrl(track.id, prev.currentQuality);

          if (!streamUrl) {
            console.error("Failed to get stream URL for track:", track.id);
            return;
          }

          if (audioRef.current) {
            audioRef.current.src = streamUrl;

            const quality = track.audioQuality || "HIGH";

            setState((s) => ({
              ...s,
              currentTrack: track,
              currentQueueIndex: prevIndex,
              currentTime: 0,
              currentQuality: quality,
              streamUrl: streamUrl,
            }));

            await safePlay(audioRef.current);
            addToHistory(track);
          }
        } catch (error) {
          console.error("Error playing previous track:", error);
        }
      })();

      return prev;
    });
  }, [safePlay]);

  const toggleShuffle = useCallback(() => {
    setState((prev) => {
      const newShuffleActive = !prev.shuffleActive;

      if (newShuffleActive) {
        originalQueueBeforeShuffle.current = [...prev.queue];
        const currentTrack = prev.queue[prev.currentQueueIndex];
        const newShuffled = [...prev.queue].sort(() => Math.random() - 0.5);
        shuffledQueue.current = newShuffled;
        const newIndex = newShuffled.findIndex(
          (t) => t.id === currentTrack?.id
        );

        return {
          ...prev,
          shuffleActive: true,
          currentQueueIndex: newIndex !== -1 ? newIndex : 0,
        };
      } else {
        const currentTrack = prev.queue[prev.currentQueueIndex];
        const originalQueue = originalQueueBeforeShuffle.current;
        const newIndex = originalQueue.findIndex(
          (t) => t.id === currentTrack?.id
        );

        return {
          ...prev,
          queue: originalQueue,
          shuffleActive: false,
          currentQueueIndex: newIndex !== -1 ? newIndex : 0,
        };
      }
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];

      return {
        ...prev,
        repeatMode: nextMode,
      };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState((prev) => {
      const newQueue = [...prev.queue];
      newQueue.splice(index, 1);

      let newIndex = prev.currentQueueIndex;
      if (index < prev.currentQueueIndex) {
        newIndex--;
      } else if (index === prev.currentQueueIndex) {
        newIndex = Math.min(newIndex, newQueue.length - 1);
      }

      return {
        ...prev,
        queue: newQueue,
        currentQueueIndex: newIndex,
      };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState((prev) => ({
      ...prev,
      queue: [],
      currentQueueIndex: -1,
    }));
    preloadCache.current.clear();
  }, []);

  // Setup Media Session API for hardware controls
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const DEFAULT_SEEK_OFFSET = 10; // seconds

    // Basic playback controls
    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => playPrev());
    navigator.mediaSession.setActionHandler("nexttrack", () => playNext());

    // Seek to specific position
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        seek(details.seekTime);
      }
    });

    // Seek forward (10 seconds or custom offset)
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const offset = details.seekOffset || DEFAULT_SEEK_OFFSET;
      if (audioRef.current) {
        const newTime = Math.min(
          audioRef.current.currentTime + offset,
          audioRef.current.duration || Infinity
        );
        seek(newTime);
      }
    });

    // Seek backward (10 seconds or custom offset)
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const offset = details.seekOffset || DEFAULT_SEEK_OFFSET;
      if (audioRef.current) {
        const newTime = Math.max(audioRef.current.currentTime - offset, 0);
        seek(newTime);
      }
    });

    // Stop playback
    navigator.mediaSession.setActionHandler("stop", () => {
      pause();
      seek(0);
    });

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekto", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("stop", null);
      }
    };
  }, [play, pause, playPrev, playNext, seek]);

  // Update Media Session position state for progress display
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    // Update playback state
    navigator.mediaSession.playbackState = state.isPlaying ? "playing" : "paused";

    // Update position state for progress indicator
    if (state.duration > 0 && !isNaN(state.duration) && !isNaN(state.currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: state.duration,
          playbackRate: 1,
          position: Math.min(state.currentTime, state.duration),
        });
      } catch (error) {
      }
    }
  }, [state.isPlaying, state.currentTime, state.duration]);

  const getAudioElement = useCallback(() => {
    return audioRef.current;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      playTrack,
      addToQueue,
      setQueue,
      reorderQueue,
      play,
      pause,
      togglePlayPause,
      playNext,
      playPrev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      removeFromQueue,
      clearQueue,
      getAudioElement,
      isStatsOpen,
      setIsStatsOpen,
    }),
    [
      state,
      playTrack,
      addToQueue,
      setQueue,
      reorderQueue,
      play,
      pause,
      togglePlayPause,
      playNext,
      playPrev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      removeFromQueue,
      clearQueue,
      getAudioElement,
      isStatsOpen,
    ]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}

// Convenience hooks for accessing specific parts of the audio player state
// These replace the old split contexts and avoid event-based synchronization
export function usePlaybackState() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("usePlaybackState must be used within AudioPlayerProvider");
  }

  return useMemo(
    () => ({
      isPlaying: context.isPlaying,
      currentTime: context.currentTime,
      duration: context.duration,
      volume: context.volume,
      isMuted: context.isMuted,
    }),
    [
      context.isPlaying,
      context.currentTime,
      context.duration,
      context.volume,
      context.isMuted,
    ]
  );
}

export function useQueue() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useQueue must be used within AudioPlayerProvider");
  }

  return useMemo(
    () => ({
      currentTrack: context.currentTrack,
      queue: context.queue,
      currentQueueIndex: context.currentQueueIndex,
      shuffleActive: context.shuffleActive,
      repeatMode: context.repeatMode,
      currentQuality: context.currentQuality,
      streamUrl: context.streamUrl,
    }),
    [
      context.currentTrack,
      context.queue,
      context.currentQueueIndex,
      context.shuffleActive,
      context.repeatMode,
      context.currentQuality,
      context.streamUrl,
    ]
  );
}

// Re-export provider aliases for backward compatibility
export const PlaybackStateProvider = AudioPlayerProvider;
export const QueueProvider = AudioPlayerProvider;
