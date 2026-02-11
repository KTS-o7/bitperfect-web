"use client";

import { useEffect, useCallback, useRef } from "react";
import { Track } from "@/lib/api/types";
import { api } from "@/lib/api";

interface MediaSessionOptions {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSeekForward?: (offset: number) => void;
  onSeekBackward?: (offset: number) => void;
  onPreviousTrack: () => void;
  onNextTrack: () => void;
  onStop?: () => void;
}

const DEFAULT_SEEK_OFFSET = 10; // seconds

/**
 * Enhanced Media Session hook for lock screen and notification controls
 * Provides:
 * - Multiple artwork sizes for different device requirements
 * - All standard action handlers (play, pause, seek, skip)
 * - Position state updates for progress display
 * - Seek forward/backward for quick navigation
 */
export function useMediaSession({
  track,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  onSeekForward,
  onSeekBackward,
  onPreviousTrack,
  onNextTrack,
  onStop,
}: MediaSessionOptions) {
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate multiple artwork sizes for different platforms
  const getArtworkSizes = useCallback((track: Track) => {
    const coverId = track.album?.cover || track.album?.id;
    if (!coverId) return [];

    // Generate multiple sizes for different device requirements
    // Small: 96x96 (Android notification small icon)
    // Medium: 128x128, 256x256 (iOS Control Center)
    // Large: 512x512 (Android Media Notification, iOS Lock Screen)
    const sizes = [
      { size: "96", dimensions: "96x96" },
      { size: "160", dimensions: "160x160" },
      { size: "320", dimensions: "320x320" },
      { size: "640", dimensions: "640x640" },
      { size: "1280", dimensions: "1280x1280" },
    ];

    return sizes.map(({ size, dimensions }) => ({
      src: api.getCoverUrl(coverId, size),
      sizes: dimensions,
      type: "image/jpeg",
    }));
  }, []);

  // Update metadata when track changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;

    const artwork = getArtworkSizes(track);
    const artistName =
      track.artist?.name ||
      track.artists?.find((a) => a.type === "MAIN")?.name ||
      track.artists?.[0]?.name ||
      "Unknown Artist";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: artistName,
      album: track.album?.title || "Unknown Album",
      artwork: artwork.length > 0 ? artwork : undefined,
    });
  }, [track, getArtworkSizes]);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Update position state periodically for progress display
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const updatePositionState = () => {
      if (duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: Math.min(currentTime, duration),
          });
        } catch (error) {
          // Some browsers may not support setPositionState
          console.debug("setPositionState not supported:", error);
        }
      }
    };

    // Update immediately
    updatePositionState();

    // Update every second while playing for smooth progress
    if (isPlaying) {
      positionUpdateInterval.current = setInterval(updatePositionState, 1000);
    }

    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
        positionUpdateInterval.current = null;
      }
    };
  }, [isPlaying, currentTime, duration]);

  // Handle seek forward
  const handleSeekForward = useCallback(
    (details: MediaSessionActionDetails) => {
      const offset = details.seekOffset || DEFAULT_SEEK_OFFSET;
      if (onSeekForward) {
        onSeekForward(offset);
      } else {
        const newTime = Math.min(currentTime + offset, duration);
        onSeek(newTime);
      }
    },
    [currentTime, duration, onSeek, onSeekForward]
  );

  // Handle seek backward
  const handleSeekBackward = useCallback(
    (details: MediaSessionActionDetails) => {
      const offset = details.seekOffset || DEFAULT_SEEK_OFFSET;
      if (onSeekBackward) {
        onSeekBackward(offset);
      } else {
        const newTime = Math.max(currentTime - offset, 0);
        onSeek(newTime);
      }
    },
    [currentTime, onSeek, onSeekBackward]
  );

  // Handle seek to specific position
  const handleSeekTo = useCallback(
    (details: MediaSessionActionDetails) => {
      if (details.seekTime !== undefined) {
        onSeek(details.seekTime);
      }
    },
    [onSeek]
  );

  // Register action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    // Basic controls
    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("previoustrack", onPreviousTrack);
    navigator.mediaSession.setActionHandler("nexttrack", onNextTrack);

    // Seek controls
    navigator.mediaSession.setActionHandler("seekto", handleSeekTo);
    navigator.mediaSession.setActionHandler("seekforward", handleSeekForward);
    navigator.mediaSession.setActionHandler("seekbackward", handleSeekBackward);

    // Optional stop handler
    if (onStop) {
      navigator.mediaSession.setActionHandler("stop", onStop);
    }

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
  }, [
    onPlay,
    onPause,
    onPreviousTrack,
    onNextTrack,
    onStop,
    handleSeekTo,
    handleSeekForward,
    handleSeekBackward,
  ]);

  // Return utility to manually trigger metadata update (useful for queue changes)
  const updateMetadata = useCallback(() => {
    if (!("mediaSession" in navigator) || !track) return;

    const artwork = getArtworkSizes(track);
    const artistName =
      track.artist?.name ||
      track.artists?.find((a) => a.type === "MAIN")?.name ||
      track.artists?.[0]?.name ||
      "Unknown Artist";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: artistName,
      album: track.album?.title || "Unknown Album",
      artwork: artwork.length > 0 ? artwork : undefined,
    });
  }, [track, getArtworkSizes]);

  return { updateMetadata };
}
