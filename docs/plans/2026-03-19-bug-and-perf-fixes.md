# Bug & Performance Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical/high bugs and performance issues identified in the code review: playlist page takes 29–32s to load, 4Hz re-render storms during playback, AuthContext subscription leak, lyrics triple-fetch, and several medium/low issues.

**Architecture:** Fixes are surgical — no new dependencies, no architectural rewrites. Each task is isolated to one file or a closely related pair of files. Order is from highest-impact to lowest-impact.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase, `useMemo`/`useCallback`/`useRef` patterns.

---

## Task 1: Fix `fetchWithRetry` — add per-attempt timeout (PERF-5)

**Root cause:** `fetchWithRetry` in `packages/shared/api/client.ts` tries 8 instances × 3 retries = 24 sequential HTTP calls with no timeout. A single slow instance blocks for the entire connection duration. All TIDAL playlist SSR pages wait for this.

**Files:**
- Modify: `packages/shared/api/client.ts:59–134`

**Step 1: Add per-attempt `AbortController` with a 5-second timeout**

In `fetchWithRetry`, wrap each individual `fetch()` call with its own `AbortController` that times out after 5 seconds. Merge the per-attempt signal with any caller-supplied `options.signal` using `AbortSignal.any()` (or fall back to the per-attempt signal if the caller didn't provide one).

Replace the inner `fetch` call at line 78:

```ts
// Before (line 78):
const response = await fetch(url, { signal: options.signal });

// After:
const perAttemptController = new AbortController();
const timeoutId = setTimeout(() => perAttemptController.abort(), 5000);

const effectiveSignal = options.signal
  ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any
    ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([options.signal, perAttemptController.signal])
    : perAttemptController.signal
  : perAttemptController.signal;

let response: Response;
try {
  response = await fetch(url, { signal: effectiveSignal });
} finally {
  clearTimeout(timeoutId);
}
```

> Note: `AbortSignal.any()` is available in Node 20+ and all modern browsers. If the runtime doesn't support it, the fallback just uses the per-attempt timeout signal and ignores the caller signal (acceptable since callers currently pass page-level abort signals that are rarely cancelled mid-flight).

**Step 2: Verify TypeScript compiles**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Manually verify**

Start dev server (`bun run dev`) and navigate to a TIDAL playlist page. The page should now render in under 5s (as long as at least one healthy instance exists), instead of 29–32s.

**Step 4: Commit**

```bash
git add packages/shared/api/client.ts
git commit -m "perf: add 5s per-attempt timeout to fetchWithRetry to fix 29s playlist renders"
```

---

## Task 2: Deduplicate `api.getPlaylist` calls per SSR request (BUG-3)

**Root cause:** `page.tsx` calls `api.getPlaylist(playlistId)` once in the page component and once in `generateMetadata`. Both run in parallel during SSR before either populates the in-memory cache.

**Files:**
- Modify: `apps/web/app/playlist/[id]/page.tsx`

**Step 1: Wrap the API call in `React.cache()`**

`React.cache()` deduplicates calls with identical arguments within a single React render tree (i.e., within one SSR request). Import `cache` from React and create a cached wrapper:

```ts
import { cache } from "react";
import { api } from "@/lib/api";

// Deduplicate per-request: generateMetadata and the page component
// will share the same promise for the same playlistId within one SSR render.
const getPlaylistCached = cache((playlistId: string) =>
  api.getPlaylist(playlistId)
);
```

Then replace both calls to `api.getPlaylist(playlistId)` in the file with `getPlaylistCached(playlistId)`.

Full file after edit (`apps/web/app/playlist/[id]/page.tsx`):

```ts
import { cache } from "react";
import { api } from "@/lib/api";
import { PlaylistClient } from "./PlaylistClient";
import { PlaylistClient as LocalPlaylistClient } from "./PlaylistClientLocal";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PlaylistPageProps {
    params: Promise<{ id: string }>;
}

const getPlaylistCached = cache((playlistId: string) =>
    api.getPlaylist(playlistId)
);

export default async function PlaylistPage({ params }: PlaylistPageProps) {
    const { id } = await params;
    const playlistId = decodeURIComponent(id);

    if (playlistId.startsWith("playlist-")) {
        return <LocalPlaylistClient playlistId={playlistId} />;
    }

    try {
        const playlistData = await getPlaylistCached(playlistId);

        if (!playlistData) {
            notFound();
        }

        return <PlaylistClient playlistData={playlistData} />;
    } catch (error) {
        console.error("Failed to load playlist:", error);
        notFound();
    }
}

export async function generateMetadata({
    params,
}: PlaylistPageProps): Promise<Metadata> {
    const { id } = await params;
    const playlistId = decodeURIComponent(id);

    if (playlistId.startsWith("playlist-")) {
        return { title: "My Playlist" };
    }

    try {
        const playlistData = await getPlaylistCached(playlistId);
        return {
            title: `${playlistData.playlist.title} - Playlist`,
            description: `Listen to ${playlistData.playlist.title}`,
        };
    } catch {
        return { title: "Playlist Detail" };
    }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add apps/web/app/playlist/[id]/page.tsx
git commit -m "perf: use React.cache() to deduplicate getPlaylist calls per SSR request"
```

---

## Task 3: Fix `AuthContext` subscription leak (BUG-1)

**Root cause:** `createClient()` is called on every render of `AuthProvider` (line 24). The returned object has a new reference each time, so `useEffect([supabase])` fires on every render, creating a new `onAuthStateChange` subscription and leaking the old one.

**Files:**
- Modify: `apps/web/contexts/AuthContext.tsx`

**Step 1: Stabilise the supabase client with `useMemo`**

Change line 24 from:

```ts
const supabase = createClient();
```

to:

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
const supabase = useMemo(() => createClient(), []);
```

Add `useMemo` to the import from `react` (it's not currently imported there — check line 4 and add it).

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add apps/web/contexts/AuthContext.tsx
git commit -m "fix: stabilise supabase client in AuthContext to prevent subscription leak"
```

---

## Task 4: Fix `AudioPlayerContext` 4Hz re-render storm (PERF-1)

**Root cause:** The `useMemo` at line 690 depends on `state` (the entire state object). `state` updates every `timeupdate` event (~4x/sec) because `handleTimeUpdate` calls `setState`. Every state update invalidates the `useMemo`, causing every context consumer to re-render.

The `usePlaybackState` and `useQueue` selector hooks both call `useContext(AudioPlayerContext)` first — which means they subscribe to all context updates before applying their own `useMemo`. Re-renders still cascade.

**Fix:** Split `AudioPlayerContext` into two contexts:
- `AudioPlayerActionsContext` — stable functions (never changes after mount)
- `AudioPlayerStateContext` — volatile state (currentTime, isPlaying, etc.)

Components that only need actions (like playback controls) won't re-render at 4Hz. Components that need `currentTime` (progress bar, lyrics) will still re-render — that's expected.

**Files:**
- Modify: `apps/web/contexts/AudioPlayerContext.tsx`

**Step 1: Create two contexts instead of one**

At the top of the file (after the imports), replace:

```ts
const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);
```

with:

```ts
// State context — updates on every timeupdate (~4Hz during playback)
const AudioPlayerStateContext = createContext<AudioPlayerContextValue | null>(null);
// Actions context — stable after mount, never triggers re-renders
const AudioPlayerActionsContext = createContext<AudioPlayerContextValue | null>(null);
```

**Step 2: Split the `useMemo` value into state and actions**

Replace the single `value` useMemo (lines 690–734) with two:

```ts
// Stable functions — only change if their own deps change (rare)
const actions = useMemo(
  () => ({
    playTrack,
    addToQueue,
    setQueue,
    reorderQueue,
    play,
    pause,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    clearQueue,
    getAudioElement,
    setIsStatsOpen,
  }),
  [
    playTrack,
    addToQueue,
    setQueue,
    reorderQueue,
    play,
    pause,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    clearQueue,
    getAudioElement,
    setIsStatsOpen,
  ]
);

// Volatile state — changes on every timeupdate during playback
const stateValue = useMemo(
  () => ({
    ...state,
    isStatsOpen,
    ...actions,
  }),
  [state, isStatsOpen, actions]
);
```

**Step 3: Provide both contexts**

Replace:

```tsx
return (
  <AudioPlayerContext.Provider value={value}>
    {children}
  </AudioPlayerContext.Provider>
);
```

with:

```tsx
return (
  <AudioPlayerActionsContext.Provider value={actions as unknown as AudioPlayerContextValue}>
    <AudioPlayerStateContext.Provider value={stateValue}>
      {children}
    </AudioPlayerStateContext.Provider>
  </AudioPlayerActionsContext.Provider>
);
```

**Step 4: Update `useAudioPlayer` hook to read from actions context**

`useAudioPlayer` is used by components that need both actions and state. Keep it reading from the state context (which includes actions via spread):

```ts
export function useAudioPlayer() {
  const context = useContext(AudioPlayerStateContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}
```

For components that only need actions (no re-renders on timeupdate), export a new hook:

```ts
export function useAudioPlayerActions() {
  const context = useContext(AudioPlayerActionsContext);
  if (!context) {
    throw new Error("useAudioPlayerActions must be used within AudioPlayerProvider");
  }
  return context;
}
```

**Step 5: Update `usePlaybackState` and `useQueue` to read from state context**

They already call `useContext(AudioPlayerContext)` — update the context name:

- Replace all `useContext(AudioPlayerContext)` in these two hooks with `useContext(AudioPlayerStateContext)`.

**Step 6: Verify TypeScript compiles and run the app**

```bash
cd apps/web && npx tsc --noEmit
```

Test: open the app, play a track, navigate to a playlist page. The playlist track list should not re-render visibly on every second during playback (open React DevTools Profiler to verify fewer re-renders on the playlist component tree).

**Step 7: Commit**

```bash
git add apps/web/contexts/AudioPlayerContext.tsx
git commit -m "perf: split AudioPlayerContext into state and actions to prevent 4Hz re-render storm"
```

---

## Task 5: Fix `isLiked` O(n) scan — expose a `Set` from PersistenceContext (PERF-2)

**Root cause:** `isLiked(trackId)` in `PersistenceContext` does `data.likedTracks.some(t => t.id === trackId)` — O(n) per call. Playlist pages call this once per track per render. At 4Hz renders with 50+ tracks and 500+ liked tracks = ~100k comparisons/sec.

**Files:**
- Modify: `apps/web/contexts/PersistenceContext.tsx`

**Step 1: Add a memoized `Set` of liked track IDs**

After the `data` state declaration (line 31), add:

```ts
const likedTrackIdSet = useMemo(
  () => new Set(data.likedTracks.map((t) => t.id)),
  [data.likedTracks]
);
```

Import `useMemo` if not already imported (it's not on line 3 — add it).

**Step 2: Update `isLiked` to use the Set**

Change `isLiked` (lines 112–114) from:

```ts
const isLiked = useCallback((trackId: number) => {
    return data.likedTracks.some((t) => t.id === trackId);
}, [data.likedTracks]);
```

to:

```ts
const isLiked = useCallback((trackId: number) => {
    return likedTrackIdSet.has(trackId);
}, [likedTrackIdSet]);
```

**Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/web/contexts/PersistenceContext.tsx
git commit -m "perf: use Set for O(1) isLiked lookup instead of O(n) array scan"
```

---

## Task 6: Fix progress bar 300-node re-render (PERF-3)

**Root cause:** The progress bar in `AudioPlayer.tsx` creates 300 `<div>` elements in JSX. On every `timeupdate` event (~4Hz), `currentSegment` changes and all 300 elements are diffed/re-evaluated.

**Fix:** Replace the 300-node array with a single `<div>` using a CSS `width` inline style driven imperatively via a `useRef` + `useEffect`. This bypasses React reconciliation entirely for progress updates.

**Files:**
- Modify: `apps/web/components/player/AudioPlayer.tsx`

**Step 1: Remove the 300-segment array and replace with a single bar**

Remove `const SEGMENT_COUNT = 300` at line 79. Remove `currentSegment` useMemo (lines 120–123). Add a ref for the fill bar:

```ts
const progressFillRef = useRef<HTMLDivElement>(null);
```

**Step 2: Update progress width imperatively**

Add a `useEffect` that directly sets the `style.width` of the fill div without triggering a React render:

```ts
useEffect(() => {
  if (progressFillRef.current) {
    const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
    progressFillRef.current.style.width = `${pct}%`;
  }
}, [currentTime, duration]);
```

**Step 3: Replace the segment JSX with a simple two-layer bar**

Replace the entire `{Array.from({ length: SEGMENT_COUNT }).map(...)}` block (lines 200–212) with:

```tsx
<div className="relative h-full w-full bg-foreground/15">
  <div
    ref={progressFillRef}
    className="absolute inset-y-0 left-0 bg-foreground pointer-events-none"
    style={{ width: "0%" }}
  />
</div>
```

Keep the hover/click handlers on the outer `progressBarRef` div as-is — they still work with a percentage-based layout. Update `handleSegmentClick` and `handleSegmentInteraction` to compute seek time from the mouse X position as a fraction of the bar width (they already do this via `rect.width`, so no change needed — just remove references to `SEGMENT_COUNT`).

Also remove `hoverSegment` state and related handlers (`setHoverSegment`, `handleProgressMouseMove`, `handleProgressMouseLeave`) if the new design doesn't need hover highlighting, or simplify to a single CSS `:hover` pseudo-class.

**Step 4: Verify TypeScript compiles and visually test**

```bash
cd apps/web && npx tsc --noEmit
```

Play a track and verify the progress bar moves smoothly.

**Step 5: Commit**

```bash
git add apps/web/components/player/AudioPlayer.tsx
git commit -m "perf: replace 300-segment progress bar with single CSS-width div to eliminate 4Hz reconciliation"
```

---

## Task 7: Debounce `PersistenceContext` storage saves (PERF-4)

**Root cause:** `storage.save(data)` is called synchronously in a `useEffect` on every `data` change. `data` changes on every `addToHistory` call (every track play), and `storage.save` calls `JSON.stringify` over the entire library — potentially hundreds of KB — on the main thread with no debounce.

**Files:**
- Modify: `apps/web/contexts/PersistenceContext.tsx`

**Step 1: Add a debounce timer ref**

After the `syncTimeoutRef` declaration (line 35), add:

```ts
const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
```

**Step 2: Debounce the save effect**

Replace the save `useEffect` (lines 47–51):

```ts
// Before:
useEffect(() => {
    if (isLoaded) {
        storage.save(data);
    }
}, [data, isLoaded]);
```

with:

```ts
useEffect(() => {
    if (!isLoaded) return;

    if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
        storage.save(data);
    }, 500);

    return () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
    };
}, [data, isLoaded]);
```

**Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/web/contexts/PersistenceContext.tsx
git commit -m "perf: debounce PersistenceContext storage saves by 500ms to reduce main-thread JSON serialisation"
```

