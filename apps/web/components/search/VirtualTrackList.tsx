"use client";

import { useCallback, useState } from "react";
import { List } from "react-window";
import { Track } from "@/lib/api/types";
import TrackRow from "./TrackRow";
import MobileTrackRow from "../mobile/MobileTrackRow";
import { usePlaybackState, useQueue, useAudioPlayerActions } from "@/contexts/AudioPlayerContext";
import { useWindowSize } from "@/hooks/useWindowSize";
import { getTrackTitle, getTrackArtists } from "@/lib/api/utils";

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
  handleAddToQueue: (track: Track) => void;
  handleShare: (track: Track) => void;
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
  handleAddToQueue,
  handleShare,
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
          onAddToQueue={() => handleAddToQueue(track)}
          onShare={() => handleShare(track)}
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
  const { setQueue, addToQueue } = useAudioPlayerActions();
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

  const handleAddToQueue = useCallback((track: Track) => {
    addToQueue(track);
  }, [addToQueue]);

  const handleShare = useCallback((track: Track) => {
    const text = `${getTrackTitle(track)} — ${getTrackArtists(track)}`;
    if (navigator.share) {
      navigator.share({ title: text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }, []);

  const rowHeight = isMobile ? 64 : 56;

  const rowProps: RowData = {
    tracks,
    isPlaying,
    currentTrack,
    loadingTrackId,
    isMobile,
    handleTrackClick,
    handleAddToQueue,
    handleShare,
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
