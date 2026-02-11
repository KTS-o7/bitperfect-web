import type { Track, Album, Playlist, Artist } from "./types";

export const QUALITY = "LOSSLESS";

export const REPEAT_MODE = {
  OFF: 0,
  ALL: 1,
  ONE: 2,
} as const;

export const AUDIO_QUALITIES = {
  HI_RES_LOSSLESS: "HI_RES_LOSSLESS",
  LOSSLESS: "LOSSLESS",
  HIGH: "HIGH",
  LOW: "LOW",
} as const;

export const QUALITY_PRIORITY = ["HI_RES_LOSSLESS", "LOSSLESS", "HIGH", "LOW"];

export const QUALITY_TOKENS = {
  HI_RES_LOSSLESS: [
    "HI_RES_LOSSLESS",
    "HIRES_LOSSLESS",
    "HIRESLOSSLESS",
    "HIFI_PLUS",
    "HI_RES_FLAC",
    "HI_RES",
    "HIRES",
    "MASTER",
    "MASTER_QUALITY",
    "MQA",
  ],
  LOSSLESS: ["LOSSLESS", "HIFI"],
  HIGH: ["HIGH", "HIGH_QUALITY"],
  LOW: ["LOW", "LOW_QUALITY"],
};

export const RATE_LIMIT_ERROR_MESSAGE =
  "Too Many Requests. Please wait a moment and try again.";

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const sanitizeForFilename = (value?: string): string => {
  if (!value) return "Unknown";
  return value
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
};

export const getExtensionForQuality = (quality: string): string => {
  switch (quality) {
    case "LOW":
    case "HIGH":
      return "m4a";
    default:
      return "flac";
  }
};

const sanitizeToken = (value: string): string => {
  if (!value) return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
};

export const normalizeQualityToken = (value?: string): string | null => {
  if (!value) return null;

  const token = sanitizeToken(value);

  for (const [quality, aliases] of Object.entries(QUALITY_TOKENS)) {
    if (aliases.includes(token)) {
      return quality;
    }
  }

  return null;
};

export const deriveQualityFromTags = (rawTags?: string[]): string | null => {
  if (!Array.isArray(rawTags)) return null;

  const candidates: string[] = [];
  for (const tag of rawTags) {
    if (typeof tag !== "string") continue;
    const normalized = normalizeQualityToken(tag);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  }

  return pickBestQuality(candidates);
};

export const pickBestQuality = (
  candidates: (string | null)[]
): string | null => {
  let best: string | null = null;
  let bestRank = Infinity;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const rank = QUALITY_PRIORITY.indexOf(candidate);
    const currentRank = rank === -1 ? Infinity : rank;

    if (currentRank < bestRank) {
      best = candidate;
      bestRank = currentRank;
    }
  }

  return best;
};

export const deriveTrackQuality = (track: Track): string | null => {
  if (!track) return null;

  const candidates = [
    deriveQualityFromTags(track.mediaMetadata?.tags),
    deriveQualityFromTags(track.album?.mediaMetadata?.tags),
    normalizeQualityToken(track.audioQuality),
  ];

  return pickBestQuality(candidates);
};

export const getTrackTitle = (
  track: Track,
  options: { fallback?: string } = {}
): string => {
  const fallback = options.fallback || "Unknown Title";
  if (!track?.title) return fallback;
  return track?.version ? `${track.title} (${track.version})` : track.title;
};

export const getTrackArtists = (
  track: Track = {} as Track,
  options: { fallback?: string } = {}
): string => {
  const fallback = options.fallback || "Unknown Artist";

  if (track?.artists?.length) {
    return track.artists.map((artist: Artist) => artist?.name).join(", ");
  }

  return fallback;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0 min";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
};

export const hasExplicitContent = (item: Track | Album | Playlist): boolean => {
  if ("explicitLyrics" in item) {
    return item.explicit === true || item.explicitLyrics === true;
  }
  return item.explicit === true;
};
