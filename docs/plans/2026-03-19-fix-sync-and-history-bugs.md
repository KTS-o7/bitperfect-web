# Fix Sync and History Duplication Bugs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two root-cause bugs: (1) sync writes directly to localStorage bypassing PersistenceContext in-memory state, causing stale overwrites and apparent duplication; (2) `useSync` triggers multiple times because `lastSync` is ephemeral component state that resets on remount.

**Architecture:**
- Add a `reloadFromStorage()` function to `PersistenceContext` so sync can signal the context to re-read from localStorage after writing, keeping in-memory state consistent.
- Persist `lastSync` timestamp to localStorage so it survives remounts, and fix the `useSync` effect dependency array to stop stale-closure re-triggers.

**Tech Stack:** Next.js 14 App Router, React Context, TypeScript, localStorage, Supabase

---

### Task 1: Add `reloadFromStorage` to PersistenceContext

**Problem:** `sync.ts:94` calls `storage.save(mergedData)` directly, bypassing PersistenceContext. The context's in-memory `data` state becomes stale. When the context next writes (e.g. user plays a track, triggering `addToHistory`), it overwrites localStorage with its stale in-memory copy — losing or duplicating synced data.

**Fix:** Expose a `reloadFromStorage()` function from `PersistenceContext` that re-calls `storage.load()` and updates the in-memory `data` state.

**Files:**
- Modify: `apps/web/contexts/PersistenceContext.tsx`

**Step 1: Add `reloadFromStorage` to the context interface**

In `PersistenceContext.tsx`, add `reloadFromStorage: () => void` to `PersistenceContextType` (line 10-25):

```ts
interface PersistenceContextType extends UserData {
    // ...existing fields...
    reloadFromStorage: () => void;
}
```

**Step 2: Implement the function inside `PersistenceProvider`**

After the `clearAll` callback (around line 105), add:

```ts
const reloadFromStorage = useCallback(() => {
    setData(storage.load());
}, []);
```

**Step 3: Expose it in the context value**

In the `PersistenceContext.Provider` value prop, add `reloadFromStorage` to the spread:

```tsx
<PersistenceContext.Provider
    value={{
        ...data,
        toggleLikeTrack,
        addToHistory,
        toggleSaveAlbum,
        updateSettings,
        clearAll,
        reloadFromStorage,   // <-- add this
        isLiked,
        // ...rest unchanged
    }}
>
```

**Step 4: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors related to `PersistenceContextType`

---

### Task 2: Call `reloadFromStorage` after sync completes

**Problem:** `performSync` in `sync.ts` calls `syncFromCloud` which writes merged data to localStorage (`sync.ts:94`). After this, the React context is stale and doesn't know about the new data. We need to reload the context after sync.

**Files:**
- Modify: `apps/web/hooks/useSync.ts`
- Modify: `apps/web/contexts/PersistenceContext.tsx` (already done in Task 1)

**Step 1: Import `usePersistence` in `useSync.ts`**

At the top of `useSync.ts`, add:

```ts
import { usePersistence } from '@/contexts/PersistenceContext';
```

**Step 2: Call `reloadFromStorage` after a successful sync**

Inside `triggerSync`, after `setLastSync(new Date())` (currently line 31), call `reloadFromStorage()`:

```ts
const triggerSync = useCallback(async () => {
  if (!isAuthenticated) return;

  setIsSyncing(true);
  setSyncError(null);

  try {
    const result = await performSync();
    
    if (!result.success) {
      setSyncError(result.message);
    } else {
      setLastSync(new Date());
      reloadFromStorage();  // <-- reload context state from localStorage
    }
  } catch (error) {
    setSyncError(error instanceof Error ? error.message : 'Sync failed');
  } finally {
    setIsSyncing(false);
  }
}, [isAuthenticated, reloadFromStorage]);
```

Note: `reloadFromStorage` must be added to the `useCallback` dep array.

**Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

---

### Task 3: Persist `lastSync` to localStorage to prevent re-trigger on remount

**Problem:** `useSync.ts:16` — `lastSync` is `useState(null)`. When `SettingsClient` (the only component that uses `useSync`) unmounts (user navigates away) and remounts (user returns to settings), `lastSync` resets to `null`. The `useEffect` at line 40-44 fires again because `!lastSync` is true, triggering another full sync.

**Fix:** Persist `lastSync` to `localStorage` so it survives remounts. Use a small localStorage key `sync-last-sync`.

**Files:**
- Modify: `apps/web/hooks/useSync.ts`

**Step 1: Replace the `lastSync` useState with a localStorage-backed initializer**