---

## Task 8: Fix lyrics triple-fetch — lift `useLyrics` into a shared context (LYRIC-TRIPLE)

**Root cause:** `useLyrics` is called independently in both `AudioPlayer.tsx` (line 118) and `FullscreenPlayer.tsx` (line 261). Both fire `api.fetchLyrics()` concurrently on track change. The in-memory `lyricsCache` is only set after the first `await` resolves — so both callers miss the cache and fire separate HTTP requests.

**Fix:** Call `useLyrics` once at the `AudioPlayerProvider` level (or a thin `LyricsContext`), store the result in `AudioPlayerStateContext`, and have `AudioPlayer` and `FullscreenPlayer` read from context instead of calling the hook independently.

**Files:**
- Modify: `apps/web/contexts/AudioPlayerContext.tsx`
- Modify: `apps/web/components/player/AudioPlayer.tsx`
- Modify: `apps/web/components/player/FullscreenPlayer.tsx`

**Step 1: Add lyrics fields to `AudioPlayerContextValue` type**

In `apps/web/lib/audioPlayerTypes.ts` (or wherever `AudioPlayerContextValue` is defined), add:

```ts
import type { LyricsData } from "./api/types";

// Add to AudioPlayerContextValue:
lyrics: LyricsData | null;
currentLineIndex: number;
isLoadingLyrics: boolean;
lyricsError: string | null;
hasLyrics: boolean;
hasSyncedLyrics: boolean;
```

