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

  const coverId = track.album?.cover;
  const artwork = coverId ? getMediaSessionArtwork(coverId) : [];
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
