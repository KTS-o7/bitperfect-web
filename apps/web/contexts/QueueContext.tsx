"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { Track } from "@/lib/api/types";

type RepeatMode = "off" | "all" | "one";

interface QueueState {
  currentTrack: Track | null;
  queue: Track[];
  currentQueueIndex: number;
  shuffleActive: boolean;
  repeatMode: RepeatMode;
  currentQuality: string;
  streamUrl: string | null;
}

interface QueueContextType extends QueueState {
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (tracks: Track[]) => void;
  setCurrentQueueIndex: (index: number) => void;
  setShuffleActive: (active: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setCurrentQuality: (quality: string) => void;
  setStreamUrl: (url: string | null) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [shuffleActive, setShuffleActive] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [currentQuality, setCurrentQuality] = useState("LOSSLESS");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Listen for updates from AudioPlayerContext
  useEffect(() => {
    const handleQueueUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setCurrentTrack(detail.currentTrack);
        setQueue(detail.queue);
        setCurrentQueueIndex(detail.currentQueueIndex);
        setShuffleActive(detail.shuffleActive);
        setRepeatMode(detail.repeatMode);
        setCurrentQuality(detail.currentQuality);
        setStreamUrl(detail.streamUrl);
      }
    };

    window.addEventListener("queueStateUpdate", handleQueueUpdate);
    return () =>
      window.removeEventListener("queueStateUpdate", handleQueueUpdate);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((prev) => {
        const newQueue = [...prev];
        newQueue.splice(index, 1);
        return newQueue;
      });

      setCurrentQueueIndex((prevIndex) => {
        if (index < prevIndex) {
          return prevIndex - 1;
        } else if (index === prevIndex) {
          return Math.min(prevIndex, queue.length - 2);
        }
        return prevIndex;
      });
    },
    [queue.length]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentQueueIndex(-1);
  }, []);

  return (
    <QueueContext.Provider
      value={{
        currentTrack,
        queue,
        currentQueueIndex,
        shuffleActive,
        repeatMode,
        currentQuality,
        streamUrl,
        setCurrentTrack,
        setQueue,
        setCurrentQueueIndex,
        setShuffleActive,
        setRepeatMode,
        setCurrentQuality,
        setStreamUrl,
        addToQueue,
        removeFromQueue,
        clearQueue,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used within QueueProvider");
  }
  return context;
}