**Step 2: Call `useLyrics` inside `AudioPlayerProvider`**

At the top of `AudioPlayerProvider` (after the `state` declaration), add:

```ts
import { useLyrics } from "@/hooks/useLyrics";

// Inside AudioPlayerProvider:
const {
  lyrics,
  currentLineIndex,
  isLoading: isLoadingLyrics,
  error: lyricsError,
  hasLyrics,
  hasSyncedLyrics,
} = useLyrics(state.currentTrack, state.currentTime, state.isPlaying);
```

**Step 3: Include lyrics fields in the `stateValue` useMemo**

In the `stateValue` useMemo (from Task 4), add all the lyrics fields:

```ts
const stateValue = useMemo(
  () => ({
    ...state,
    isStatsOpen,
    lyrics,
    currentLineIndex,
    isLoadingLyrics,
    lyricsError,
    hasLyrics,
    hasSyncedLyrics,
    ...actions,
  }),
  [state, isStatsOpen, lyrics, currentLineIndex, isLoadingLyrics, lyricsError, hasLyrics, hasSyncedLyrics, actions]
);
```

**Step 4: Remove `useLyrics` from `AudioPlayer.tsx`**

Remove the `useLyrics` import and call (lines 75, 112–118). Instead, destructure lyrics from `useAudioPlayer()` or `usePlaybackState()`:

