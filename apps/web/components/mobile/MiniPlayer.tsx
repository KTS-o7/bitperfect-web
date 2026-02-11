"use client";

import { usePlaybackState, useQueue, useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { getTrackTitle, getTrackArtists } from "@/lib/api/utils";
import { Play, Pause, SkipForward, ChevronUp, Heart } from "lucide-react";
import { motion, PanInfo, useAnimation } from "motion/react";
import Image from "next/image";
import { useCallback } from "react";
import { QualityBadge } from "../player/QualityBadge";
import { usePersistence } from "@/contexts/PersistenceContext";

interface MiniPlayerProps {
  onExpand: () => void;
}

const SWIPE_UP_THRESHOLD = -50; // Negative because up is negative Y

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { isPlaying, setIsStatsOpen, togglePlayPause } = useAudioPlayer();
  const { currentTrack, currentQuality } = useQueue();
  const controls = useAnimation();
  const { toggleLikeTrack, isLiked } = usePersistence();

  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  const getCoverUrl = useCallback(() => {
    const coverId = currentTrack?.album?.cover || currentTrack?.album?.id;
    if (!coverId) return null;
    const formattedId = String(coverId).replace(/-/g, "/");
    return `https://resources.tidal.com/images/${formattedId}/160x160.jpg`;
  }, [currentTrack]);

  const handlePlayPause = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      togglePlayPause();
    },
    [togglePlayPause]
  );

  const handleLike = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (currentTrack) {
        toggleLikeTrack(currentTrack);
      }
    },
    [currentTrack, toggleLikeTrack]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y < SWIPE_UP_THRESHOLD) {
        // Swipe up to expand
        controls.start({ y: -100, opacity: 0 }).then(() => {
          onExpand();
          // Reset position after expansion
          controls.set({ y: 0, opacity: 1 });
        });
      } else {
        // Snap back
        controls.start({ y: 0 });
      }
    },
    [controls, onExpand]
  );

  if (!currentTrack) return null;

  const coverUrl = getCoverUrl();

  return (
    <motion.div
      className="bg-background border-t border-foreground/10 lg:hidden relative h-16"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.5, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
    >
      <div className="flex items-center gap-3 px-4 py-2 h-full">
        {/* Cover art */}
        <div
          onClick={onExpand}
          className="relative w-12 h-12 flex-shrink-0 bg-foreground/5 border border-foreground/10 overflow-hidden rounded-sm shadow-sm cursor-pointer active:scale-95 transition-transform"
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={getTrackTitle(currentTrack)}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-foreground/20">?</span>
            </div>
          )}
        </div>

        {/* Title & Artist & Quality */}
        <div onClick={onExpand} className="flex-1 min-w-0 text-left cursor-pointer">
          <div className="text-[14px] font-medium text-foreground/90 truncate leading-tight mb-0.5">
            {getTrackTitle(currentTrack)}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[12px] text-foreground/40 truncate leading-tight">
              {getTrackArtists(currentTrack)}
            </div>
            {currentQuality && (
              <QualityBadge
                quality={currentQuality}
                minimal
                onClick={(e) => {
                  e?.stopPropagation();
                  setIsStatsOpen(true);
                }}
              />
            )}
          </div>
        </div>

        {/* Like Button */}
        <button
          onClick={handleLike}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center transition-transform active:scale-95 group/heart"
          aria-label={liked ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-all ${liked ? "fill-red-500 text-red-500" : "text-foreground/30 group-hover/heart:text-foreground/50"
              }`}
          />
        </button>

        {/* Play/Pause - Larger touch target */}
        <button
          onClick={handlePlayPause}
          onTouchEnd={(e) => e.stopPropagation()}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-foreground text-background active:scale-90 transition-transform"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

