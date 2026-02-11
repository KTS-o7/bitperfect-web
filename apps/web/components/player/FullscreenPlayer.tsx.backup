"use client";

import { useAudioPlayer, usePlaybackState, useQueue } from "@/contexts/AudioPlayerContext";
import { getTrackTitle, getTrackArtists, formatTime } from "@/lib/api/utils";
import {
  ChevronDown,
  MoreVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Music2,
  GripVertical,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLyrics } from "@/hooks/useLyrics";
import type { Track } from "@/lib/api/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "queue" | "lyrics" | null;

// Sortable queue item for mobile
function SortableQueueItem({
  id,
  track,
  index,
  isCurrent,
  onPlay,
}: {
  id: string;
  track: Track;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-3 px-4 ${
        isCurrent ? "bg-foreground/5" : ""
      } ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-2 text-foreground/40 active:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Thumbnail */}
      <div
        className="relative w-12 h-12 bg-foreground/5 flex-shrink-0 rounded overflow-hidden cursor-pointer"
        onClick={onPlay}
      >
        {track.album?.cover ? (
          <Image
            src={`https://resources.tidal.com/images/${String(track.album.cover).replace(/-/g, "/")}/160x160.jpg`}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <Music2 className="w-6 h-6 text-foreground/20 m-auto" />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0" onClick={onPlay}>
        <div className="text-sm text-foreground truncate">
          {getTrackTitle(track)}
        </div>
        <div className="text-xs text-foreground/50 truncate">
          {getTrackArtists(track)}
        </div>
      </div>

      {/* Duration */}
      <div className="text-xs text-foreground/50 mr-2">
        {formatTime(track.duration || 0)}
      </div>

      {/* More menu */}
      <button className="w-8 h-8 flex items-center justify-center text-foreground/50">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
}

export function FullscreenPlayer({ isOpen, onClose }: FullscreenPlayerProps) {
  const { isPlaying, currentTime, duration } = usePlaybackState();
  const { currentTrack, queue, currentQueueIndex, shuffleActive, repeatMode } = useQueue();
  const {
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setQueue,
    reorderQueue,
    toggleShuffle,
    toggleRepeat,
  } = useAudioPlayer();

  const [expandedTab, setExpandedTab] = useState<Tab>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const {
    lyrics,
    currentLineIndex,
    isLoading: lyricsLoading,
    hasLyrics,
  } = useLyrics(currentTrack, currentTime, isPlaying);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Create sortable IDs
  const sortableIds = queue.map((track, index) => `${track.id}-${index}`);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sortableIds.indexOf(active.id as string);
        const newIndex = sortableIds.indexOf(over.id as string);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newQueue = arrayMove([...queue], oldIndex, newIndex);

          // Calculate new current index
          let newCurrentIndex = currentQueueIndex;
          if (oldIndex === currentQueueIndex) {
            newCurrentIndex = newIndex;
          } else if (oldIndex < currentQueueIndex && newIndex >= currentQueueIndex) {
            newCurrentIndex = currentQueueIndex - 1;
          } else if (oldIndex > currentQueueIndex && newIndex <= currentQueueIndex) {
            newCurrentIndex = currentQueueIndex + 1;
          }

          reorderQueue(newQueue, newCurrentIndex);
        }
      }
    },
    [queue, sortableIds, currentQueueIndex, reorderQueue]
  );

  const getCoverUrl = () => {
    const coverId = currentTrack?.album?.cover || currentTrack?.album?.id;
    if (!coverId) return null;
    const formattedId = String(coverId).replace(/-/g, "/");
    return `https://resources.tidal.com/images/${formattedId}/640x640.jpg`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekTouch = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!seekBarRef.current || duration === 0) return;
      const touch = e.touches[0];
      const rect = seekBarRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      seek(percentage * duration);
    },
    [duration, seek]
  );

  const handleTrackPlay = (track: Track, index: number) => {
    if (index !== currentQueueIndex) {
      setQueue(queue, index);
    }
  };

  const handleTabClick = (tab: Tab) => {
    setExpandedTab(expandedTab === tab ? null : tab);
  };

  if (!currentTrack) return null;

  const coverUrl = getCoverUrl();
  const upNextTracks = queue.slice(currentQueueIndex + 1);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[100] bg-background text-foreground overflow-hidden flex flex-col"
          style={{ height: "100vh", height: "100dvh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
            <button
              onClick={() => {
                if (expandedTab) {
                  setExpandedTab(null);
                } else {
                  onClose();
                }
              }}
              className="w-10 h-10 flex items-center justify-center text-foreground"
              aria-label={expandedTab ? "Back" : "Close"}
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center text-foreground"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {!expandedTab ? (
                /* Main Player View */
                <motion.div
                  key="player"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-hidden flex flex-col"
                >
                  {/* Album Art */}
                  <div className="flex-1 flex items-center justify-center px-6 pt-4 pb-2 min-h-0">
                    <div className="relative aspect-square w-full max-w-[85vw] max-h-full bg-foreground/5 overflow-hidden rounded-lg">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={getTrackTitle(currentTrack)}
                          fill
                          sizes="(max-width: 768px) 90vw, 500px"
                          className="object-cover"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-24 h-24 text-foreground/20" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="px-6 py-3 flex-shrink-0">
                    <h1 className="text-lg font-medium text-foreground truncate">
                      {getTrackTitle(currentTrack)}
                    </h1>
                    <p className="text-sm text-foreground/60 truncate mt-0.5">
                      {getTrackArtists(currentTrack)}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 pb-2 flex-shrink-0">
                    <div
                      ref={seekBarRef}
                      className="relative h-1 bg-foreground/20 rounded-full cursor-pointer"
                      onTouchStart={handleSeekTouch}
                      onTouchMove={handleSeekTouch}
                    >
                      <div
                        className="absolute h-full bg-foreground rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-foreground/50 mt-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4 px-6 py-4 flex-shrink-0">
                    <button
                      onClick={toggleShuffle}
                      className={`w-10 h-10 flex items-center justify-center ${
                        shuffleActive ? "text-foreground" : "text-foreground/40"
                      }`}
                      aria-label="Shuffle"
                    >
                      <Shuffle className="w-5 h-5" />
                    </button>

                    <button
                      onClick={playPrev}
                      className="w-12 h-12 flex items-center justify-center text-foreground"
                      aria-label="Previous"
                    >
                      <SkipBack className="w-7 h-7 fill-current" />
                    </button>

                    <button
                      onClick={togglePlayPause}
                      className="w-20 h-20 rounded-full bg-foreground text-background flex items-center justify-center"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8 fill-current" />
                      ) : (
                        <Play className="w-8 h-8 ml-1 fill-current" />
                      )}
                    </button>

                    <button
                      onClick={playNext}
                      className="w-12 h-12 flex items-center justify-center text-foreground"
                      aria-label="Next"
                    >
                      <SkipForward className="w-7 h-7 fill-current" />
                    </button>

                    <button
                      onClick={toggleRepeat}
                      className={`w-10 h-10 flex items-center justify-center ${
                        repeatMode !== "off" ? "text-foreground" : "text-foreground/40"
                      }`}
                      aria-label="Repeat"
                    >
                      {repeatMode === "one" ? (
                        <Repeat1 className="w-5 h-5" />
                      ) : (
                        <Repeat className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="border-t border-foreground/10 flex-shrink-0">
                    <div className="flex">
                      <button
                        onClick={() => handleTabClick("queue")}
                        className="flex-1 px-4 py-3 text-sm font-medium text-foreground/80 active:bg-foreground/5"
                      >
                        Up next
                      </button>
                      <button
                        onClick={() => handleTabClick("lyrics")}
                        className="flex-1 px-4 py-3 text-sm font-medium text-foreground/80 active:bg-foreground/5"
                      >
                        Lyrics
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : expandedTab === "queue" ? (
                /* Fullscreen Queue */
                <motion.div
                  key="queue"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col bg-background"
                >
                  {/* Queue Header */}
                  <div className="px-4 py-4 border-b border-foreground/10 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium text-foreground">Up next</h2>
                      <button
                        onClick={playNext}
                        className="w-10 h-10 flex items-center justify-center text-foreground"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-xs text-foreground/50 mb-2">Playing from</div>
                    <div className="text-sm font-medium text-foreground">
                      {currentTrack.album?.title || "Unknown Album"}
                    </div>
                  </div>

                  {/* Auto-play Toggle */}
                  <div className="px-4 py-3 border-b border-foreground/10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">Auto-play</div>
                        <div className="text-xs text-foreground/50">
                          Add similar content to queue
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          autoPlay ? "bg-blue-500" : "bg-foreground/30"
                        }`}
                      >
                        <motion.div
                          animate={{ x: autoPlay ? 24 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Queue List - Draggable */}
                  <div className="flex-1 overflow-y-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        {queue.map((track, index) => (
                          <SortableQueueItem
                            key={sortableIds[index]}
                            id={sortableIds[index]}
                            track={track}
                            index={index}
                            isCurrent={index === currentQueueIndex}
                            onPlay={() => handleTrackPlay(track, index)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </motion.div>
              ) : (
                /* Fullscreen Lyrics */
                <motion.div
                  key="lyrics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col bg-background"
                >
                  {/* Lyrics Header */}
                  <div className="px-6 py-4 border-b border-foreground/10 flex-shrink-0">
                    <h2 className="text-lg font-medium text-foreground">Lyrics</h2>
                    <p className="text-sm text-foreground/50 mt-1">
                      {getTrackTitle(currentTrack)}
                    </p>
                  </div>

                  {/* Lyrics Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-8">
                    {hasLyrics && lyrics?.parsed ? (
                      <div className="space-y-6 max-w-2xl mx-auto">
                        {lyrics.parsed.map((line, idx) => (
                          <motion.p
                            key={idx}
                            animate={{
                              opacity: idx === currentLineIndex ? 1 : 0.4,
                              scale: idx === currentLineIndex ? 1.05 : 1,
                            }}
                            transition={{ duration: 0.3 }}
                            className={`text-base leading-relaxed ${
                              idx === currentLineIndex
                                ? "text-foreground font-medium"
                                : "text-foreground/60"
                            }`}
                          >
                            {line.text}
                          </motion.p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Music2 className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                          <div className="text-foreground/40">No lyrics available</div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}
