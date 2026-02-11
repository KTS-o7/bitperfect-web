"use client";

import { Track, Album } from "@/lib/api/types";
import {
  useAudioPlayer,
  usePlaybackState,
  useQueue,
} from "@/contexts/AudioPlayerContext";
import { useState, useCallback } from "react";
import React from "react";
import TrackRow from "./TrackRow";
import MobileTrackRow from "../mobile/MobileTrackRow";
import AlbumCard from "./AlbumCard";
import ArtistCard from "./ArtistCard";
import PlaylistCard from "./PlaylistCard";
import { TableHeader } from "./TableHeader";
import { motion, AnimatePresence } from "motion/react";
import { Search, Music2, Disc, Users, ListMusic, Loader2 } from "lucide-react";
import { VirtualSearchResults } from "./VirtualSearchResults";

type SearchContentType = "tracks" | "albums" | "artists" | "playlists";

interface Artist {
  id: number;
  name: string;
  picture?: string;
  type?: string;
  popularity?: number;
  bio?: string;
}

interface Playlist {
  uuid: string;
  title: string;
  description?: string;
  image?: string;
  squareImage?: string;
  numberOfTracks?: number;
  duration?: number;
  creator?: {
    id: number;
    name: string;
  };
  type?: string;
  publicPlaylist?: boolean;
}

interface SearchResultsProps {
  tracks?: Track[];
  albums?: Album[];
  artists?: Artist[];
  playlists?: Playlist[];
  contentType?: SearchContentType;
  isLoading?: boolean;
  totalNumberOfItems?: number;
  offset?: number;
  limit?: number;
  onTabChange?: (tab: SearchContentType) => void;
  hasNextPage?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  prefetchTab?: (tab: "tracks" | "albums" | "artists") => void;
}

