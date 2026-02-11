"use client";

import React, { memo, useMemo, useState, useRef, useCallback } from "react";
import { Track } from "@/lib/api/types";
import { getTrackTitle, formatTime } from "@/lib/api/utils";
import { api } from "@/lib/api";
import Image from "next/image";
import { Disc, MoreVertical, Play, ListPlus, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileTrackRowProps {
 track: Track;
 index: number;
 isCurrentTrack: boolean;
 isPlaying: boolean;
 isLoading: boolean;
 onClick: () => void;
 onAddToQueue?: () => void;
 onShare?: () => void;
}

const LONG_PRESS_DURATION = 500; // ms

function MobileTrackRow({
 track,
 index,
 isCurrentTrack,
 isPlaying,
 isLoading,
 onClick,
 onAddToQueue,
 onShare,
}: MobileTrackRowProps) {
 const [showContextMenu, setShowContextMenu] = useState(false);
 const longPressTimer = useRef<NodeJS.Timeout | null>(null);
 const touchStartPos = useRef<{ x: number; y: number } | null>(null);

 // Memoize cover URL computation
 const coverUrl = useMemo(() => {
  const coverId = track.album?.cover || track.album?.id;
  return coverId ? api.getCoverUrl(coverId, "160") : undefined;
 }, [track.album?.cover, track.album?.id]);

 // Memoize artist display computation
 const displayArtist = useMemo(() => {
  const allArtists = track.artists || (track.artist ? [track.artist] : []);
  const mainArtists = allArtists.filter((a) => a.type === "MAIN");
  return mainArtists.length > 0
   ? mainArtists.map((a) => a.name).join(", ")
   : track.artist?.name || "Unknown Artist";
 }, [track.artists, track.artist]);

 // Memoize quality tags computation
 const qualityInfo = useMemo(() => {
  const qualityTags = track.mediaMetadata?.tags || [];
  return {
   hasHiRes: qualityTags.includes("HIRES_LOSSLESS"),
   hasLossless: qualityTags.includes("LOSSLESS"),
   hasDolbyAtmos: qualityTags.includes("DOLBY_ATMOS"),
  };
 }, [track.mediaMetadata?.tags]);

 const { hasHiRes, hasDolbyAtmos } = qualityInfo;

 // Long press handlers
 const handleTouchStart = useCallback((e: React.TouchEvent) => {
  touchStartPos.current = {
   x: e.touches[0].clientX,
   y: e.touches[0].clientY,
  };
  longPressTimer.current = setTimeout(() => {
   setShowContextMenu(true);
   // Haptic feedback if available
   if (navigator.vibrate) {
    navigator.vibrate(50);
   }
  }, LONG_PRESS_DURATION);
 }, []);

 const handleTouchMove = useCallback((e: React.TouchEvent) => {
  if (!touchStartPos.current) return;

  const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
  const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

  // Cancel long press if user moves finger too much
  if (deltaX > 10 || deltaY > 10) {
   if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
   }
  }
 }, []);

 const handleTouchEnd = useCallback(() => {
  if (longPressTimer.current) {
   clearTimeout(longPressTimer.current);
   longPressTimer.current = null;
  }
  touchStartPos.current = null;
 }, []);

 const handleClick = useCallback(() => {
  if (!showContextMenu) {
   onClick();
  }
 }, [showContextMenu, onClick]);

 const handleContextMenuAction = useCallback(
  (action: "play" | "queue" | "share") => {
   setShowContextMenu(false);
   switch (action) {
    case "play":
     onClick();
     break;
    case "queue":
     onAddToQueue?.();
     break;
    case "share":
     onShare?.();
     break;
   }
  },
  [onClick, onAddToQueue, onShare],
 );

 return (
  <>
   <div
    onClick={handleClick}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    onTouchCancel={handleTouchEnd}
    className={`
          relative flex items-center gap-3
          px-0 py-3
          border-b border-foreground/10
          cursor-pointer
          transition-colors duration-150
          active:bg-foreground/5
          ${isCurrentTrack ? "border-l-[3px] border-l-foreground pl-[13px] bg-foreground/[0.02]" : ""}
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
   >
    {/* Cover Art - 48px for better touch */}
    <div className="relative w-12 h-12 flex-shrink-0 bg-foreground/5 border border-foreground/10 overflow-hidden">
     {coverUrl ? (
      <Image
       src={coverUrl}
       alt={track.album?.title || "Album cover"}
       width={48}
       height={48}
       className="w-full h-full object-cover"
      />
     ) : (
      <div className="w-full h-full flex items-center justify-center">
       <Disc className="w-5 h-5 text-foreground/20" />
      </div>
     )}

     {/* Playing indicator overlay */}
     {isCurrentTrack && isPlaying && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
       <div className="flex items-end gap-[2px] h-4">
        <div
         className="w-[3px] bg-white rounded-full animate-[wave1_0.6s_ease-in-out_infinite]"
         style={{ height: "40%" }}
        />
        <div
         className="w-[3px] bg-white rounded-full animate-[wave2_0.6s_ease-in-out_infinite]"
         style={{ height: "100%", animationDelay: "0.1s" }}
        />
        <div
         className="w-[3px] bg-white rounded-full animate-[wave3_0.6s_ease-in-out_infinite]"
         style={{ height: "60%", animationDelay: "0.2s" }}
        />
       </div>
      </div>
     )}
    </div>

    {/* Track Info */}
    <div className="flex-1 min-w-0">
     <div className="flex items-center gap-2 mb-0.5">
      <h3
       className={`font-medium text-[15px] truncate ${
        isCurrentTrack ? "text-foreground" : "text-foreground/90"
       }`}
      >
       {getTrackTitle(track)}
      </h3>
      {track.explicit && (
       <span className="flex-shrink-0 text-[8px] font-bold px-1 py-0.5 border border-foreground/20 text-foreground/50 font-mono">
        E
       </span>
      )}
     </div>

     <div className="flex items-center gap-2">
      <span className="text-[13px] text-foreground/50 truncate">
       {displayArtist}
      </span>
     </div>

     {/* Quality badges + Duration row */}
     <div className="flex items-center gap-2 mt-1">
      {hasDolbyAtmos && (
       <span className="text-[8px] font-bold font-mono px-1 py-0.5 border border-foreground/20 text-foreground/50 uppercase">
        ATMOS
       </span>
      )}
      {hasHiRes && (
       <span className="text-[8px] font-bold font-mono px-1 py-0.5 border border-foreground/20 text-foreground/50 uppercase">
        HI-RES
       </span>
      )}
      {track.audioQuality && !hasHiRes && (
       <span className="text-[8px] font-bold font-mono px-1 py-0.5 border border-foreground/20 text-foreground/50 uppercase">
        {track.audioQuality}
       </span>
      )}
      <span className="text-[11px] font-mono text-foreground/40 tabular-nums ml-auto">
       {formatTime(track.duration)}
      </span>
     </div>
    </div>

    {/* More button */}
    <button
     onClick={(e) => {
      e.stopPropagation();
      setShowContextMenu(true);
     }}
     className="w-10 h-10 flex items-center justify-center text-foreground/40 active:bg-foreground/10 -mr-2"
     aria-label="More options"
    >
     <MoreVertical className="w-5 h-5" />
    </button>
   </div>

   {/* Context Menu */}
   <AnimatePresence>
    {showContextMenu && (
     <>
      {/* Backdrop */}
      <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="fixed inset-0 bg-black/60 z-50"
       onClick={() => setShowContextMenu(false)}
      />

      {/* Menu */}
      <motion.div
       initial={{ opacity: 0, y: 100 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: 100 }}
       transition={{ type: "spring", damping: 25, stiffness: 300 }}
       className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10"
       style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
       {/* Track preview */}
       <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        {coverUrl && (
         <div className="w-12 h-12 flex-shrink-0 overflow-hidden">
          <Image
           src={coverUrl}
           alt=""
           width={48}
           height={48}
           className="w-full h-full object-cover"
          />
         </div>
        )}
        <div className="min-w-0 flex-1">
         <div className="font-medium text-sm text-white truncate">
          {getTrackTitle(track)}
         </div>
         <div className="text-xs text-white/50 truncate">{displayArtist}</div>
        </div>
       </div>

       {/* Actions */}
       <div className="py-2">
        <button
         onClick={() => handleContextMenuAction("play")}
         className="w-full flex items-center gap-4 px-4 py-4 active:bg-white/5"
        >
         <Play className="w-5 h-5 text-white/60" />
         <span className="text-sm text-white">Play Now</span>
        </button>

        <button
         onClick={() => handleContextMenuAction("queue")}
         className="w-full flex items-center gap-4 px-4 py-4 active:bg-white/5"
        >
         <ListPlus className="w-5 h-5 text-white/60" />
         <span className="text-sm text-white">Add to Queue</span>
        </button>

        <button
         onClick={() => handleContextMenuAction("share")}
         className="w-full flex items-center gap-4 px-4 py-4 active:bg-white/5"
        >
         <Share2 className="w-5 h-5 text-white/60" />
         <span className="text-sm text-white">Share</span>
        </button>
       </div>

       {/* Cancel */}
       <div className="border-t border-white/10">
        <button
         onClick={() => setShowContextMenu(false)}
         className="w-full py-4 text-sm font-medium text-white/60 active:bg-white/5"
        >
         Cancel
        </button>
       </div>
      </motion.div>
     </>
    )}
   </AnimatePresence>
  </>
 );
}

MobileTrackRow.displayName = "MobileTrackRow";

export default memo(MobileTrackRow);