```ts
// Replace:
const { lyrics, currentLineIndex, isLoading: lyricsLoading, error: lyricsError, hasLyrics } = useLyrics(currentTrack, currentTime, isPlaying);

// With:
const { lyrics, currentLineIndex, isLoadingLyrics: lyricsLoading, lyricsError, hasLyrics } = useAudioPlayer();
```

**Step 5: Remove `useLyrics` from `FullscreenPlayer.tsx`**

Remove the `useLyrics` import and call (lines 31, 256–261). Read from context instead:

```ts
// Remove: import { useLyrics } from "@/hooks/useLyrics";
// Remove: const { lyrics, currentLineIndex, isLoading: lyricsLoading, hasLyrics } = useLyrics(currentTrack, currentTime, isPlaying);

// Add:
const { lyrics, currentLineIndex, isLoadingLyrics: lyricsLoading, hasLyrics } = useAudioPlayer();
```

**Step 6: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Fix any type errors (e.g., `AudioPlayerContextValue` not including the new fields).

**Step 7: Commit**

```bash
git add apps/web/contexts/AudioPlayerContext.tsx apps/web/components/player/AudioPlayer.tsx apps/web/components/player/FullscreenPlayer.tsx apps/web/lib/audioPlayerTypes.ts
git commit -m "fix: lift useLyrics into AudioPlayerContext to prevent duplicate parallel lyrics fetches"
```

