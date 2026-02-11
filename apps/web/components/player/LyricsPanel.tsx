"use client";

import { useEffect, useRef } from "react";
import { Download, X, Music } from "lucide-react";
import { useLyrics } from "@/hooks/useLyrics";
import { Track, LyricsData } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import "@/styles/lyrics.css";

interface LyricsPanelProps {
 lyrics: LyricsData | null;
 currentLineIndex: number;
 isLoading: boolean;
 onClose?: () => void;
 className?: string;
 onSeek?: (time: number) => void;
 track?: Track;
}

export function LyricsPanel({
 lyrics,
 currentLineIndex,
 isLoading,
 onClose,
 className,
 onSeek,
 track,
}: LyricsPanelProps) {
 const contentRef = useRef<HTMLDivElement>(null);
 const activeLineRef = useRef<HTMLParagraphElement>(null);

 // Sync scroll
 useEffect(() => {
  if (activeLineRef.current) {
   activeLineRef.current.scrollIntoView({
    behavior: "smooth",
    block: "center",
   });
  }
 }, [currentLineIndex]);

 const downloadLrc = () => {
  if (!lyrics?.subtitles || !track) return;
  const element = document.createElement("a");
  const file = new Blob([lyrics.subtitles], { type: "text/plain" });
  element.href = URL.createObjectURL(file);
  element.download = `${track.title}.lrc`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
 };

 return (
  <div id="lyrics-panel" className={cn("lyrics-panel", className)}>
   <div className="lyrics-header flex items-center justify-between p-4 border-b border-foreground/10">
    <h3 className="text-lg font-bold text-foreground">Lyrics</h3>
    <div className="lyrics-controls flex gap-2">
     {lyrics?.subtitles && track && (
      <button
       onClick={downloadLrc}
       className="btn-icon p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/70 hover:text-foreground"
       title="Download LRC"
      >
       <Download size={18} />
      </button>
     )}
     {onClose && (
      <button
       id="close-lyrics-btn"
       onClick={onClose}
       className="btn-icon p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/70 hover:text-foreground"
      >
       <X size={18} />
      </button>
     )}
    </div>
   </div>

   <div ref={contentRef} className="lyrics-content relative">
    {isLoading ? (
     <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-foreground"></div>
     </div>
    ) : lyrics?.parsed ? (
     <div className="space-y-4 py-8">
      {lyrics.parsed.map((line, index) => {
       const isActive = index === currentLineIndex;
       const isUpcoming = index === currentLineIndex + 1;
       const isPast = index < currentLineIndex;

       return (
        <p
         key={index}
         ref={isActive ? activeLineRef : null}
         className={cn(
          "lyrics-line synced-line text-base md:text-lg font-medium text-left transition-colors duration-200 cursor-pointer hover:text-foreground/80",
          isActive && "active text-foreground font-semibold",
          isUpcoming && "upcoming text-foreground/60",
          isPast && " text-foreground/20",
          !isActive && !isUpcoming && !isPast && "text-foreground/30",
         )}
         data-index={index}
         data-time={line.time}
         onClick={() => onSeek?.(line.time)}
        >
         {line.text || "♪"}
        </p>
       );
      })}
      <div className="h-20" /> {/* Spacer */}
     </div>
    ) : (
     <div className="flex flex-col items-center justify-center h-full text-foreground/50 p-8 text-center">
      <Music size={48} className="mb-4 opacity-50" />
      <p className="text-lg">No synced lyrics available</p>
      {lyrics?.lyrics && (
       <div className="mt-8 whitespace-pre-wrap font-mono text-sm opacity-70">
        {lyrics.lyrics}
       </div>
      )}
     </div>
    )}
   </div>
  </div>
 );
}
