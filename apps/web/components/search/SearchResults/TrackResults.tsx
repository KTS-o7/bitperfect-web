"use client";

import { Track } from "@/lib/api/types";
import TrackRow from "../TrackRow";
import MobileTrackRow from "../../mobile/MobileTrackRow";
import { VirtualTrackList } from "../VirtualTrackList";
import { TableHeader } from "../TableHeader";
import { usePlaybackState, useQueue, useAudioPlayerActions } from "@/contexts/AudioPlayerContext";
import { useState, useCallback, useRef } from "react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { getTrackTitle, getTrackArtists } from "@/lib/api/utils";

interface TrackResultsProps {
  tracks: Track[];
}

export function TrackResults({ tracks }: TrackResultsProps) {
  const { isPlaying } = usePlaybackState();
  const { currentTrack } = useQueue();
  const { setQueue, addToQueue } = useAudioPlayerActions();
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const loadingTrackIdRef = useRef(loadingTrackId);
  loadingTrackIdRef.current = loadingTrackId;
  const { width, height } = useWindowSize();

  const isMobile = width > 0 && width < 1024;

  const handleTrackClick = useCallback(async (track: Track, index: number) => {
    if (loadingTrackIdRef.current === track.id) return;
    setLoadingTrackId(track.id);
    try {
      await setQueue(tracks, index);
    } catch (error) {
      console.error("Error playing track:", error);
    } finally {
      setLoadingTrackId(null);
    }
  }, [tracks, setQueue]);

  const handleShare = useCallback((track: Track) => {
    const text = `${getTrackTitle(track)} — ${getTrackArtists(track)}`;
    if (navigator.share) {
      navigator.share({ title: text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }, []);

  // Stable per-track click handlers — avoids creating new lambdas on every render
  // which would defeat React.memo on TrackRow.
  const clickHandlersRef = useRef<Map<number, () => void>>(new Map());
  const getClickHandler = useCallback((track: Track, index: number) => {
    const key = track.id;
    if (!clickHandlersRef.current.has(key)) {
      clickHandlersRef.current.set(key, () => handleTrackClick(track, index));
    }
    return clickHandlersRef.current.get(key)!;
  }, [handleTrackClick]);

  // Clear cache whenever handleTrackClick identity changes (e.g. tracks/queue changes)
  const prevHandleRef = useRef(handleTrackClick);
  if (prevHandleRef.current !== handleTrackClick) {
    prevHandleRef.current = handleTrackClick;
    clickHandlersRef.current.clear();
  }

  if (!tracks || tracks.length === 0) {
    return null;
  }

  if (tracks.length > 50 && width > 0) {
    return (
      <VirtualTrackList
        tracks={tracks}
        height={height - 200}
        width={width}
      />
    );
  }

  return (
    <div className="border-t border-foreground/10">
      <div className="sticky top-[65px] z-10 hidden lg:block">
        <TableHeader />
      </div>
      <div>
        {tracks.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          if (isMobile) {
            return (
              <MobileTrackRow
                key={`${track.id}-${index}`}
                track={track}
                index={index}
                isCurrentTrack={isCurrentTrack}
                isPlaying={isCurrentTrack && isPlaying}
                isLoading={loadingTrackId === track.id}
                onClick={getClickHandler(track, index)}
                onAddToQueue={() => addToQueue(track)}
                onShare={() => handleShare(track)}
              />
            );
          }
          return (
            <TrackRow
              key={`${track.id}-${index}`}
              track={track}
              index={index}
              isCurrentTrack={isCurrentTrack}
              isPlaying={isCurrentTrack && isPlaying}
              isLoading={loadingTrackId === track.id}
              onClick={getClickHandler(track, index)}
            />
          );
        })}
      </div>
    </div>
  );
}
