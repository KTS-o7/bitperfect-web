# P2 - Code Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split large components into smaller pieces and add test coverage for critical paths.

**Architecture:** Component refactoring and test setup with Vitest/Testing Library.

**Tech Stack:** React, Vitest, Testing Library

---

## Part A: Split Large Components

### Task A1: Split SearchResults.tsx (404 lines)

**Files:**
- Modify: `apps/web/components/search/SearchResults.tsx`
- Create: `apps/web/components/search/SearchResults/TabNavigation.tsx`
- Create: `apps/web/components/search/SearchResults/TrackResults.tsx`
- Create: `apps/web/components/search/SearchResults/AlbumResults.tsx`
- Create: `apps/web/components/search/SearchResults/ArtistResults.tsx`
- Create: `apps/web/components/search/SearchResults/SkeletonRows.tsx`

**Step 1: Create TabNavigation component**

Create `apps/web/components/search/SearchResults/TabNavigation.tsx`:
```typescript
"use client";

import { motion } from "motion/react";
import { LucideIcon, Music2, Disc, Users, ListMusic } from "lucide-react";

type SearchContentType = "tracks" | "albums" | "artists" | "playlists";

interface Tab {
  id: SearchContentType;
  label: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: SearchContentType;
  onTabChange: (tab: SearchContentType) => void;
  onPrefetch?: (tab: "tracks" | "albums" | "artists") => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange, onPrefetch }: TabNavigationProps) {
  return (
    <div className="sticky -top-6 z-10 pb-0 -mx-4 px-0 lg:px-4 bg-background/95 backdrop-blur-2xl border-b border-foreground/10">
      <div
        className="flex items-center gap-1 lg:gap-8 overflow-x-auto no-scrollbar py-2 lg:py-4 px-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => {
              if (tab.id !== "playlists" && onPrefetch) {
                onPrefetch(tab.id as "tracks" | "albums" | "artists");
              }
            }}
            className={`
              relative flex-shrink-0
              px-4 py-3 lg:px-0 lg:pb-3 lg:pt-0
              text-xs font-mono uppercase tracking-widest
              transition-all whitespace-nowrap outline-none
              active:bg-foreground/5 lg:active:bg-transparent
              ${activeTab === tab.id
                ? "text-foreground"
                : "text-foreground/40 hover:text-foreground/70"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <tab.icon className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              {tab.label}
            </span>
            {activeTab === tab.id && (
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
  );
}
```

**Step 2: Create TrackResults component**

Create `apps/web/components/search/SearchResults/TrackResults.tsx`:
```typescript
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

  // Use virtualization for 50+ tracks
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
```

**Step 3: Create SkeletonRows component**

Create `apps/web/components/search/SearchResults/SkeletonRows.tsx`:
```typescript
export function SkeletonRows({ count = 12 }: { count?: number }) {
  return (
    <div className="w-full border-t border-foreground/10">
      <div className="grid grid-cols-[50px_40px_1fr_180px_120px_80px] lg:grid-cols-[50px_40px_1fr_180px_120px_80px] md:grid-cols-[40px_40px_1fr_60px] gap-4 items-center px-6 py-3 border-b border-foreground/10">
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
      {[...Array(count - 1)].map((_, i) => (
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
  );
}
```

**Step 4: Update SearchResults.tsx to use sub-components**

Replace the main SearchResults to import from sub-components:
```typescript
import { TabNavigation } from "./SearchResults/TabNavigation";
import { TrackResults } from "./SearchResults/TrackResults";
import { SkeletonRows } from "./SearchResults/SkeletonRows";
// ... remove inline implementations
```

**Step 5: Commit**

Run: `git add apps/web/components/search/SearchResults/ && git commit -m "refactor: split SearchResults into smaller components"`

---

### Task A2: Split FullscreenPlayer.tsx (887 lines)

**Files:**
- Modify: `apps/web/components/player/FullscreenPlayer.tsx`
- Create: `apps/web/components/player/PlayerControls.tsx`
- Create: `apps/web/components/player/PlayerProgress.tsx`
- Create: `apps/web/components/player/PlayerQualityBadge.tsx`

**Step 1: Create PlayerControls component**

Create `apps/web/components/player/PlayerControls.tsx`:
```typescript
"use client";

import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, Mic2 } from "lucide-react";

interface PlayerControlsProps {
  isPlaying: boolean;
  shuffleActive: boolean;
  repeatMode: "off" | "all" | "one";
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onQueueClick: () => void;
  onLyricsClick: () => void;
}

export function PlayerControls({
  isPlaying,
  shuffleActive,
  repeatMode,
  onPlayPause,
  onPrev,
  onNext,
  onShuffle,
  onRepeat,
  onQueueClick,
  onLyricsClick,
}: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-8">
      {/* Left: Additional controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onShuffle}
          className={`p-2 transition-opacity ${shuffleActive ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
          aria-label="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Main playback controls */}
      <div className="flex items-center gap-6">
        <button onClick={onPrev} className="p-2 hover:opacity-70 transition-opacity" aria-label="Previous">
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={onPlayPause}
          className="p-3 bg-white rounded-full hover:scale-105 transition-transform"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
        </button>
        
        <button onClick={onNext} className="p-2 hover:opacity-70 transition-opacity" aria-label="Next">
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Additional controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRepeat}
          className={`p-2 transition-opacity ${repeatMode !== "off" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
          aria-label={`Repeat: ${repeatMode}`}
        >
          <Repeat className={`w-4 h-4 ${repeatMode === "one" ? "text-xs" : ""}`} />
        </button>
        <button onClick={onLyricsClick} className="p-2 opacity-40 hover:opacity-70 transition-opacity" aria-label="Lyrics">
          <Mic2 className="w-4 h-4" />
        </button>
        <button onClick={onQueueClick} className="p-2 opacity-40 hover:opacity-70 transition-opacity" aria-label="Queue">
          <ListMusic className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create PlayerProgress component**

Create `apps/web/components/player/PlayerProgress.tsx`:
```typescript
"use client";

import { useCallback } from "react";

interface PlayerProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function PlayerProgress({ currentTime, duration, onSeek }: PlayerProgressProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  }, [duration, onSeek]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 w-full max-w-2xl">
      <span className="text-xs font-mono text-foreground/60 w-10 text-right">
        {formatTime(currentTime)}
      </span>
      
      <div
        className="flex-1 h-1 bg-foreground/20 cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-foreground relative group-hover:bg-white"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      <span className="text-xs font-mono text-foreground/60 w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
}
```

**Step 3: Commit**

Run: `git add apps/web/components/player/PlayerControls.tsx apps/web/components/player/PlayerProgress.tsx && git commit -m "refactor: extract PlayerControls and PlayerProgress components"`

---

## Part B: Add Test Coverage

### Task B1: Setup Testing Environment

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/test/setup.ts`

**Step 1: Install testing dependencies**

Run: `cd apps/web && bun add -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/react`

**Step 2: Create vitest.config.ts**

Create `apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

**Step 3: Create test setup**

Create `apps/web/test/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

**Step 4: Add test script to package.json**

Modify `apps/web/package.json`, add to scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: Commit**

Run: `git add apps/web/vitest.config.ts apps/web/test/setup.ts apps/web/package.json && git commit -m "test: setup Vitest testing environment"`

---

### Task B2: Add Tests for Shared Utils

**Files:**
- Create: `packages/shared/api/utils.test.ts`

**Step 1: Write tests for getCoverUrl**

```typescript
import { describe, it, expect } from "vitest";
import { getCoverUrl, getCoverUrlBySize } from "./utils";

describe("getCoverUrl", () => {
  it("should return empty string when coverId is undefined", () => {
    expect(getCoverUrl(undefined)).toBe("");
    expect(getCoverUrl(undefined, "320")).toBe("");
  });

  it("should return empty string when coverId is null", () => {
    expect(getCoverUrl(null as any)).toBe("");
  });

  it("should return formatted URL with default size", () => {
    const result = getCoverUrl("abc-123-def");
    expect(result).toBe("https://resources.tidal.com/images/abc/123/def/320x320.jpg");
  });

  it("should return formatted URL with custom size", () => {
    const result = getCoverUrl("abc-123-def", "160");
    expect(result).toBe("https://resources.tidal.com/images/abc/123/def/160x160.jpg");
  });

  it("should handle numeric cover IDs", () => {
    const result = getCoverUrl(123456789);
    expect(result).toBe("https://resources.tidal.com/images/123456789/320x320.jpg");
  });
});

describe("getCoverUrlBySize", () => {
  it("should return URL with 80 size by default", () => {
    expect(getCoverUrlBySize("test")).toBe("https://resources.tidal.com/images/test/80x80.jpg");
  });

  it("should return URL with specified size", () => {
    expect(getCoverUrlBySize("test", "640")).toBe("https://resources.tidal.com/images/test/640x640.jpg");
    expect(getCoverUrlBySize("test", "1280")).toBe("https://resources.tidal.com/images/test/1280x1280.jpg");
  });
});
```

**Step 2: Run tests**

Run: `cd packages/shared && bun test:run`

Expected: All tests pass

**Step 3: Commit**

Run: `git add packages/shared/api/utils.test.ts && git commit -m "test: add tests for getCoverUrl utility"`

---

### Task B3: Add Tests for Hooks

**Files:**
- Create: `apps/web/hooks/useSearch.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSearch } from "./useSearch";
import { SearchProvider } from "@/contexts/SearchContext";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>{children}</SearchProvider>
    </QueryClientProvider>
  );
};

describe("useSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty arrays when no query", () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.tracks).toEqual([]);
    expect(result.current.albums).toEqual([]);
    expect(result.current.artists).toEqual([]);
  });

  it("should have correct initial state", () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentTab).toBe("tracks");
    expect(result.current.hasNextPage).toBe(false);
  });
});
```

**Step 2: Run tests**

Run: `cd apps/web && bun test:run`

Expected: Tests pass (may need to mock API calls)

**Step 3: Commit**

Run: `git add apps/web/hooks/useSearch.test.ts && git commit -m "test: add useSearch hook tests"`

---

## Summary

| Task | Files Changed | Impact |
|------|--------------|--------|
| Split SearchResults | 6 files (4 created) | Maintainable components |
| Split FullscreenPlayer | 3 files created | Reusable player parts |
| Setup Vitest | 3 files | Testing infrastructure |
| Test utils | 1 file | Code quality |
| Test hooks | 1 file | Test coverage |
| **Total** | 14 files | Better maintainability |

**Estimated Impact:**
- Smaller components: Easier to understand and maintain
- Test coverage: Critical paths protected from regressions
- Reusable parts: Player controls can be used elsewhere