---

## Task 9: Fix `PlaylistClientLocal` re-render loop on `getPlaylist` identity change (BUG-2)

**Root cause:** `getPlaylist` is a `useCallback` with `[data.playlists]` as its dependency. Every time `data` changes (e.g., `addToHistory` during playback), `getPlaylist` gets a new reference. `PlaylistClientLocal.tsx` has `getPlaylist` in its `useEffect` dependency array (line 50), so it calls `setPlaylist` on every data mutation — an avoidable re-render loop.

**Fix:** Remove `getPlaylist` from the `useEffect` dependency array and use a ref pattern to get the latest value without re-running the effect.

**Files:**
- Modify: `apps/web/app/playlist/[id]/PlaylistClientLocal.tsx`

**Step 1: Use `useRef` to hold the latest `getPlaylist`**

```ts
const getPlaylistRef = useRef(getPlaylist);
useEffect(() => {
    getPlaylistRef.current = getPlaylist;
});

useEffect(() => {
    // Only re-run when playlistId changes, not when getPlaylist identity changes
    const refreshedPlaylist = getPlaylistRef.current(playlistId);
    if (refreshedPlaylist) {
        setPlaylist(refreshedPlaylist);
    }
}, [playlistId]); // removed getPlaylist from deps
```

The `getPlaylistRef` update effect runs on every render (no deps array), keeping the ref current without causing new effect runs.

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/app/playlist/[id]/PlaylistClientLocal.tsx
git commit -m "fix: remove getPlaylist from useEffect deps in PlaylistClientLocal to prevent re-render loop"
```

---

## Task 10: Fix `sync.ts` duplicate favorite rows (BUG-4)

**Root cause:** `syncToCloud` at `apps/web/lib/db/sync.ts:146` generates `crypto.randomUUID()` as the `id` for each favorite row on every sync run. The upsert conflict key is `user_id,type,item_id`, so it correctly avoids duplicates at the DB level — but the column being used for the `id` is a random UUID each time, and if the upsert tries to insert a new row (on first sync) vs update (subsequent syncs), Postgres may insert new rows because the `id` doesn't match any existing row.

The safest fix is to remove the `id` field entirely from the inserted rows and let the DB auto-generate it, or generate a deterministic ID. Since the conflict key is `user_id,type,item_id`, the simplest fix is to drop the `id` field from the favorites upsert and rely on the DB default.

**Files:**
- Modify: `apps/web/lib/db/sync.ts`

**Step 1: Remove `id` from `favoriteRows`**

Change lines 145–152:

```ts
// Before:
const favoriteRows = localData.likedTracks.map((track: Track) => ({
  id: crypto.randomUUID(),
  user_id: user.id,
  type: 'track' as const,
  item_id: String(track.id),
  item_data: track as unknown as Record<string, unknown>,
  created_at: new Date().toISOString(),
}));

