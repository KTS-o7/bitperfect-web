"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAudioPlayer, usePlaybackState, useQueue } from "@/contexts/AudioPlayerContext";
import { api } from "@/lib/api";

interface StatsForNerdsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  trackId: string;
  quality: string;
  codec: string;
  currentTime: string;
  bufferHealth: string;
  volume: string;
  cacheSize: string;
  sourceUrl: string;
  bitrate: string;
}

export function StatsForNerds({ isOpen, onClose }: StatsForNerdsProps) {
  // Use split contexts for state
  const { currentTime, volume, isMuted } = usePlaybackState();
  const { currentTrack, currentQuality, streamUrl } = useQueue();

  // Still need AudioPlayerContext for methods
  const { getAudioElement } = useAudioPlayer();

  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    const updateStats = () => {
      const audio = getAudioElement();
      if (!audio) return;

      // Calculate buffer health
      let bufferHealth = 0;
      try {
        if (audio.buffered.length > 0) {
          bufferHealth =
            audio.buffered.end(audio.buffered.length - 1) - audio.currentTime;
        }
      } catch (e) {
        console.error("Error calculating buffer health:", e);
      }

      // Determine codec and bitrate
      let codec = "AAC";
      let bitrate = "256kbps";

      if (
        currentQuality === "LOSSLESS" ||
        currentQuality === "HI_RES" ||
        currentQuality === "HI_RES_LOSSLESS"
      ) {
        codec = "FLAC / 16-bit";
        bitrate = "~1411kbps";
      } else if (currentQuality === "HIGH") {
        codec = "AAC";
        bitrate = "320kbps";
      } else if (currentQuality === "LOW") {
        codec = "AAC";
        bitrate = "96kbps";
      }

      // Get source hostname
      let sourceHost = "N/A";
      if (streamUrl) {
        try {
          sourceHost = new URL(streamUrl).hostname;
        } catch {
          sourceHost = "Invalid URL";
        }
      }

      // Get cache stats
      const cacheStats = api.getCacheStats();
      const cacheInfo = `${cacheStats.total} entries (${
        cacheStats.streamUrls || 0
      } streams)`;

      setStats({
        trackId: currentTrack.id.toString(),
        quality: currentQuality,
        codec: codec,
        currentTime: currentTime.toFixed(2) + "s",
        bufferHealth: bufferHealth.toFixed(2) + "s",
        volume: isMuted ? "Muted" : Math.round(volume * 100) + "%",
        cacheSize: cacheInfo,
        sourceUrl: sourceHost,
        bitrate: bitrate,
      });
    };

    // Update immediately
    updateStats();

    // Update every second while open
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [
    isOpen,
    currentTrack,
    currentTime,
    volume,
    isMuted,
    currentQuality,
    streamUrl,
    getAudioElement,
  ]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentTrack || !stats) return null;

  // Only render portal on client side
  if (typeof window === 'undefined') return null;

  const content = (
    <div
      className="fixed top-6 right-6 z-[9999]"
    >
      <div
        className="bg-foreground/95 text-lime-400 font-mono text-xs p-5 border border-lime-900/50 shadow-2xl w-80 backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-lime-900/50">
          <span className="font-bold text-lime-300">Stats for Nerds</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center hover:bg-lime-900/30 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-lime-400" />
          </button>
        </div>

        {/* Stats Content */}
        <div className="space-y-2">
          <StatItem label="Track ID" value={stats.trackId} />
          <StatItem label="Quality" value={stats.quality} />
          <StatItem label="Codec" value={stats.codec} />
          <StatItem label="Bitrate" value={stats.bitrate} highlight />
          <StatItem label="Current Time" value={stats.currentTime} />
          <StatItem label="Buffer Health" value={stats.bufferHealth} />
          <StatItem label="Volume" value={stats.volume} />
          <StatItem label="Cache Size" value={stats.cacheSize} />
          <StatItem label="Source URL" value={stats.sourceUrl} />
        </div>

        {/* Footer hint */}
        <div className="mt-4 pt-3 border-t border-lime-900/50 text-[10px] text-lime-600 text-center">
          Press ESC or 'i' to close
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

interface StatItemProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatItem({ label, value, highlight }: StatItemProps) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-lime-600 whitespace-nowrap">{label}:</span>
      <span
        className={`text-right break-all ${
          highlight ? "text-walkman-orange font-bold" : "text-lime-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
