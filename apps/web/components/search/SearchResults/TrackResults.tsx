"use client";

import { Track } from "@/lib/api/types";
import TrackRow from "../TrackRow";
import MobileTrackRow from "../../mobile/MobileTrackRow";
import { VirtualTrackList } from "../VirtualTrackList";
import { TableHeader } from "../TableHeader";
import { usePlaybackState, useQueue, useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useState, useCallback, useEffect } from "react";

interface TrackResultsProps {
  tracks: Track[];
}

export function TrackResults({ tracks }: TrackResultsProps) {
  const { isPlaying } = usePlaybackState();
  const { currentTrack } = useQueue();
  const { setQueue } = useAudioPlayer();
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowDimensions.width > 0 && windowDimensions.width < 1024;

  const handleTrackClick = useCallback(async (track: Track, index: number) => {
    if (loadingTrackId === track.id) return;
    setLoadingTrackId(track.id);
    try {
      await setQueue(tracks, index);
    } catch (error) {
      console.error("Error playing track:", error);
    } finally {
      setLoadingTrackId(null);
    }
  }, [tracks, setQueue, loadingTrackId]);

  if (!tracks || tracks.length === 0) {
    return null;
  }

  if (tracks.length > 50 && windowDimensions.width > 0) {
    return (
      <VirtualTrackList
        tracks={tracks}
        height={windowDimensions.height - 200}
        width={windowDimensions.width}
      />
    );
  }

  return (
    <div className="border-t border-foreground/10">
      <div className="sticky top-[4.8rem] z-10 hidden lg:block">
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
                onClick={() => handleTrackClick(track, index)}
                onAddToQueue={() => {}}
                onShare={() => {}}
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
              onClick={() => handleTrackClick(track, index)}
            />
          );
        })}
      </div>
    </div>
  );
}
