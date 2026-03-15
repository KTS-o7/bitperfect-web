import { api } from "@/lib/api";
import { Track } from "@/lib/api/types";

export function getMediaSessionArtwork(coverId: string | number | undefined): MediaImage[] {
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

export function updateMediaSessionMetadata(track: Track): void {
  if (!("mediaSession" in navigator)) return;

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

export function updateMediaSessionPlaybackState(isPlaying: boolean, duration: number, currentTime: number): void {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

  if (duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Ignore position state errors
    }
  }
}

interface MediaSessionActions {
  play: () => void;
  pause: () => void;
  playPrev: () => void;
  playNext: () => void;
  seek: (time: number) => void;
}

export function setupMediaSession(actions: MediaSessionActions): () => void {
  if (!("mediaSession" in navigator)) {
    return () => {};
  }

  const { play, pause, playPrev, playNext, seek } = actions;
  const DEFAULT_SEEK_OFFSET = 10;

  navigator.mediaSession.setActionHandler("play", play);
  navigator.mediaSession.setActionHandler("pause", pause);
  navigator.mediaSession.setActionHandler("previoustrack", playPrev);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);

  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime !== undefined) {
      seek(details.seekTime);
    }
  });

  navigator.mediaSession.setActionHandler("seekforward", (details) => {
    // Note: This would need audioRef access - handled in context
  });

  navigator.mediaSession.setActionHandler("seekbackward", (details) => {
    // Note: This would need audioRef access - handled in context
  });

  navigator.mediaSession.setActionHandler("stop", () => {
    pause();
    seek(0);
  });

  return () => {
    navigator.mediaSession.setActionHandler("play", null);
    navigator.mediaSession.setActionHandler("pause", null);
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("nexttrack", null);
    navigator.mediaSession.setActionHandler("seekto", null);
    navigator.mediaSession.setActionHandler("seekforward", null);
    navigator.mediaSession.setActionHandler("seekbackward", null);
    navigator.mediaSession.setActionHandler("stop", null);
  };
}
