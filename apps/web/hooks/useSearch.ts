import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCallback } from "react";
import { useSearchContext } from "@/contexts/SearchContext";

type SearchContentType = "tracks" | "albums" | "artists" | "playlists";

export function useSearch() {
  const queryClient = useQueryClient();
  const { query, currentTab, setQuery, setCurrentTab } = useSearchContext();

  // Track search query with infinite scroll
  const tracksQuery = useInfiniteQuery({
    queryKey: ["search", "tracks", query],
    queryFn: async ({ pageParam, signal }) => {
      if (!query) return { items: [], totalNumberOfItems: 0, offset: 0, limit: 0 };
      const offset = pageParam ?? 0;
      const result = await api.searchTracks(query, { offset, limit: 25, signal });
      // Override the offset with what we actually requested since API returns wrong offset
      return { ...result, offset };
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = lastPage.offset ?? 0;
      const currentLimit = lastPage.limit ?? 25;
      const totalItems = lastPage.totalNumberOfItems ?? 0;
      const nextOffset = currentOffset + currentLimit;

      // Return undefined if we've reached the end
      if (nextOffset >= totalItems) {
        return undefined;
      }
      return nextOffset;
    },
    initialPageParam: 0,
    enabled: !!query && currentTab === "tracks",
  });

  // Album search query with infinite scroll
  const albumsQuery = useInfiniteQuery({
    queryKey: ["search", "albums", query],
    queryFn: async ({ pageParam, signal }) => {
      if (!query) return { items: [], totalNumberOfItems: 0, offset: 0, limit: 0 };
      const offset = pageParam ?? 0;
      const result = await api.searchAlbums(query, { offset, limit: 25, signal });
      // Override the offset with what we actually requested since API returns wrong offset
      return { ...result, offset };
    },
    getNextPageParam: (lastPage) => {
      const currentOffset = lastPage.offset ?? 0;
      const currentLimit = lastPage.limit ?? 25;
      const totalItems = lastPage.totalNumberOfItems ?? 0;
      const nextOffset = currentOffset + currentLimit;

      if (nextOffset >= totalItems) return undefined;
      return nextOffset;
    },
    initialPageParam: 0,
    enabled: !!query && currentTab === "albums",
  });

  // Artists search query with infinite scroll
  const artistsQuery = useInfiniteQuery({
    queryKey: ["search", "artists", query],
    queryFn: async ({ pageParam, signal }) => {
      if (!query) return { items: [], totalNumberOfItems: 0, offset: 0, limit: 0 };
      const offset = pageParam ?? 0;
      const result = await api.searchArtists(query, { offset, limit: 25, signal });
      // Override the offset with what we actually requested since API returns wrong offset
      return { ...result, offset };
    },
    getNextPageParam: (lastPage) => {
      const currentOffset = lastPage.offset ?? 0;
      const currentLimit = lastPage.limit ?? 25;
      const totalItems = lastPage.totalNumberOfItems ?? 0;
      const nextOffset = currentOffset + currentLimit;

      if (nextOffset >= totalItems) return undefined;
      return nextOffset;
    },
    initialPageParam: 0,
    enabled: !!query && currentTab === "artists",
  });

  // Search handler - triggers track search and resets to tracks tab
  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      setCurrentTab("tracks");
    },
    [setQuery, setCurrentTab],
  );

  // Tab change handler - fetches data for the selected tab if needed
  const handleTabChange = useCallback(
    (tab: SearchContentType) => {
      setCurrentTab(tab);
    },
    [setCurrentTab],
  );

  // Clear search results
  const clearSearch = useCallback(() => {
    setQuery("");
    setCurrentTab("tracks");
    queryClient.removeQueries({ queryKey: ["search"] });
  }, [queryClient, setQuery, setCurrentTab]);

  // Flatten paginated results
  const tracks = tracksQuery.data?.pages.flatMap((page) => page.items) || [];
  const albums = albumsQuery.data?.pages.flatMap((page) => page.items) || [];
  const artists = artistsQuery.data?.pages.flatMap((page) => page.items) || [];

  // Get metadata from the first page
  const firstTracksPage = tracksQuery.data?.pages[0];
  const firstAlbumsPage = albumsQuery.data?.pages[0];
  const firstArtistsPage = artistsQuery.data?.pages[0];

  const prefetchTab = useCallback(
    (tab: "tracks" | "albums" | "artists") => {
      if (!query) return;

      const queryKey =
        tab === "tracks"
          ? ["search", "tracks", query]
          : tab === "albums"
            ? ["search", "albums", query]
            : ["search", "artists", query];

      queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn: (({ pageParam = 0 }) => {
          if (tab === "tracks") {
            return api.searchTracks(query, { offset: pageParam, limit: 25 });
          } else if (tab === "albums") {
            return api.searchAlbums(query, { offset: pageParam, limit: 25 });
          } else {
            return api.searchArtists(query, { offset: pageParam, limit: 25 });
          }
        }) as any,
        initialPageParam: 0,
      });
    },
    [query, queryClient],
  );

  return {
    // Data
    tracks,
    albums,
    artists,

    // Metadata
    searchMetadata: {
      totalNumberOfItems:
        currentTab === "tracks"
          ? firstTracksPage?.totalNumberOfItems || 0
          : currentTab === "albums"
            ? firstAlbumsPage?.totalNumberOfItems || 0
            : firstArtistsPage?.totalNumberOfItems || 0,
      offset:
        currentTab === "tracks"
          ? firstTracksPage?.offset || 0
          : currentTab === "albums"
            ? firstAlbumsPage?.offset || 0
            : firstArtistsPage?.offset || 0,
      limit:
        currentTab === "tracks"
          ? firstTracksPage?.limit || 0
          : currentTab === "albums"
            ? firstAlbumsPage?.limit || 0
            : firstArtistsPage?.limit || 0,
    },

    // Loading states
    isLoading:
      tracksQuery.isLoading || albumsQuery.isLoading || artistsQuery.isLoading,
    isTracksLoading: tracksQuery.isLoading,
    isAlbumsLoading: albumsQuery.isLoading,
    isArtistsLoading: artistsQuery.isLoading,
    isFetchingMore:
      tracksQuery.isFetchingNextPage ||
      albumsQuery.isFetchingNextPage ||
      artistsQuery.isFetchingNextPage,

    // Infinite scroll
    hasNextPage:
      currentTab === "tracks"
        ? tracksQuery.hasNextPage
        : currentTab === "albums"
          ? albumsQuery.hasNextPage
          : artistsQuery.hasNextPage,
    fetchNextPage: () => {
      if (currentTab === "tracks") {
        return tracksQuery.fetchNextPage();
      } else if (currentTab === "albums") {
        return albumsQuery.fetchNextPage();
      } else {
        return artistsQuery.fetchNextPage();
      }
    },

    // State
    currentTab: currentTab,
    lastQuery: query,

    // Actions
    handleSearch,
    handleTabChange,
    clearSearch,
    prefetchTab,
  };
}
