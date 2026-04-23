"use client";

import { useAudioPlayerActions, useQueue } from "@/contexts/AudioPlayerContext";
import { getTrackTitle, getTrackArtists, formatTime, getCoverUrl } from "@/lib/api/utils";
import { X, Music2, GripVertical } from "lucide-react";
import { useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Track } from "@/lib/api/types";
import { lockScroll, unlockScroll } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QueueProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SortableQueueItemProps {
  id: string;
  track: Track;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
}

function SortableQueueItem({
  id,
  track,
  index,
  isCurrent,
  onPlay,
  onRemove,
}: SortableQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const coverUrl = useMemo(() => {
    const coverId = track?.album?.cover;
    if (!coverId) return null;
    return getCoverUrl(coverId, "160");
  }, [track?.album?.cover]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 border-b border-foreground/10 bg-background ${
        isCurrent
          ? "border-l-[3px] border-l-foreground pl-[9px] bg-foreground/[0.03]"
          : "hover:bg-foreground/[0.02] border-l-[3px] border-l-transparent"
      } ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 text-foreground/30 hover:text-foreground/60 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div
        onClick={onPlay}
        className="relative w-10 h-10 shrink-0 bg-foreground/5 border border-foreground/10 overflow-hidden cursor-pointer"
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="40px"
            quality={75}
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <Music2 className="w-4 h-4 text-foreground/20 m-auto" />
        )}
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <div
          className={`text-sm font-medium truncate ${
            isCurrent ? "text-foreground" : "text-foreground/90"
          }`}
        >
          {getTrackTitle(track)}
        </div>
        <div className="text-xs text-foreground/50 truncate">
          {getTrackArtists(track)}
        </div>
      </div>

      <div className="text-[11px] font-mono text-foreground/40 tabular-nums">
        {formatTime(track.duration || 0)}
      </div>

      {!isCurrent && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Remove from queue"
        >
          <X className="w-3.5 h-3.5 text-foreground/40 hover:text-foreground" />
        </button>
      )}
    </div>
  );
}

export function Queue({ isOpen, onClose }: QueueProps) {
  const { queue, displayQueue, currentQueueIndex } = useQueue();
  const { removeFromQueue, clearQueue, reorderQueue, setQueue } =
    useAudioPlayerActions();

  const sortableIds = useMemo(
    () => displayQueue.map(t => t.id.toString()),
    [displayQueue],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = displayQueue.findIndex(t => t.id.toString() === active.id);
        const newIndex = displayQueue.findIndex(t => t.id.toString() === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newQueue = arrayMove([...displayQueue], oldIndex, newIndex);

          let newCurrentIndex = currentQueueIndex;
          if (oldIndex === currentQueueIndex) {
            newCurrentIndex = newIndex;
          } else if (
            oldIndex < currentQueueIndex &&
            newIndex >= currentQueueIndex
          ) {
            newCurrentIndex = currentQueueIndex - 1;
          } else if (
            oldIndex > currentQueueIndex &&
            newIndex <= currentQueueIndex
          ) {
            newCurrentIndex = currentQueueIndex + 1;
          }

          reorderQueue(newQueue, newCurrentIndex);
        }
      }
    },
    [displayQueue, currentQueueIndex, reorderQueue],
  );

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  const upNextCount = displayQueue.length - currentQueueIndex - 1;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[91] w-full max-w-md bg-background border-l border-foreground/10 flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-foreground/10 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                    Queue
                  </div>
                  <div className="text-xs font-mono text-foreground/50 mt-1">
                    {displayQueue.length}{" "}
                    {displayQueue.length === 1 ? "track" : "tracks"}
                    {upNextCount > 0 && (
                      <span className="text-foreground/30">
                        {" "}
                        · {upNextCount} up next
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {displayQueue.length > 0 && (
                    <button
                      onClick={clearQueue}
                      className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-foreground/20 text-foreground/60 hover:text-foreground hover:border-foreground transition-colors duration-200"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors duration-200"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Reorder hint */}
            {displayQueue.length > 1 && (
              <div className="px-6 py-2 border-b border-foreground/10 flex-shrink-0">
                <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/30">
                  Drag to reorder
                </span>
              </div>
            )}

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto">
              {queue.length === 0 ? (                <div className="flex items-center justify-center h-full">
                  <div className="text-center border border-foreground/10 px-12 py-16">
                    <Music2 className="w-10 h-10 text-foreground/20 mx-auto mb-6" />
                    <h3 className="text-sm font-mono uppercase tracking-widest text-foreground/90 mb-2">
                      No Tracks
                    </h3>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-foreground/40">
                      Add tracks to start playing
                    </p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayQueue.map((track, index) => (
                      <SortableQueueItem
                        key={track.id.toString()}
                        id={track.id.toString()}
                        track={track}
                        index={index}
                        isCurrent={index === currentQueueIndex}
                        onPlay={() =>
                          index !== currentQueueIndex &&
                          setQueue(displayQueue, index)
                        }
                        onRemove={() => removeFromQueue(index)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof window !== "undefined"
    ? createPortal(content, document.body)
    : null;
}
