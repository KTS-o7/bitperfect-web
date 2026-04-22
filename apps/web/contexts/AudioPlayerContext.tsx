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
import {
  AudioPlayerState,
  AudioPlayerContextValue,
  RepeatMode,
  PersistedState,
} from "@/lib/audioPlayerTypes";
import { getPersistedState, savePersistedState } from "@/lib/audioStorage";
import { updateMediaSessionMetadata, updateMediaSessionPlaybackState } from "@/lib/mediaSession";
import { useLyrics } from "@/hooks/useLyrics";

// State context — updates on every timeupdate (~4Hz during playback)
const AudioPlayerStateContext = createContext<AudioPlayerContextValue | null>(null);
// Actions context — stable after mount, never triggers re-renders on its own
const AudioPlayerActionsContext = createContext<AudioPlayerContextValue | null>(null);

// Export function AudioPlayerProvider for backward compatibility
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

  const {
    lyrics,
    currentLineIndex,
    isLoading: isLoadingLyrics,
    error: lyricsError,
    hasLyrics,
    hasSyncedLyrics,
  } = useLyrics(state.currentTrack, state.currentTime, state.isPlaying);

  const preloadCache = useRef<Map<number, string>>(new Map());
  const originalQueueBeforeShuffle = useRef<Track[]>([]);
  const shuffledQueue = useRef<Track[]>([]);
  const playNextRef = useRef<(() => Promise<void>) | null>(null);
  const persistTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Always-current snapshot of state for use inside stable callbacks
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

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

      savePersistedState(stateToPersist);
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

  // Create Audio element and restore persisted state — both in one effect so
  // the audio element exists before we attempt to restore the stream URL.
  useEffect(() => {
    const audio = new Audio();
    // NOTE: Do NOT set crossOrigin here. Some CDNs (Amazon) don't send CORS headers,
    // and setting crossOrigin="anonymous" causes the browser to block those streams.
    // The Web Audio API spectrum analyzer in StatsForNerds won't work for those tracks,
    // but playback will. CORS-enabled CDNs (Tidal/lgf) still work without this flag.
    audioRef.current = audio;

    // Restore persisted track state (src + seek position) after creating the element
    const currentTrack = state.currentTrack;
    let cancelled = false;

    if (currentTrack) {
      const restoreAudioState = async () => {
        try {
          const streamUrl = await api.getStreamUrl(
            currentTrack.id,
            state.currentQuality
          );
          if (streamUrl && !cancelled && audioRef.current) {
            const audio = audioRef.current;
            const savedTime = state.currentTime;

            // Must wait for metadata before seeking — seeking on HAVE_NOTHING is silently dropped
            const seekOnce = () => {
              if (savedTime > 0) audio.currentTime = savedTime;
              audio.removeEventListener("loadedmetadata", seekOnce);
            };
            audio.addEventListener("loadedmetadata", seekOnce);

            audio.src = streamUrl;
            audio.volume = state.volume;
            audio.muted = state.isMuted;

            setState((prev) => ({
              ...prev,
              streamUrl: streamUrl,
            }));
          }
        } catch (error) {
          console.error("Failed to restore audio state:", error);
        }
      };

      restoreAudioState();
    }

    return () => {
      cancelled = true;
      audio.pause();
      audio.src = "";
    };
  }, []); // Empty deps array - only runs on mount

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

    updateMediaSessionMetadata(track);
  }, [safePlay]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    const s = stateRef.current;

    // If no real source is loaded yet, fetch it now
    if (!s.streamUrl && s.currentTrack) {
      try {
        const streamUrl = await api.getStreamUrl(s.currentTrack.id, s.currentQuality);
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

    if (!audioRef.current.src || !s.streamUrl) return;

    await safePlay(audioRef.current);
  }, [safePlay]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (stateRef.current.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [play, pause]);

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
    const newMuted = !stateRef.current.isMuted;
    audioRef.current.muted = newMuted;
    setState((prev) => ({ ...prev, isMuted: newMuted }));
  }, []);

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
      if (tracks.length === 0 || startIndex < 0 || startIndex >= tracks.length) {
        setState((prev) => ({ ...prev, queue: tracks, currentQueueIndex: startIndex }));
        return;
      }

      const track = tracks[startIndex];

      // Set the queue and currentTrack immediately so the player UI appears right away
      // If shuffle is active, shuffle the new queue and find the starting track in it
      let effectiveStartIndex = startIndex;
      if (stateRef.current.shuffleActive) {
        originalQueueBeforeShuffle.current = [...tracks];
        const newShuffled = [...tracks].sort(() => Math.random() - 0.5);
        // Put the selected track first so it plays immediately
        const selectedTrackIdx = newShuffled.findIndex((t) => t.id === track.id);
        if (selectedTrackIdx > 0) {
          newShuffled.splice(selectedTrackIdx, 1);
          newShuffled.unshift(track);
        }
        shuffledQueue.current = newShuffled;
        effectiveStartIndex = 0;
      }

      setState((prev) => ({
        ...prev,
        queue: tracks,
        currentQueueIndex: effectiveStartIndex,
        currentTrack: track,
        currentTime: 0,
        streamUrl: null,
      }));

      // Fetch the stream URL and start playback asynchronously
      try {
        const streamUrl = await api.getStreamUrl(track.id, stateRef.current.currentQuality);
        if (!streamUrl) {
          console.error("Failed to get stream URL for track:", track.id);
          return;
        }

        if (audioRef.current) {
          audioRef.current.src = streamUrl;

          const trackQuality = track.audioQuality || "HIGH";

          setState((prev) => ({
            ...prev,
            currentQuality: trackQuality,
            streamUrl: streamUrl,
          }));

          await safePlay(audioRef.current);
          addToHistory(track);
        }
      } catch (error) {
        console.error("Error setting up playback:", error);
      }
    },
    [safePlay, addToHistory]
  );

  const playNext = useCallback(async () => {
    const s = stateRef.current;

    // Handle repeat-one mode
    if (s.repeatMode === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      await safePlay(audioRef.current);
      return;
    }

    const currentQueue = s.shuffleActive ? shuffledQueue.current : s.queue;
    if (currentQueue.length === 0) return;

    let nextIndex: number;
    if (s.repeatMode === "all") {
      nextIndex = (s.currentQueueIndex + 1) % currentQueue.length;
    } else {
      nextIndex = s.currentQueueIndex + 1;
      if (nextIndex >= currentQueue.length) {
        setState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }
    }

    const track = currentQueue[nextIndex];

    // Update track and index immediately so the UI reflects the change
    setState((prev) => ({
      ...prev,
      currentTrack: track,
      currentQueueIndex: nextIndex,
      currentTime: 0,
      streamUrl: null,
    }));

    try {
      const streamUrl =
        preloadCache.current.get(track.id) ||
        (await api.getStreamUrl(track.id, s.currentQuality));

      if (!streamUrl) {
        console.error("Failed to get stream URL for track:", track.id);
        return;
      }

      if (audioRef.current) {
        audioRef.current.src = streamUrl;

        const quality = track.audioQuality || "HIGH";

        setState((prev) => ({
          ...prev,
          currentQuality: quality,
          streamUrl: streamUrl,
        }));

        await safePlay(audioRef.current);
        addToHistory(track);

        updateMediaSessionMetadata(track);
      }
    } catch (error) {
      console.error("Error playing next track:", error);
    }
  }, [safePlay, addToHistory]);

  // Keep ref updated
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrev = useCallback(async () => {
    const s = stateRef.current;
    const currentQueue = s.shuffleActive ? shuffledQueue.current : s.queue;
    if (currentQueue.length === 0) return;

    // If more than 3 seconds into the song, restart it
    if (s.currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setState((prev) => ({ ...prev, currentTime: 0 }));
      return;
    }

    let prevIndex: number;
    if (s.repeatMode === "all") {
      prevIndex = s.currentQueueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = currentQueue.length - 1;
      }
    } else {
      prevIndex = Math.max(0, s.currentQueueIndex - 1);
    }

    const track = currentQueue[prevIndex];

    // Update track and index immediately so the UI reflects the change
    setState((prev) => ({
      ...prev,
      currentTrack: track,
      currentQueueIndex: prevIndex,
      currentTime: 0,
      streamUrl: null,
    }));

    try {
      const streamUrl = await api.getStreamUrl(track.id, s.currentQuality);

      if (!streamUrl) {
        console.error("Failed to get stream URL for track:", track.id);
        return;
      }

      if (audioRef.current) {
        audioRef.current.src = streamUrl;

        const quality = track.audioQuality || "HIGH";

        setState((prev) => ({
          ...prev,
          currentQuality: quality,
          streamUrl: streamUrl,
        }));

        await safePlay(audioRef.current);
        addToHistory(track);
      }
    } catch (error) {
      console.error("Error playing previous track:", error);
    }
  }, [safePlay, addToHistory]);

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
        // When shuffle is ON, currentQueueIndex points into shuffledQueue, not prev.queue
        const currentTrack = shuffledQueue.current[prev.currentQueueIndex] ?? prev.queue[prev.currentQueueIndex];
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
    updateMediaSessionPlaybackState(state.isPlaying, state.duration, state.currentTime);
  }, [state.isPlaying, state.currentTime, state.duration]);

  const getAudioElement = useCallback(() => {
    return audioRef.current;
  }, []);

  // Stable actions — only change if their own deps change (rarely)
  const actions = useMemo(
    () => ({
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
      setIsStatsOpen,
    }),
    [
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
      setIsStatsOpen,
    ]
  );

  // Volatile state — changes on every timeupdate during playback
  const stateValue = useMemo(
    () => ({
      ...state,
      isStatsOpen,
      lyrics,
      currentLineIndex,
      isLoadingLyrics,
      lyricsError,
      hasLyrics,
      hasSyncedLyrics,
      ...actions,
    }),
    [state, isStatsOpen, lyrics, currentLineIndex, isLoadingLyrics, lyricsError, hasLyrics, hasSyncedLyrics, actions]
  );

  return (
    <AudioPlayerActionsContext.Provider value={actions as unknown as AudioPlayerContextValue}>
      <AudioPlayerStateContext.Provider value={stateValue}>
        {children}
      </AudioPlayerStateContext.Provider>
    </AudioPlayerActionsContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerStateContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}

export function useAudioPlayerActions() {
  const context = useContext(AudioPlayerActionsContext);
  if (!context) {
    throw new Error("useAudioPlayerActions must be used within AudioPlayerProvider");
  }
  return context;
}

// Convenience hooks for accessing specific parts of the audio player state
// These replace the old split contexts and avoid event-based synchronization
export function usePlaybackState() {
  const context = useContext(AudioPlayerStateContext);
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
  const context = useContext(AudioPlayerStateContext);
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
