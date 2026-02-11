"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useLyrics } from "@/hooks/useLyrics";
import { Track, LyricsData } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import "@/styles/lyrics.css";

interface KaraokeViewProps {
 isOpen: boolean;
 onClose: () => void;
 track: Track;
 lyrics: LyricsData | null;
 currentLineIndex: number;
 isLoading?: boolean;
 error?: string | null;
 onSeek?: (time: number) => void;
}

export function FullscreenLyrics({
 isOpen,
 onClose,
 track,
 lyrics,
 currentLineIndex,
 isLoading,
 error,
 onSeek,
}: KaraokeViewProps) {
 const activeLineRef = useRef<HTMLDivElement>(null);
 const containerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (activeLineRef.current) {
   activeLineRef.current.scrollIntoView({
    behavior: "smooth",
    block: "center",
   });
  }
 }, [currentLineIndex]);

 // Keyboard escape to close
 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
   if (e.key === "Escape") onClose();
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
 }, [onClose]);

 const getCoverUrl = (size: "large" | "thumb" = "large") => {
  const coverId = track?.album?.cover || track?.album?.id;
  if (!coverId) return null;
  const formattedId = String(coverId).replace(/-/g, "/");
  return `https://resources.tidal.com/images/${formattedId}/${size === "large" ? "1280x1280" : "640x640"}.jpg`;
 };

 if (!isOpen) return null;

 const coverUrl = getCoverUrl("large");

 const content = (
  <div
   id="karaoke-view"
   className="fixed inset-0 z-[100] overflow-hidden bg-background flex flex-col"
  >
   {/* Background Layer - Gradient from Background to Blurry Album Art */}
   <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    {coverUrl && (
     <div className="absolute inset-0">
      <Image
       src={coverUrl}
       alt=""
       fill
       className="object-cover opacity-40 dark:opacity-40 blur-[100px] scale-125"
       unoptimized
       priority
      />
      {/* Gradient overlay: adapts to light/dark mode */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background to-transparent" />
     </div>
    )}
   </div>

   {/* Close Button - Minimal */}
   <button
    onClick={onClose}
    className="absolute top-8 right-8 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-background/20 text-foreground/60 hover:text-foreground hover:bg-background/40 backdrop-blur-md transition-all"
    title="Close Lyrics"
   >
    <svg
     xmlns="http://www.w3.org/2000/svg"
     width="24"
     height="24"
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     strokeWidth="2"
     strokeLinecap="round"
     strokeLinejoin="round"
     className="w-5 h-5"
    >
     <path d="M18 6 6 18" />
     <path d="m6 6 12 12" />
    </svg>
   </button>

   {/* Lyrics Container */}
   <div
    id="karaoke-lyrics"
    className="relative z-10 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    ref={containerRef}
    onClick={(e) => {
     if (e.target === e.currentTarget) onClose();
    }}
   >
    <div className="min-h-full flex items-center justify-center py-[50vh]">
     {lyrics?.parsed ? (
      <div className="flex flex-col items-start w-full max-w-4xl px-8 md:px-12 space-y-10">
       {/* Minimal Cover Art & Metadata */}
       <div className="flex items-center gap-4 mb-4 opacity-80">
        {coverUrl && (
         <div className="relative w-20 h-20 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
          <Image
           src={coverUrl}
           alt={track.title}
           fill
           sizes="80px"
           quality={85}
           className="object-cover"
           loading="eager"
          />
         </div>
        )}
        <div className="flex flex-col gap-1">
         <h2 className="text-lg font-semibold text-foreground/90 line-clamp-1">
          {track.title}
         </h2>
         <p className="text-sm text-foreground/60 line-clamp-1">
          {track.artists?.map((a) => a.name).join(", ") ||
           track.artist?.name ||
           "Unknown Artist"}
         </p>
        </div>
       </div>
       {lyrics.parsed.map((line, index) => {
        const isActive = index === currentLineIndex;
        const isPast = index < currentLineIndex;

        return (
         <div
          key={index}
          ref={isActive ? activeLineRef : null}
          className={cn(
           "text-left transition-all duration-500 ease-[cubic-bezier(0.25,0.4,0.25,1)] cursor-pointer select-none origin-left w-full",
           isActive
            ? "text-3xl md:text-4xl font-bold text-foreground scale-100 opacity-100 translate-x-0"
            : "text-xl md:text-3xl font-semibold text-foreground/40 blur-[1px] scale-95 opacity-60 hover:text-foreground/70 hover:opacity-100 hover:blur-0",
          )}
          onClick={() => onSeek?.(line.time)}
         >
          {line.text || "♪"}
         </div>
        );
       })}
      </div>
     ) : (
      <div className="flex flex-col items-center justify-center text-foreground/50 space-y-4">
       <p className="text-xl font-medium">
        {lyrics?.lyrics
         ? "Plain lyrics available (see details)"
         : "No synced lyrics available"}
       </p>
       <button
        onClick={onClose}
        className="px-6 py-2 rounded-full border border-foreground/20 hover:bg-foreground/10 transition-colors text-sm"
       >
        Go Back
       </button>
      </div>
     )}
    </div>
   </div>
  </div>
 );

 // Use portal to render at document root level
 return typeof window !== "undefined"
  ? createPortal(content, document.body)
  : null;
}
