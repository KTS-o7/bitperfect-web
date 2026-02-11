"use client";

import {
  useAudioPlayer,
  usePlaybackState,
  useQueue,
} from "@/contexts/AudioPlayerContext";
import { formatTime, getTrackTitle, getTrackArtists } from "@/lib/api/utils";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Music2,
  Maximize2,
  Heart,
} from "lucide-react";
import { usePersistence } from "@/contexts/PersistenceContext";
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";

const Queue = dynamic(
  () => import("./Queue").then((mod) => ({ default: mod.Queue })),
  {
    loading: () => null,
    ssr: false,
  },
);

const FullscreenPlayer = dynamic(
  () =>
    import("./FullscreenPlayer").then((mod) => ({
      default: mod.FullscreenPlayer,
    })),
  {
    loading: () => null,
    ssr: false,
  },
);

const FullscreenLyrics = dynamic(
  () =>
    import("./FullscreenLyrics").then((mod) => ({
      default: mod.FullscreenLyrics,
    })),
  {
    loading: () => null,
    ssr: false,
  },
);

const StatsForNerds = dynamic(
  () =>
    import("./StatsForNerds").then((mod) => ({ default: mod.StatsForNerds })),
  {
    loading: () => null,
    ssr: false,
  },
);
import { useLyrics } from "@/hooks/useLyrics";
import Image from "next/image";
import { QualityBadge } from "./QualityBadge";

const SEGMENT_COUNT = 300;

