"use client";

import { useCallback, useState } from "react";
import { List } from "react-window";
import { Track } from "@/lib/api/types";
import TrackRow from "./TrackRow";
import MobileTrackRow from "../mobile/MobileTrackRow";
import { usePlaybackState, useQueue, useAudioPlayerActions } from "@/contexts/AudioPlayerContext";
import { useWindowSize } from "@/hooks/useWindowSize";

interface VirtualTrackListProps {
  tracks: Track[];
  height: number;
  width: number;
}

interface RowData {
  tracks: Track[];
  isPlaying: boolean;
  currentTrack: Track | null;
  loadingTrackId: number | null;
  isMobile: boolean;
  handleTrackClick: (track: Track, index: number) => void;
}

type RowComponentProps = {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
} & RowData;

// Defined outside the parent component so its reference is stable across renders.
// This prevents react-window from remounting all rows on every parent re-render.
function RowComponent({
  index,
  style,
  tracks,
  isPlaying,
  currentTrack,
  loadingTrackId,
  isMobile,
  handleTrackClick,
}: RowComponentProps) {
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

export function VirtualTrackList({ tracks, height, width }: VirtualTrackListProps) {
  const { isPlaying } = usePlaybackState();
  const { currentTrack } = useQueue();
  const { setQueue } = useAudioPlayerActions();
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth > 0 && windowWidth < 1024;

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

  const rowProps: RowData = {
    tracks,
    isPlaying,
    currentTrack,
    loadingTrackId,
    isMobile,
    handleTrackClick,
  };

  return (
    <List
      rowComponent={RowComponent}
      rowCount={tracks.length}
      rowHeight={rowHeight}
      rowProps={rowProps}
      overscanCount={5}
      style={{ height, width }}
    />
  );
}