// After:
const favoriteRows = localData.likedTracks.map((track: Track) => ({
  user_id: user.id,
  type: 'track' as const,
  item_id: String(track.id),
  item_data: track as unknown as Record<string, unknown>,
  created_at: new Date().toISOString(),
}));
```

> If the Supabase `favorites` table requires `id` as a NOT NULL column without a default, you'll need to either add a `DEFAULT gen_random_uuid()` to the column in the DB schema, or use a deterministic ID: `id: \`${user.id}:track:${track.id}\`` (deterministic string). Check the DB schema first.

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/lib/db/sync.ts
git commit -m "fix: remove random UUID from favorites upsert to prevent duplicate rows on repeated syncs"
```

---

## Task 11: Add HTTP caching headers to lyrics API route (PERF-9)

**Root cause:** `apps/web/app/api/lyrics/route.ts` proxies the external lyrics service but sets no `Cache-Control` headers. Next.js doesn't cache App Router route handlers by default. Every lyrics request goes to the external service.

**Fix:** Add `Cache-Control: public, max-age=86400, stale-while-revalidate=3600` — lyrics for a given track don't change, so a 24-hour browser/CDN cache is appropriate.

**Files:**
- Modify: `apps/web/app/api/lyrics/route.ts`

**Step 1: Return headers on the success response**

Replace:

```ts
return NextResponse.json(data);
```

with:

```ts
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
  },
});
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/app/api/lyrics/route.ts
git commit -m "perf: add 24h Cache-Control header to lyrics API route"
```

---

## Task 12: Fix `SearchContext` double `getInitialState()` call (PERF-6)

**Root cause:** `apps/web/contexts/SearchContext.tsx` lines 49–52 call `getInitialState()` twice — once per `useState` initializer — meaning `localStorage` is parsed twice on mount.

**Files:**
- Modify: `apps/web/contexts/SearchContext.tsx`

**Step 1: Call `getInitialState()` once**

Replace lines 49–52:

```ts
// Before:
const [query, setQueryState] = useState(() => getInitialState().query);
const [currentTab, setCurrentTabState] = useState<SearchContentType>(
    () => getInitialState().currentTab
);

// After:
const [{ query: initialQuery, currentTab: initialTab }] = useState(getInitialState);
const [query, setQueryState] = useState(initialQuery);
const [currentTab, setCurrentTabState] = useState<SearchContentType>(initialTab);
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/contexts/SearchContext.tsx
git commit -m "perf: call getInitialState once instead of twice in SearchContext"
```

---

## Task 13: Fix `FullscreenPlayer` unmemoized `getCoverUrlFn` (PERF-8)

**Root cause:** `getCoverUrlFn` in `FullscreenPlayer.tsx` (line 321) is a plain arrow function recreated on every render, unlike the equivalent in `AudioPlayer.tsx` which uses `useCallback`.

**Files:**
- Modify: `apps/web/components/player/FullscreenPlayer.tsx`

**Step 1: Wrap in `useCallback`**

Change line 321–325:

```ts
// Before:
const getCoverUrlFn = () => {
    const coverId = currentTrack?.album?.cover || currentTrack?.album?.id;
    if (!coverId) return null;
    return getCoverUrl(coverId, "640");
};