export function SearchResults({
  tracks,
  albums,
  artists,
  playlists,
  contentType = "tracks",
  isLoading = false,
  totalNumberOfItems,
  offset = 0,
  limit = 25,
  onTabChange,
  hasNextPage = false,
  isFetchingMore = false,
  onLoadMore,
  prefetchTab,
}: SearchResultsProps) {
  // Use split contexts for state
  const { isPlaying } = usePlaybackState();
  const { currentTrack } = useQueue();

  // Still need AudioPlayerContext for methods
  const { setQueue } = useAudioPlayer();

  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);

  // Lazy initialization to avoid SSR issues
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  // Check if mobile (< 1024px)
  const isMobile = windowDimensions.width > 0 && windowDimensions.width < 1024;

  // DISABLED: Infinite scroll observer
  // const observerTarget = React.useRef<HTMLDivElement>(null);

  // // Use ref to avoid recreating observer when onLoadMore changes
  // const onLoadMoreRef = React.useRef(onLoadMore);
  // React.useEffect(() => {
  //  onLoadMoreRef.current = onLoadMore;
  // }, [onLoadMore]);

  // Track window dimensions for virtual scrolling with debounce
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Clear existing timeout
      clearTimeout(timeoutId);

      // Debounce the state update
      timeoutId = setTimeout(() => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // DISABLED: Infinite scroll IntersectionObserver
  // React.useEffect(() => {
  //  const observer = new IntersectionObserver(
  //   (entries) => {
  //    if (
  //     entries[0].isIntersecting &&
  //     hasNextPage &&
  //     !isFetchingMore &&
  //     onLoadMoreRef.current
  //    ) {
  //     onLoadMoreRef.current();
  //    }
  //   },
  //   { threshold: 0.1, rootMargin: "100px" },
  //  );

  //  const currentTarget = observerTarget.current;
  //  if (currentTarget) {
  //   observer.observe(currentTarget);
  //  }

  //  return () => {
  //   if (currentTarget) {
  //    observer.unobserve(currentTarget);
  //   }
  //  };
  // }, [hasNextPage, isFetchingMore]); // Removed onLoadMore from deps

  // Define all available tabs
  const allTabs: { id: SearchContentType; label: string; icon: any }[] = [
    { id: "tracks", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "artists", label: "Artists", icon: Users },
    { id: "playlists", label: "Playlists", icon: ListMusic },
  ];

  // Show all implemented tabs (lazy load content when tab is clicked)
  // Filter out playlists until backend support is added
  const tabs = allTabs.filter((tab) => tab.id !== "playlists");


  const handleTrackClick = async (track: Track, index: number) => {
    if (loadingTrackId === track.id) return;

    setLoadingTrackId(track.id);
    try {
      if (tracks) {
        await setQueue(tracks, index);
      }
    } catch (error) {
      console.error("Error playing track:", error);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleArtistClick = (artist: Artist) => {
  };

  const handlePlaylistClick = (playlist: Playlist) => {
  };

  if (isLoading) {
    return (
      <div className="w-full border-t border-foreground/10">
        <TableHeader />
        <div>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[50px_40px_1fr_180px_120px_80px] lg:grid-cols-[50px_40px_1fr_180px_120px_80px] md:grid-cols-[40px_40px_1fr_60px] gap-4 items-center px-6 py-3 border-b border-foreground/10 animate-pulse"
            >
              <div className="h-3 w-6 bg-foreground/10 mx-auto" />
              <div className="w-10 h-10 bg-foreground/10 border border-foreground/10" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 bg-foreground/10" />
                <div className="h-3 w-1/2 bg-foreground/10" />
              </div>
              <div className="hidden lg:block h-3 w-3/4 bg-foreground/10" />
              <div className="hidden lg:block h-3 w-16 bg-foreground/10" />
              <div className="h-3 w-12 bg-foreground/10 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items =
    contentType === "tracks"
      ? tracks
      : contentType === "albums"
        ? albums
        : contentType === "artists"
          ? artists
          : playlists;

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
        <Search className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No results found</p>
        <p className="text-sm">Try searching for something else</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Tab Navigation - Touch-optimized with horizontal scroll */}
      <div className="sticky -top-6 z-10 pb-0 -mx-4 px-0 lg:px-4 bg-background/95 backdrop-blur-2xl border-b border-foreground/10">
        <div
          className="flex items-center gap-1 lg:gap-8 overflow-x-auto no-scrollbar py-2 lg:py-4 px-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              onMouseEnter={() => {
                if (tab.id !== "playlists" && prefetchTab) {
                  prefetchTab(tab.id as "tracks" | "albums" | "artists");
                }
              }}
              className={`
        relative flex-shrink-0
        px-4 py-3 lg:px-0 lg:pb-3 lg:pt-0
        text-xs font-mono uppercase tracking-widest
        transition-all whitespace-nowrap outline-none
        active:bg-foreground/5 lg:active:bg-transparent
        ${contentType === tab.id
                  ? "text-foreground"
                  : "text-foreground/40 hover:text-foreground/70"
                }
       `}
            >
              <span className="flex items-center gap-2">
                <tab.icon className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                {tab.label}
              </span>
              {contentType === tab.id && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-2 px-1 mt-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
          {totalNumberOfItems !== undefined ? (
            <>
              {totalNumberOfItems.toLocaleString()} {contentType}
            </>
          ) : (
            `${items.length} ${contentType}`
          )}
        </div>
      </div>

      {/* Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {contentType === "tracks" ? (
          <div className="border-t border-foreground/10">
            {/* Table header - desktop only */}
            <div className="sticky top-[4.8rem] z-10 hidden lg:block">
              <TableHeader />
            </div>
            <div>
              {tracks?.map((track, index) => {
                const isCurrentTrack = currentTrack?.id === track.id;

                // Use MobileTrackRow on mobile, TrackRow on desktop
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
                      onAddToQueue={() => {
                        // Add to queue functionality
                      }}
                      onShare={() => {
                        // Share functionality
                        if (navigator.share) {
                          navigator.share({
                            title: track.title,
                            text: `Check out ${track.title} by ${track.artist?.name}`,
                          });
                        }
                      }}
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
        ) : contentType === "albums" &&
          albums &&
          albums.length > 50 &&
          windowDimensions.width > 0 ? (
          <VirtualSearchResults
            albums={albums}
            height={windowDimensions.height - 200}
            width={windowDimensions.width}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {contentType === "albums" &&
              albums?.map((album) => (
                <div key={album.id} className="w-full">
                  <AlbumCard album={album} />
                </div>
              ))}

            {contentType === "artists" &&
              artists?.map((artist) => (
                <div key={artist.id} className="w-full">
                  <ArtistCard artist={artist} onClick={handleArtistClick} />
                </div>
              ))}

            {contentType === "playlists" &&
              playlists?.map((playlist) => (
                <div key={playlist.uuid} className="w-full">
                  <PlaylistCard playlist={playlist} onClick={handlePlaylistClick} />
                </div>
              ))}
          </div>
        )}
      </motion.div>

      {/* DISABLED: Infinite Scroll Loading Indicator */}
      {/* {isFetchingMore && (
    <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     className="flex items-center justify-center py-8 mt-4"
    >
     <div className="flex items-center gap-3 text-foreground/40">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm font-medium">Loading more...</span>
     </div>
    </motion.div>
   )} */}

      {/* DISABLED: Intersection Observer Target */}
      {/* <div ref={observerTarget} className="h-4" /> */}
    </div>
  );
}
