"use client";

import { Track, Album } from "@/lib/api/types";
import React from "react";
import { useWindowSize } from "@/hooks/useWindowSize";
import AlbumCard from "./AlbumCard";
import ArtistCard from "./ArtistCard";
import PlaylistCard from "./PlaylistCard";
import { motion } from "motion/react";
import { Search, Music2, Disc, Users, ListMusic, LucideIcon } from "lucide-react";
import { VirtualSearchResults } from "./VirtualSearchResults";
import { TabNavigation } from "./SearchResults/TabNavigation";
import { TrackResults } from "./SearchResults/TrackResults";
import { SkeletonRows } from "./SearchResults/SkeletonRows";

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
  const windowDimensions = useWindowSize();

  const allTabs: { id: SearchContentType; label: string; icon: LucideIcon }[] = [
    { id: "tracks", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "artists", label: "Artists", icon: Users },
    { id: "playlists", label: "Playlists", icon: ListMusic },
  ];

  const tabs = allTabs.filter((tab) => tab.id !== "playlists");

  if (isLoading) {
    return <SkeletonRows />;
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
      <TabNavigation
        tabs={tabs}
        activeTab={contentType}
        onTabChange={onTabChange || (() => {})}
        onPrefetch={prefetchTab}
      />

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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {contentType === "tracks" && tracks ? (
          <TrackResults tracks={tracks} />
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
                  <ArtistCard artist={artist} />
                </div>
              ))}

            {contentType === "playlists" &&
              playlists?.map((playlist) => (
                <div key={playlist.uuid} className="w-full">
                  <PlaylistCard playlist={playlist} />
                </div>
              ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
