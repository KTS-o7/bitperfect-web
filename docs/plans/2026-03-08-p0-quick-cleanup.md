# P0 - Quick Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove dead code, fix TypeScript `any` usage, and remove commented-out code.

**Architecture:** Straightforward deletions and type fixes - no complex refactoring.

**Tech Stack:** TypeScript, ESLint

---

### Task 1: Delete Dead Context Files

**Files:**
- Delete: `apps/web/contexts/PlaybackStateContext.tsx`
- Delete: `apps/web/contexts/QueueContext.tsx`

**Step 1: Verify these files are unused**

Run: `grep -r "PlaybackStateContext\|QueueContext" apps/web --include="*.tsx" --include="*.ts" | grep -v "contexts/PlaybackStateContext.tsx\|contexts/QueueContext.tsx"`

Expected: No matches (files are imported nowhere)

**Step 2: Delete the files**

Run: `rm apps/web/contexts/PlaybackStateContext.tsx apps/web/contexts/QueueContext.tsx`

**Step 3: Commit**

Run: `git add -A && git commit -m "refactor: remove dead PlaybackStateContext and QueueContext"`

---

### Task 2: Fix TypeScript `any` in SearchResults.tsx

**Files:**
- Modify: `apps/web/components/search/SearchResults.tsx:161`

**Step 1: Identify the issue**

Line 161 has: `icon: any`

**Step 2: Fix the type**

Replace line 161:
```typescript
// Before:
const allTabs: { id: SearchContentType; label: string; icon: any }[] = [

// After:
const allTabs: { id: SearchContentType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
```

Or better, import LucideIcon type:
```typescript
import { Search, Music2, Disc, Users, ListMusic, Loader2, LucideIcon } from "lucide-react";

// Then:
const allTabs: { id: SearchContentType; label: string; icon: LucideIcon }[] = [
```

**Step 3: Commit**

Run: `git add apps/web/components/search/SearchResults.tsx && git commit -m "fix: add proper type for tab icons in SearchResults"`

---

### Task 3: Fix TypeScript `any` in useSearch.ts

**Files:**
- Modify: `apps/web/hooks/useSearch.ts:139`

**Step 1: Identify the issue**

Line 139 has: `}) as any,`

**Step 2: Fix the type**

Replace lines 131-141 with proper type:
```typescript
// Before:
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

// After:
queryClient.prefetchInfiniteQuery({
  queryKey,
  queryFn: async ({ pageParam = 0 }) => {
    if (tab === "tracks") {
      return api.searchTracks(query, { offset: pageParam, limit: 25 });
    } else if (tab === "albums") {
      return api.searchAlbums(query, { offset: pageParam, limit: 25 });
    } else {
      return api.searchArtists(query, { offset: pageParam, limit: 25 });
    }
  },
  initialPageParam: 0,
});
```

**Step 3: Commit**

Run: `git add apps/web/hooks/useSearch.ts && git commit -m "fix: remove as any cast in useSearch prefetchTab"`

---

### Task 4: Fix TypeScript `any` in performance.ts

**Files:**
- Modify: `apps/web/lib/performance.ts`

**Step 1: Identify the issues**

- Line 4: `(...args: any[]) => void;`
- Line 8: `export function reportWebVitals(metric: any)`

**Step 2: Fix the types**

Replace the entire file:
```typescript
// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
}

export function reportWebVitals(metric: WebVitalsMetric) {
  if (process.env.NODE_ENV === "development") {
    return;
  }

  // Send to analytics in production
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

export function measurePageLoad() {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    const perfData = window.performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    const metrics = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ttfb: perfData.responseStart - perfData.requestStart,
      download: perfData.responseEnd - perfData.responseStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
      domComplete: perfData.domComplete - perfData.fetchStart,
      loadComplete: perfData.loadEventEnd - perfData.fetchStart,
    };
  });
}
```

**Step 3: Commit**

Run: `git add apps/web/lib/performance.ts && git commit -m "fix: add proper types in performance.ts"`

---

### Task 5: Fix TypeScript `any` in usePWAInstall.ts

**Files:**
- Modify: `apps/web/hooks/usePWAInstall.ts:37,48,88`

**Step 1: Identify the issues**

- Line 37: `(window.navigator as any).standalone === true`
- Line 48: `(window.navigator as any).standalone === true`
- Line 88: `(window.navigator as any).standalone === true`

**Step 2: Fix the types**

Add proper type declaration at the top of the file after the existing `declare global`:

```typescript
// Add to the existing declare global block:
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}
```

Then remove the `(window.navigator as any)` casts:
- Line 37: `window.navigator.standalone === true`
- Line 48: `window.navigator.standalone === true`
- Line 88: `window.navigator.standalone === true`

**Step 3: Commit**

Run: `git add apps/web/hooks/usePWAInstall.ts && git commit -m "fix: add Navigator.standalone type in usePWAInstall"`

---

### Task 6: Remove Commented Dead Code in SearchResults.tsx

**Files:**
- Modify: `apps/web/components/search/SearchResults.tsx`

**Step 1: Identify commented code**

- Lines 99-106: Disabled infinite scroll observer
- Lines 132-158: Disabled IntersectionObserver code
- Lines 386-401: Disabled infinite scroll loading indicator and observer target

**Step 2: Remove commented code**

Remove lines 99-158 (the entire disabled infinite scroll section including the ref):
```typescript
// DELETE THIS SECTION (lines 99-158):
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
```

And remove lines 386-401:
```typescript
// DELETE THIS SECTION:
// DISABLED: Infinite Scroll Loading Indicator
// {isFetchingMore && (
//     <motion.div
//      initial={{ opacity: 0 }}
//      animate={{ opacity: 1 }}
//      className="flex items-center justify-center py-8 mt-4"
//     >
//      <div className="flex items-center gap-3 text-foreground/40">
//       <Loader2 className="w-5 h-5 animate-spin" />
//       <span className="text-sm font-medium">Loading more...</span>
//      </div>
//     </motion.div>
//    )}

// DISABLED: Intersection Observer Target
// <div ref={observerTarget} className="h-4" />
```

**Step 3: Commit**

Run: `git add apps/web/components/search/SearchResults.tsx && git commit -m "refactor: remove commented dead code from SearchResults"`

---

### Task 7: Verify Build Passes

**Step 1: Run build**

Run: `bun run build:web`

Expected: Build completes without errors

**Step 2: Commit any fixes if needed**

---

### Summary

| Task | Files Changed | Lines Removed |
|------|--------------|---------------|
| Delete dead contexts | 2 deleted | ~216 |
| Fix SearchResults types | 1 | ~0 |
| Fix useSearch types | 1 | ~0 |
| Fix performance types | 1 | ~0 |
| Fix usePWAInstall types | 1 | ~0 |
| Remove commented code | 1 | ~75 |
| **Total** | 5 files modified, 2 deleted | ~291 lines |