export function AudioPlayer() {
  const { isPlaying, currentTime, duration, volume, isMuted } =
    usePlaybackState();
  const { currentTrack, queue, shuffleActive, repeatMode, currentQuality } =
    useQueue();

  const {
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    isStatsOpen,
    setIsStatsOpen,
  } = useAudioPlayer();

  const { toggleLikeTrack, isLiked } = usePersistence();
  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [hoverSegment, setHoverSegment] = useState<number | null>(null);

  const {
    lyrics,
    currentLineIndex,
    isLoading: lyricsLoading,
    error: lyricsError,
    hasLyrics,
  } = useLyrics(currentTrack, currentTime, isPlaying);

  const currentSegment = useMemo(() => {
    if (duration === 0) return 0;
    return Math.floor((currentTime / duration) * SEGMENT_COUNT);
  }, [currentTime, duration]);

  const formattedCurrentTime = useMemo(
    () => formatTime(currentTime),
    [currentTime],
  );

  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  const getCoverUrl = useCallback(() => {
    const coverId = currentTrack?.album?.cover || currentTrack?.album?.id;
    if (!coverId) return null;
    const formattedId = String(coverId).replace(/-/g, "/");
    return `https://resources.tidal.com/images/${formattedId}/160x160.jpg`;
  }, [currentTrack]);

  const handleSegmentClick = useCallback(
    (segmentIndex: number) => {
      if (duration === 0) return;
      const newTime = (segmentIndex / SEGMENT_COUNT) * duration;
      seek(newTime);
    },
    [duration, seek],
  );

  const handleProgressMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const segmentIndex = Math.floor((x / rect.width) * SEGMENT_COUNT);
      setHoverSegment(segmentIndex);
    },
    [],
  );

  const handleProgressMouseLeave = useCallback(() => {
    setHoverSegment(null);
  }, []);

  const handleSegmentInteraction = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || duration === 0) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const segmentIndex = Math.floor((x / rect.width) * SEGMENT_COUNT);
      handleSegmentClick(segmentIndex);
    },
    [duration, handleSegmentClick],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "i" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        setIsStatsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!currentTrack) return null;

  const coverUrl = getCoverUrl();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-foreground/20 z-50">
      <div
        ref={progressBarRef}
        className="h-5 bg-background cursor-pointer flex items-center gap-[2px] px-4"
        onMouseMove={handleProgressMouseMove}
        onMouseLeave={handleProgressMouseLeave}
        onClick={handleSegmentInteraction}
      >
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
          const isFilled = i < currentSegment;
          const isHovered = hoverSegment !== null && i <= hoverSegment;

          return (
            <div
              key={i}
              className={`flex-1 h-3 transition-colors duration-75 ${isFilled ? "bg-foreground" : isHovered ? "bg-foreground/40" : "bg-foreground/15"
                }`}
              style={{ minWidth: "2px" }}
            />
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {coverUrl && (
              <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden bg-foreground/5">
                <Image
                  src={coverUrl}
                  alt={getTrackTitle(currentTrack)}
                  fill
                  sizes="48px"
                  quality={85}
                  className="object-cover"
                  priority={true}
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className=" text-xs truncate text-foreground tracking-tight">
                  {getTrackTitle(currentTrack)}
                </div>
                {currentQuality && (
                  <QualityBadge
                    quality={currentQuality}
                    minimal
                    onClick={() => setIsStatsOpen(true)}
                  />
                )}
              </div>
              <div className=" text-[10px] text-foreground/40 truncate tracking-tight">
                {getTrackArtists(currentTrack)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleLikeTrack(currentTrack)}
                className="w-7 h-7 flex items-center justify-center transition-transform active:scale-95 group/heart"
                aria-label={liked ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-foreground/40 hover:text-foreground/70"
                    }`}
                />
              </button>

              <button
                onClick={toggleShuffle}
                className={`w-7 h-7 flex items-center justify-center transition-colors ${shuffleActive
                  ? "text-foreground bg-foreground/10"
                  : "text-foreground/40 hover:text-foreground/70"
                  }`}
                aria-label="Shuffle"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={playPrev}
                className="w-7 h-7 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Previous"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={togglePlayPause}
                className="flex-shrink-0 w-9 h-9 bg-foreground hover:bg-foreground/90 transition-colors flex items-center justify-center"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-background fill-background" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 text-background fill-background" />
                )}
              </button>

              <button
                onClick={playNext}
                className="w-7 h-7 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Next"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`w-7 h-7 flex items-center justify-center transition-colors ${repeatMode !== "off"
                  ? "text-foreground bg-foreground/10"
                  : "text-foreground/40 hover:text-foreground/70"
                  }`}
                aria-label="Repeat"
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-3.5 h-3.5" />
                ) : (
                  <Repeat className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs tabular-nums text-foreground/60">
              <span>{formattedCurrentTime}</span>
              <span className="text-foreground/30">·</span>
              <span>{formattedDuration}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 flex-1 justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreenOpen(true)}
                className="w-7 h-7 flex items-center justify-center hover:bg-foreground/10 transition-colors"
                aria-label="Fullscreen Player"
                title="Open Fullscreen Player"
              >
                <Maximize2 className="w-3.5 h-3.5 text-foreground/50 hover:text-foreground transition-colors" />
              </button>

              {hasLyrics && (
                <button
                  onClick={() => setIsLyricsOpen(true)}
                  className="relative w-7 h-7 flex items-center justify-center hover:bg-foreground/10 transition-colors"
                  aria-label="View Lyrics"
                  title="View Lyrics"
                >
                  <Music2 className="w-3.5 h-3.5 text-foreground/50 hover:text-foreground transition-colors" />
                  {lyrics && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-foreground" />
                  )}
                </button>
              )}

              <button
                onClick={() => setIsQueueOpen(true)}
                className="relative w-7 h-7 flex items-center justify-center hover:bg-foreground/10 transition-colors"
                aria-label="View Queue"
                title="View Queue"
              >
                <ListMusic className="w-3.5 h-3.5 text-foreground/50 hover:text-foreground transition-colors" />
                {queue.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1 bg-foreground text-background text-[8px] font-bold flex items-center justify-center min-w-[14px] h-[14px]">
                    {queue.length > 9 ? "9+" : queue.length}
                  </span>
                )}
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="w-7 h-7 flex items-center justify-center hover:bg-foreground/10 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-foreground/50" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-foreground/50" />
                )}
              </button>

              <div className="w-20 flex items-center gap-[2px]">
                {Array.from({ length: 10 }).map((_, i) => {
                  const volumeLevel = Math.floor((isMuted ? 0 : volume) * 10);
                  return (
                    <button
                      key={i}
                      onClick={() => setVolume((i + 1) / 10)}
                      className={`flex-1 h-2 transition-colors ${i < volumeLevel ? "bg-foreground" : "bg-foreground/20 hover:bg-foreground/40"
                        }`}
                      style={{ minWidth: "2px" }}
                      aria-label={`Set volume to ${(i + 1) * 10}%`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Panel */}
      <Queue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Stats for Nerds */}
      <StatsForNerds isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      {/* Fullscreen Lyrics */}
      {currentTrack && (
        <FullscreenLyrics
          isOpen={isLyricsOpen}
          onClose={() => setIsLyricsOpen(false)}
          track={currentTrack}
          lyrics={lyrics}
          currentLineIndex={currentLineIndex}
          isLoading={lyricsLoading}
          error={lyricsError}
          onSeek={seek}
        />
      )}

      {/* Fullscreen Player */}
      <FullscreenPlayer
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </div>
  );
}
