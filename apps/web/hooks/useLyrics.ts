import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { LyricsData, SyncedLyric, Track } from "@/lib/api/types";

export function useLyrics(
  currentTrack: Track | null,
  currentTime: number,
  isPlaying: boolean
) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousTrackIdRef = useRef<number | null>(null);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack || currentTrack.id === previousTrackIdRef.current) {
      return;
    }

    const trackId = currentTrack.id;
    previousTrackIdRef.current = trackId;

    // Use AbortController for better cancellation
    const controller = new AbortController();

    const fetchLyrics = async () => {
      // Batch all initial state updates into a single object
      const initialState = {
        isLoading: true,
        error: null,
        lyrics: null,
        currentLineIndex: -1,
      };

      // Set all loading states at once
      setIsLoading(initialState.isLoading);
      setError(initialState.error);
      setLyrics(initialState.lyrics);
      setCurrentLineIndex(initialState.currentLineIndex);

      try {
        const data = await api.fetchLyrics(currentTrack);
        if (!controller.signal.aborted) {
          // Batch success state updates
          setLyrics(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching lyrics:", err);
        if (!controller.signal.aborted) {
          // Batch error state updates
          setError("Failed to load lyrics");
          setIsLoading(false);
        }
      }
    };

    fetchLyrics();

    return () => {
      controller.abort();
    };
  }, [currentTrack]);

  // Update current line based on playback time
  useEffect(() => {
    if (!lyrics?.parsed || !isPlaying) {
      setCurrentLineIndex(-1);
      return;
    }

    const newIndex = getCurrentLineIndex(lyrics.parsed, currentTime);
    setCurrentLineIndex((prev) => (prev !== newIndex ? newIndex : prev));
  }, [currentTime, lyrics?.parsed, isPlaying]); // Use lyrics.parsed instead of lyrics object

  const hasLyrics = Boolean(lyrics?.lyrics || lyrics?.parsed);
  const hasSyncedLyrics = Boolean(lyrics?.parsed && lyrics.parsed.length > 0);

  return {
    lyrics,
    currentLineIndex,
    isLoading,
    error,
    hasLyrics,
    hasSyncedLyrics,
  };
}

// Find the current line index based on playback time
function getCurrentLineIndex(
  syncedLyrics: SyncedLyric[],
  currentTime: number
): number {
  let currentIndex = -1;
  for (let i = 0; i < syncedLyrics.length; i++) {
    if (currentTime >= syncedLyrics[i].time) {
      currentIndex = i;
    } else {
      break;
    }
  }
  return currentIndex;
}
