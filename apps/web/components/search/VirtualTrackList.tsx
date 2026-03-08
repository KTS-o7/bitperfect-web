"use client";

import { useCallback, useEffect, useState } from "react";
import { List } from "react-window";
import { Track } from "@/lib/api/types";
import TrackRow from "./TrackRow";
import MobileTrackRow from "../mobile/MobileTrackRow";
import { usePlaybackState, useQueue, useAudioPlayer } from "@/contexts/AudioPlayerContext";

interface VirtualTrackListProps {
  tracks: Track[];
  height: number;
  width: number;
}

export function VirtualTrackList({ tracks, height, width }: VirtualTrackListProps) {
  const { isPlaying } = usePlaybackState();
  const { currentTrack } = useQueue();
  const { setQueue } = useAudioPlayer();
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const rowHeight = isMobile ? 64 : 56;

  return (
    <List
      rowComponent={RowComponent}
      rowCount={tracks.length}
      rowHeight={rowHeight}
      rowProps={{}}
      overscanCount={5}
      style={{ height, width }}
    />
  );

  function RowComponent({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      "aria-posinset": number;
      "aria-setsize": number;
      role: "listitem";
    };
  }) {
    const track = tracks[index];
    const isCurrentTrack = currentTrack?.id === track.id;
    
    return (
      <div style={style}>
        {isMobile ? (
          <MobileTrackRow
            track={track}
            index={index}
            isCurrentTrack={isCurrentTrack}
            isPlaying={isCurrentTrack && isPlaying}
            isLoading={loadingTrackId === track.id}
            onClick={() => handleTrackClick(track, index)}
            onAddToQueue={() => {}}
            onShare={() => {}}
          />
        ) : (
          <TrackRow
            track={track}
            index={index}
            isCurrentTrack={isCurrentTrack}
            isPlaying={isCurrentTrack && isPlaying}
            isLoading={loadingTrackId === track.id}
            onClick={() => handleTrackClick(track, index)}
          />
        )}
      </div>
    );
  }
}