// After:
const getCoverUrlFn = useCallback(() => {
    const coverId = currentTrack?.album?.cover || currentTrack?.album?.id;
    if (!coverId) return null;
    return getCoverUrl(coverId, "640");
}, [currentTrack]);
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/components/player/FullscreenPlayer.tsx
git commit -m "perf: memoize getCoverUrlFn in FullscreenPlayer with useCallback"
```

---

## Task 14: Remove dead `useLyrics` imports (BUG-6, BUG-7)

**Files:**
- Modify: `apps/web/components/player/FullscreenLyrics.tsx` (remove unused import on line 6)
- Modify: `apps/web/components/player/LyricsPanel.tsx` (remove unused import on line 5)

> Note: After Task 8, `FullscreenPlayer.tsx` also loses its `useLyrics` import — that will be handled in Task 8's commit.

**Step 1: Remove the imports**

In `FullscreenLyrics.tsx`, remove:
```ts
import { useLyrics } from "@/hooks/useLyrics";
```

In `LyricsPanel.tsx`, remove:
```ts
import { useLyrics } from "@/hooks/useLyrics";
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/components/player/FullscreenLyrics.tsx apps/web/components/player/LyricsPanel.tsx
git commit -m "chore: remove dead useLyrics imports from FullscreenLyrics and LyricsPanel"
```

---

## Task 15: Final full build verification

**Step 1: Run full TypeScript check across the monorepo**

```bash
bun run build
```

Expected: clean build, zero TypeScript errors.

**Step 2: Smoke test in dev**

```bash
bun run dev
```

- Navigate to a TIDAL playlist page → should load in < 5s
- Play a track → playlist track list should not visibly re-render on each tick
- Change tracks → lyrics should appear after one request (check Network tab: only one `/api/lyrics` request per track)
- Open Settings → sync should work without multiple triggers
- Log out and log in → auth subscription should not leak (check console for duplicate log messages)

**Step 3: Commit if any loose changes remain**

```bash
git status
# commit any remaining changes
```

---

## Summary of Changes

| Task | File(s) | Fixes |
|---|---|---|
| 1 | `packages/shared/api/client.ts` | Per-attempt 5s timeout → fixes 29s playlist renders |
| 2 | `apps/web/app/playlist/[id]/page.tsx` | `React.cache()` dedup → half the SSR API calls |
| 3 | `apps/web/contexts/AuthContext.tsx` | `useMemo` client → no subscription leak |
| 4 | `apps/web/contexts/AudioPlayerContext.tsx` | Split state/actions context → no 4Hz cascade |
| 5 | `apps/web/contexts/PersistenceContext.tsx` | `Set` for `isLiked` → O(1) lookup |
| 6 | `apps/web/components/player/AudioPlayer.tsx` | Single-div progress bar → no 300-node diff |
| 7 | `apps/web/contexts/PersistenceContext.tsx` | 500ms debounce on save → less main-thread work |
| 8 | `AudioPlayerContext.tsx`, `AudioPlayer.tsx`, `FullscreenPlayer.tsx` | Single `useLyrics` call → no triple-fetch |
| 9 | `PlaylistClientLocal.tsx` | Ref pattern → no re-render loop |
| 10 | `apps/web/lib/db/sync.ts` | No random UUID → no duplicate DB rows |
| 11 | `apps/web/app/api/lyrics/route.ts` | Cache headers → lyrics served from cache |
| 12 | `apps/web/contexts/SearchContext.tsx` | Single `getInitialState()` call |
| 13 | `apps/web/components/player/FullscreenPlayer.tsx` | `useCallback` on `getCoverUrlFn` |
| 14 | `FullscreenLyrics.tsx`, `LyricsPanel.tsx` | Remove dead imports |
| 15 | All | Final build + smoke test |
