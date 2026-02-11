"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

interface PlaybackStateContextType extends PlaybackState {
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
}

const PlaybackStateContext = createContext<
  PlaybackStateContextType | undefined
>(undefined);

export function PlaybackStateProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Listen for updates from AudioPlayerContext
  useEffect(() => {
    const handlePlaybackUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setIsPlaying(detail.isPlaying);
        setCurrentTime(detail.currentTime);
        setDuration(detail.duration);
        setVolume(detail.volume);
        setIsMuted(detail.isMuted);
      }
    };

    window.addEventListener("playbackStateUpdate", handlePlaybackUpdate);
    return () =>
      window.removeEventListener("playbackStateUpdate", handlePlaybackUpdate);
  }, []);

  return (
    <PlaybackStateContext.Provider
      value={{
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        setIsPlaying,
        setCurrentTime,
        setDuration,
        setVolume,
        setIsMuted,
      }}
    >
      {children}
    </PlaybackStateContext.Provider>
  );
}

export function usePlaybackState() {
  const context = useContext(PlaybackStateContext);
  if (!context) {
    throw new Error(
      "usePlaybackState must be used within PlaybackStateProvider"
    );
  }
  return context;
}