```ts
const LAST_SYNC_KEY = 'bitperfect-last-sync';

export function useSync(): UseSyncReturn {
  const { isAuthenticated } = useAuth();
  const { reloadFromStorage } = usePersistence();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? new Date(stored) : null;
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  // ...
```

**Step 2: Persist `lastSync` when it is updated**

Replace `setLastSync(new Date())` with a helper that also saves to localStorage:

```ts
const markSyncComplete = useCallback(() => {
  const now = new Date();
  setLastSync(now);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
  }
}, []);
```

Then use `markSyncComplete()` instead of `setLastSync(new Date())` in `triggerSync`.

**Step 3: Fix the `useEffect` dependency array — remove `triggerSync` to prevent stale closure re-triggers**

The current effect:
```ts
useEffect(() => {
  if (isAuthenticated && !lastSync) {
    triggerSync();
  }
}, [isAuthenticated, lastSync, triggerSync]);
```

`triggerSync` is in deps because it's a `useCallback`. When `isAuthenticated` changes (auth resolves), `triggerSync` gets a new identity, which re-fires the effect even if `lastSync` is set. Use a ref to hold the stable trigger:

```ts
const triggerSyncRef = useRef(triggerSync);
useEffect(() => {
  triggerSyncRef.current = triggerSync;
}, [triggerSync]);

useEffect(() => {
  if (isAuthenticated && !lastSync) {
    triggerSyncRef.current();
  }
}, [isAuthenticated, lastSync]); // triggerSync removed from deps
```

**Step 4: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

---

### Task 4: Fix the double `addToHistory` call in `setQueue`

**Problem:** When `setQueue` is called (e.g. clicking Play on an album), the track is added to history twice:
- Once inside the `setQueue` async IIFE at `AudioPlayerContext.tsx:392` (`addToHistory(track)`)
- And separately, `playTrack` (line 262) also calls `addToHistory(track)` — but `playTrack` is a separate entrypoint, so these two paths don't always conflict

The actual double-add in `setQueue` is within itself: `addToHistory` is called at line 392 inside the async IIFE. The `addToHistory` in `PersistenceContext` does deduplicate by id (`filtered = prev.history.filter(t => t.id !== track.id)`), so the track won't appear twice in the array. However, `setQueue` missing `addToHistory` in its `useCallback` deps array means it captures a stale closure.

**Real issue to fix:** `setQueue` at line 359-408 has `[safePlay]` as its dependency array, but it calls `addToHistory` which is not in the deps. If `addToHistory` ever gets a new reference (it's stable via `useCallback([], [])` so this is low risk), `setQueue` would use a stale version. Add `addToHistory` to the deps array.

Similarly, `playNext` (line 474 deps: `[safePlay]`) and `playPrev` (line 542 deps: `[safePlay]`) both call `addToHistory` inside their async IIFEs but don't list it in deps. Add it.

**Files:**
- Modify: `apps/web/contexts/AudioPlayerContext.tsx`

**Step 1: Add `addToHistory` to `setQueue` dependency array**

Change line 407:
```ts
// Before
  [safePlay]
// After
  [safePlay, addToHistory]
```

**Step 2: Add `addToHistory` to `playNext` dependency array**

Change line 474:
```ts
// Before
  }, [safePlay]);
// After
  }, [safePlay, addToHistory]);
```

**Step 3: Add `addToHistory` to `playPrev` dependency array**

Change line 542:
```ts
// Before
  }, [safePlay]);
// After
  }, [safePlay, addToHistory]);
```

**Step 4: Verify TypeScript compiles and no lint errors**

```bash
cd apps/web && npx tsc --noEmit
```

---

### Task 5: Final verification — build and manual test checklist

**Step 1: Run full TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors

**Step 2: Run existing tests**

```bash
cd apps/web && npx vitest run
```
(or `npm test` / `pnpm test` — check package.json for the exact command)
Expected: all pass

**Step 3: Build**

```bash
cd /Users/kts/Documents/side-projects/bitperfect-web && pnpm build
```
Expected: successful build with no errors

**Manual test checklist (in browser):**

1. Log in → go to Settings → observe sync fires once, history shows correct tracks
2. Navigate away from Settings → navigate back → sync must NOT fire again (lastSync persisted)
3. Play several tracks → check History tab → each track should appear exactly once
4. Trigger manual sync → History must still show correct data (not overwritten by stale state)
5. Log out → log back in → sync fires once → History and Liked Tracks correct

**Step 4: Commit**

```bash
git add apps/web/contexts/PersistenceContext.tsx apps/web/hooks/useSync.ts apps/web/contexts/AudioPlayerContext.tsx
git commit -m "fix: reload context after sync and prevent multiple sync triggers on remount"
```
