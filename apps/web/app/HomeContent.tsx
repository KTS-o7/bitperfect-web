"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { MobileSearchHeader } from "@/components/mobile/MobileSearchHeader";
import { useSearch } from "@/hooks/useSearch";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "@/components/layout/Header";

export function HomeContent() {
  const {
    tracks,
    albums,
    artists,
    searchMetadata,
    isLoading,
    currentTab,
    handleSearch,
    handleTabChange,
    hasNextPage,
    isFetchingMore,
    fetchNextPage,
    prefetchTab,
  } = useSearch();

  const [hasSearched, setHasSearched] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSearchWithTracking = (query: string) => {
    handleSearch(query);
    setHasSearched(true);
  };

  const hasResults =
    tracks.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      {isMobile && (
        <MobileSearchHeader
          onSearch={handleSearchWithTracking}
          isLoading={isLoading}
        />
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <Header>
          <SearchBar
            onSearch={handleSearchWithTracking}
            isLoading={isLoading}
          />
        </Header>
      )}

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {hasResults || isLoading ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ willChange: "opacity, transform" }}
            >
              <SearchResults
                tracks={tracks}
                albums={albums}
                artists={artists}
                contentType={currentTab}
                isLoading={isLoading}
                totalNumberOfItems={searchMetadata?.totalNumberOfItems}
                offset={searchMetadata?.offset}
                limit={searchMetadata?.limit}
                onTabChange={handleTabChange}
                hasNextPage={hasNextPage}
                isFetchingMore={isFetchingMore}
                onLoadMore={fetchNextPage}
                prefetchTab={prefetchTab}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <div className="text-center max-w-md border border-foreground/10 px-12 py-16">
                <div className="mb-6">
                  <Search className="w-10 h-10 text-foreground/20 mx-auto" />
                </div>
                <h3 className="text-sm font-mono uppercase tracking-widest text-foreground/90 mb-2">
                  {hasSearched ? "NO RESULTS" : "SEARCH MUSIC"}
                </h3>
                <p className="text-[11px] font-mono uppercase tracking-wider text-foreground/40">
                  {hasSearched
                    ? "Try different keywords"
                    : "Enter a song, album, or artist"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
