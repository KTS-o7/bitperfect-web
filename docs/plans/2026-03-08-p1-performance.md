# P1 - Performance Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve runtime performance by splitting large context, adding track virtualization, and centralizing cover URL generation.

**Architecture:** Moderate complexity - refactoring context, creating virtualization components, and creating shared utilities.

**Tech Stack:** React, react-window, TypeScript

---

## Part A: Centralize Cover URL Generation

### Task A1: Add getCoverUrl to Shared Utils

**Files:**
- Modify: `packages/shared/api/utils.ts`

**Step 1: Read current utils file**

The file already exists at `packages/shared/api/utils.ts`. Add the cover URL function at the end.

**Step 2: Add getCoverUrl function**

Add to `packages/shared/api/utils.ts`:
```typescript
const TIDAL_COVER_BASE_URL = "https://resources.tidal.com/images";

export function getCoverUrl(coverId: string | number | undefined, size: string = "320"): string {
  if (!coverId) return "";
  
  const coverIdStr = String(coverId);
  // Handle TIDAL format: "abc-123-def" -> "abc/123/def"
  const formattedId = coverIdStr.replace(/-/g, "/");
  
  return `${TIDAL_COVER_BASE_URL}/${formattedId}/${size}x${size}.jpg`;
}

export function getCoverUrlBySize(
  coverId: string | number | undefined,
  size: "80" | "160" | "320" | "640" | "1280" = "320"
): string {
  return getCoverUrl(coverId, size);
}
```

**Step 3: Export from web lib**

Check `apps/web/lib/api/utils.ts` - it already re-exports from shared. Verify it includes the new functions:
```typescript
export {
  // ... existing exports
  getCoverUrl,
  getCoverUrlBySize,
} from "@bitperfect/shared/api";
```

**Step 4: Commit**

Run: `git add packages/shared/api/utils.ts apps/web/lib/api/utils.ts && git commit -m "feat: add getCoverUrl to shared utils"`

---

### Task A2: Update Components to Use Shared getCoverUrl

**Files to modify (replace inline URL construction with api.getCoverUrl):**

1. `apps/web/components/search/AlbumCard.tsx`
2. `apps/web/components/search/ArtistCard.tsx`
3. `apps/web/components/search/PlaylistCard.tsx`
4. `apps/web/components/player/FullscreenPlayer.tsx`
5. `apps/web/components/player/AudioPlayer.tsx`
6. `apps/web/components/player/MiniPlayer.tsx`
7. `apps/web/components/player/FullscreenLyrics.tsx`
8. `apps/web/components/player/Queue.tsx`
9. `apps/web/app/artist/[id]/ArtistClient.tsx`
10. `apps/web/app/album/[id]/AlbumClient.tsx`

**For each file:**

**Step 1: Find inline URL construction**

Example from AlbumCard.tsx (lines 12):
```typescript
? `https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`
```

**Step 2: Replace with api.getCoverUrl**

```typescript
import { api } from "@/lib/api";

// Then replace:
? `https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`
// With:
? api.getCoverUrl(album.cover, "320")
```

**Step 3: Commit after all updates**

Run: `git add apps/web/components/search/AlbumCard.tsx apps/web/components/search/ArtistCard.tsx apps/web/components/search/PlaylistCard.tsx apps/web/components/player/FullscreenPlayer.tsx apps/web/components/player/AudioPlayer.tsx apps/web/components/player/MiniPlayer.tsx apps/web/components/player/FullscreenLyrics.tsx apps/web/components/player/Queue.tsx apps/web/app/artist/[id]/ArtistClient.tsx apps/web/app/album/[id]/AlbumClient.tsx && git commit -m "refactor: use centralized getCoverUrl across all components"`

---

## Part B: Add Track Virtualization

### Task B1: Create VirtualTrackList Component

**Files:**
- Create: `apps/web/components/search/VirtualTrackList.tsx`

**Step 1: Write the component**

```typescript
"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
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

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
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
  }, [tracks, currentTrack, isPlaying, isMobile, loadingTrackId, handleTrackClick]);

  // Row height estimation: 56px desktop, 64px mobile
  const rowHeight = isMobile ? 64 : 56;

  return (
    <List
      height={height}
      itemCount={tracks.length}
      itemSize={rowHeight}
      width={width}
    >
      {Row}
    </List>
  );
}
```

**Step 2: Commit**

Run: `git add apps/web/components/search/VirtualTrackList.tsx && git commit -m "feat: add VirtualTrackList component for performance"`

---

### Task B2: Integrate VirtualTrackList in SearchResults

**Files:**
- Modify: `apps/web/components/search/SearchResults.tsx`

**Step 1: Import VirtualTrackList**

Add to imports:
```typescript
import { VirtualTrackList } from "./VirtualTrackList";
```

**Step 2: Update track rendering logic**

Find the track rendering section (around line 300-350) and update:

```typescript
// Before: render all tracks directly
{tracks?.map((track, index) => {
  // ... inline rendering
})}

// After: use virtualization when > 50 tracks
{contentType === "tracks" && tracks && tracks.length > 50 ? (
  <VirtualTrackList
    tracks={tracks}
    height={windowDimensions.height - 200}
    width={windowDimensions.width}
  />
) : contentType === "tracks" ? (
  <div className="border-t border-foreground/10">
    {/* Table header - desktop only */}
    <div className="sticky top-[4.8rem] z-10 hidden lg:block">
      <TableHeader />
    </div>
    <div>
      {tracks?.map((track, index) => {
        // ... existing rendering
      })}
    </div>
  </div>
) : null}
```

**Step 3: Commit**

Run: `git add apps/web/components/search/SearchResults.tsx && git commit -m "feat: add virtualization for large track lists"`

---

## Part C: Memoize Context Selectors

### Task C1: Add useContextSelector Pattern

This is a simpler alternative to splitting the context. We'll add memoization helpers.

**Files:**
- Create: `apps/web/hooks/useContextSelectors.ts`

**Step 1: Write the selector hook**

```typescript
"use client";

import { useContext, useMemo, Context, ReactNode } from "react";

type Selector<T, S> = (state: T) => S;

export function createUseContextSelector<T>(Context: Context<T | null>) {
  return function useContextSelector<S>(selector: Selector<T, S>): S {
    const context = useContext(Context);
    if (!context) {
      throw new Error("useContextSelector must be used within Provider");
    }
    return useMemo(() => selector(context), [selector, context]);
  };
}
```

Actually, AudioPlayerContext already has `usePlaybackState()` and `useQueue()` hooks that do this. Let's verify they're being used properly.

**Step 2: Verify usage**

Search for direct context usage:
```bash
grep -n "useContext(AudioPlayerContext)" apps/web --include="*.tsx" -r
```

If any files import useContext directly instead of using the hooks, update them.

**Step 3: Commit**

Run: `git add apps/web/hooks/useContextSelectors.ts && git commit -m "feat: add context selector pattern (for future use)"`

---

## Summary

| Task | Files Changed | Impact |
|------|--------------|--------|
| Add getCoverUrl to shared | 2 modified | Centralized URL generation |
| Update 10 components | 10 modified | Consistent cover URLs |
| Create VirtualTrackList | 1 created | Track list performance |
| Integrate virtualization | 1 modified | Performance for 50+ tracks |
| Context selectors | 1 created | Future-proofing |
| **Total** | 15 files | Better performance |

**Estimated Impact:**
- Cover URL: Single source of truth, easier to maintain
- Virtualization: Renders only visible tracks instead of all (~50+ items)
- Context: Already has selectors, minor verification needed
