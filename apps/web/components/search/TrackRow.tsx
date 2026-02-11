"use client";

import React, { memo, useMemo } from "react";
import { Track } from "@/lib/api/types";
import { getTrackTitle, formatTime } from "@/lib/api/utils";
import { api } from "@/lib/api";
import Image from "next/image";
import { Disc, Heart, Download, Loader2 } from "lucide-react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { useDownload } from "@/hooks/useDownload";

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onClick: () => void;
}

function TrackRow({
  track,
  index,
  isCurrentTrack,
  isPlaying,
  isLoading,
  onClick,
}: TrackRowProps) {
  // Memoize cover URL computation
  const coverUrl = useMemo(() => {
    const coverId = track.album?.cover || track.album?.id;
    return coverId ? api.getCoverUrl(coverId, "80") : undefined;
  }, [track.album?.cover, track.album?.id]);

  // Memoize artist display computation
  const displayArtist = useMemo(() => {
    const allArtists = track.artists || (track.artist ? [track.artist] : []);
    const mainArtists = allArtists.filter((a) => a.type === "MAIN");
    return mainArtists.length > 0
      ? mainArtists.map((a) => a.name).join(", ")
      : track.artist?.name || "Unknown Artist";
  }, [track.artists, track.artist]);

  const isExplicit = track.explicit;

  // Memoize quality tags computation
  const qualityInfo = useMemo(() => {
    const qualityTags = track.mediaMetadata?.tags || [];
    return {
      hasHiRes: qualityTags.includes("HIRES_LOSSLESS"),
      hasLossless: qualityTags.includes("LOSSLESS"),
      hasDolbyAtmos: qualityTags.includes("DOLBY_ATMOS"),
    };
  }, [track.mediaMetadata?.tags]);

  const { hasHiRes, hasLossless, hasDolbyAtmos } = qualityInfo;

  const { toggleLikeTrack, isLiked } = usePersistence();
  const liked = isLiked(track.id);
  const { downloadTrack, isDownloading, downloadingTrackId } = useDownload();
  const isThisDownloading = isDownloading && downloadingTrackId === track.id;

  return (
    <div
      onClick={onClick}
      className={`
        group relative grid grid-cols-[40px_40px_1fr_40px] lg:grid-cols-[50px_40px_1fr_180px_120px_80px_80px]
        gap-3 md:gap-4 items-center
        px-4 md:px-6 py-3 border-b border-foreground/10 cursor-pointer
        transition-all duration-200
        ${isCurrentTrack ? "border-l-[3px] border-l-white pl-[13px] md:pl-[21px]" : "border-l-[3px] border-l-transparent"}
        ${isLoading ? "opacity-50 pointer-events-none" : ""}
        hover:bg-foreground/[0.02]
      `}
    >
      {/* Track Number / Playing Indicator */}
      <div className="text-center">
        {isCurrentTrack && isPlaying ? (
          <div className="flex items-end justify-center gap-[3px] h-5">
            <div
              className="w-1 bg-foreground rounded-full animate-[wave1_0.6s_ease-in-out_infinite]"
              style={{ height: "40%" }}
            />
            <div
              className="w-1 bg-foreground rounded-full animate-[wave2_0.6s_ease-in-out_infinite]"
              style={{ height: "100%", animationDelay: "0.1s" }}
            />
            <div
              className="w-1 bg-foreground rounded-full animate-[wave3_0.6s_ease-in-out_infinite]"
              style={{ height: "60%", animationDelay: "0.2s" }}
            />
          </div>
        ) : (
          <span
            className={`text-sm font-mono transition-colors ${isCurrentTrack ? "text-foreground" : "text-foreground/40 group-hover:text-foreground/70"
              }`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Cover Art - Square */}
      <div className="w-10 h-10 shrink-0 bg-foreground/5 border border-foreground/10 overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={track.album?.title || "Album cover"}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc className="w-4 h-4 text-foreground/20" />
          </div>
        )}
      </div>

      {/* Title + Artist */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={`font-medium text-[15px] md:text-[14px] truncate transition-colors tracking-[-0.01em] ${isCurrentTrack ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
              }`}
          >
            {getTrackTitle(track)}
          </h3>
          {isExplicit && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 border border-foreground/20 text-foreground/60 font-mono uppercase tracking-wider">
              E
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] md:text-[12px] text-foreground/50 group-hover:text-foreground/70 transition-colors truncate">
            {displayArtist}
          </span>
          {/* Quality Badges on Mobile */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {hasDolbyAtmos && (
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 border border-foreground/20 text-foreground/60 uppercase tracking-wider">
                ATMOS
              </span>
            )}
            {hasHiRes && (
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 border border-foreground/20 text-foreground/60 uppercase tracking-wider">
                HI-RES
              </span>
            )}
          </div>
        </div>
        {/* Album name on mobile - shown under artist */}
        <div className="lg:hidden mt-0.5">
          <span className="text-[12px] text-foreground/30 italic truncate block">
            {track.album?.title}
          </span>
        </div>
      </div>

      {/* Album (Hidden on mobile, shown on desktop) */}
      <div className="hidden lg:block min-w-0">
        <span className="text-[13px] text-foreground/30 group-hover:text-foreground/50 transition-colors italic truncate block">
          {track.album?.title}
        </span>
      </div>

      {/* Quality Badges (Desktop only) */}
      <div className="hidden lg:flex items-center gap-1.5">
        {hasDolbyAtmos && (
          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 border border-foreground/20 text-foreground/60 uppercase tracking-wider">
            ATMOS
          </span>
        )}

        {track.audioQuality && (
          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 border border-foreground/20 text-foreground/60 uppercase tracking-wider">
            {track.audioQuality}
          </span>
        )}
      </div>

      {/* Duration (Hidden on mobile) */}
      <div className="hidden lg:block text-right">
        <span className="text-[12px] font-mono text-foreground/40 group-hover:text-foreground/60 transition-colors tabular-nums">
          {formatTime(track.duration)}
        </span>
      </div>

      {/* Like & Download Buttons */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLikeTrack(track);
          }}
          className="p-2 transition-transform active:scale-95 group/heart"
          aria-label={liked ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-all ${liked
              ? "fill-red-500 text-red-500 scale-110"
              : "text-foreground/20 group-hover/heart:text-foreground/40 group-hover/heart:scale-110"
              }`}
          />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadTrack(track);
          }}
          disabled={isThisDownloading}
          className="p-2 transition-transform active:scale-95 group/dl"
          aria-label="Download track"
        >
          {isThisDownloading ? (
            <Loader2 className="w-4 h-4 text-foreground/40 animate-spin" />
          ) : (
            <Download
              className="w-4 h-4 text-foreground/20 group-hover/dl:text-foreground/40 group-hover/dl:scale-110 transition-all"
            />
          )}
        </button>
      </div>
    </div>
  );
}

TrackRow.displayName = "TrackRow";

export default memo(TrackRow);
