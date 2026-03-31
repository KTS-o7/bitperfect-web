# Fix Supabase Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix history sync (currently never synced), fix delete propagation for likes and playlists (currently additive-only, deletions never reach Supabase), and update stale type definitions.

**Architecture:** All data lives in `localStorage` (via `lib/storage.ts`). Supabase is a secondary sync target. Sync is manual-only (triggered on login/logout or "Sync Now" button). The core sync logic lives in `lib/db/sync.ts` — `syncToCloud` writes to Supabase, `syncFromCloud` reads from Supabase and merges into local. The merge functions are currently union-only (additive), which means local deletions are silently resurrected on next sync.

**Tech Stack:** Next.js 14, TypeScript, Supabase JS client (`@supabase/supabase-js`), vitest for tests. Monorepo managed with Turborepo + bun.

**Working directory for all tasks:** `/Users/kts/Documents/side-projects/bitperfect-web/.worktrees/fix-sync`

**Run tests with:** `cd apps/web && bun run test`

---

## Task 1: Add listening_history table migration

**Files:**
- Create: `supabase/migrations/003_listening_history.sql`

**What to do:**

Create a new SQL migration file that adds a `listening_history` table to Supabase. This table will store the user's listening history so it can sync across devices.

**Step 1: Create the migration file**

```sql
-- supabase/migrations/003_listening_history.sql

-- Listening history table
CREATE TABLE IF NOT EXISTS public.listening_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  track_id TEXT NOT NULL,
  track_data JSONB NOT NULL,
  listened_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own history" ON public.listening_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.listening_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history" ON public.listening_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" ON public.listening_history
  FOR DELETE USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/003_listening_history.sql
git commit -m "feat: add listening_history table migration"
```

> **Note for developer:** Apply this migration by pasting the SQL into Supabase Dashboard → SQL Editor and running it, or via `supabase db push` if CLI is configured.

---

## Task 2: Update database.types.ts

**Files:**
- Modify: `apps/web/lib/supabase/database.types.ts`

**What to do:**

The `database.types.ts` file is stale. It's missing:
1. The `tracks_data` column on `playlists` (added in migration 002)
2. The new `listening_history` table (added in Task 1)

**Step 1: Add `tracks_data` to the playlists type**

In the `playlists` table definition, add `tracks_data` to Row, Insert, and Update:

```typescript
// Row:
tracks_data: Json | null

// Insert:
tracks_data?: Json | null

// Update:
tracks_data?: Json | null
```

**Step 2: Add the `listening_history` table type**

Add a new table entry after `user_settings`:

```typescript
listening_history: {
  Row: {
    id: string
    user_id: string
    track_id: string
    track_data: Json
    listened_at: string
  }
  Insert: {
    id?: string
    user_id: string
    track_id: string
    track_data: Json
    listened_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    track_id?: string
    track_data?: Json
    listened_at?: string
  }
}
```

**Step 3: No test needed** (type-only file, TypeScript compilation is sufficient)

**Step 4: Commit**

```bash
git add apps/web/lib/supabase/database.types.ts
git commit -m "feat: update database types with tracks_data and listening_history"
```

---

## Task 3: Fix sync.ts — add history sync + fix delete propagation

This is the core task. Three bugs to fix in `apps/web/lib/db/sync.ts`:

**Bug A:** `syncToCloud` never writes history to Supabase.
**Bug B:** `syncFromCloud` never reads history from Supabase.
**Bug C:** `syncToCloud` never deletes removed likes/playlists/albums from Supabase — it only upserts. Deletions made locally are resurrected on next sync because the cloud still has the old rows and the merge is additive-only.

**Files:**
- Modify: `apps/web/lib/db/sync.ts`

### Fix A+B: History sync

**In `syncFromCloud`:**

Add `listening_history` to the parallel fetch:

```typescript
const [playlistsResult, favoritesResult, settingsResult, historyResult] = await Promise.all([
  supabase.from('playlists').select('*').eq('user_id', user.id),
  supabase.from('favorites').select('*').eq('user_id', user.id),
  supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
  supabase.from('listening_history').select('*').eq('user_id', user.id).order('listened_at', { ascending: false }).limit(100),
]);
```

Add a `DbHistoryEntry` interface:

```typescript
interface DbHistoryEntry {
  id: string;
  user_id: string;
  track_id: string;
  track_data: Record<string, unknown>;
  listened_at: string;
}
```

Map cloud history to `Track[]`:

```typescript
const cloudHistory: Track[] = (historyResult.data || [])
  .map((h: DbHistoryEntry) => h.track_data as unknown as Track);
```

Merge history (same additive merge pattern as tracks — history is append-only, newest first, cap at 100):

```typescript
const mergedHistory = mergeHistory(localData.history, cloudHistory);
```

Add `mergedHistory` to `mergedData`:

```typescript
const mergedData: UserData = {
  likedTracks: mergedLikedTracks,
  history: mergedHistory,   // was: localData.history
  savedAlbums: mergedSavedAlbums,
  playlists: mergedPlaylists,
  settings: mergedSettings,
};
```

Add `mergeHistory` function (similar to `mergeTracks`):

```typescript
function mergeHistory(local: Track[], cloud: Track[]): Track[] {
  const map = new Map<number, Track>();
  // Local entries first (local is authoritative for order/recency)
  local.forEach(t => map.set(t.id, t));
  // Add cloud entries not present locally
  cloud.forEach(t => {
    if (!map.has(t.id)) {
      map.set(t.id, t);
    }
  });
  return Array.from(map.values()).slice(0, 100);
}
```

**In `syncToCloud`:**

After the albums upsert block, add history sync:

```typescript
// Sync history (upsert — history rows are never deleted, just added)
const historyRows = localData.history.map((track: Track) => ({
  user_id: user.id,
  track_id: String(track.id),
  track_data: track as unknown as Record<string, unknown>,
  listened_at: new Date().toISOString(),
}));

if (historyRows.length > 0) {
  const { error: historyError } = await supabase
    .from('listening_history')
    .upsert(historyRows, { onConflict: 'user_id,track_id' });

  if (historyError) {
    console.error('History sync error:', historyError);
    // Non-fatal: don't return early, history sync failure shouldn't block everything
  }
}
```

### Fix C: Delete propagation

The root problem: `syncToCloud` upserts liked tracks, albums, and playlists — but never deletes rows in Supabase that have been removed locally.

**For liked tracks + saved albums (favorites table):**

After upserting favorites, add a cleanup step that deletes Supabase `favorites` rows whose `item_id` is not in the current local set:

```typescript
// Delete favorites that no longer exist locally (user unliked/unsaved)
const localTrackIds = localData.likedTracks.map(t => String(t.id));
const localAlbumIds = localData.savedAlbums.map(a => String(a.id));

if (localTrackIds.length > 0) {
  // Delete track favorites not in local set
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'track')
    .not('item_id', 'in', `(${localTrackIds.join(',')})`);
} else {
  // All tracks unliked — delete all track favorites
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'track');
}

if (localAlbumIds.length > 0) {
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'album')
    .not('item_id', 'in', `(${localAlbumIds.join(',')})`);
} else {
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'album');
}
```

**For playlists:**

After upserting playlists, add cleanup:

```typescript
// Delete playlists that no longer exist locally (user deleted them)
const localPlaylistIds = localData.playlists
  .filter(p => isValidUUID(p.id))
  .map(p => p.id);

if (localPlaylistIds.length > 0) {
  await supabase
    .from('playlists')
    .delete()
    .eq('user_id', user.id)
    .not('id', 'in', `(${localPlaylistIds.join(',')})`);
} else {
  // All playlists deleted — remove all from Supabase
  await supabase
    .from('playlists')
    .delete()
    .eq('user_id', user.id);
}
```

**Important note on merge functions:** After fixing delete propagation, the merge functions (`mergeTracks`, `mergeAlbums`) should prefer local over cloud when there's a conflict — this is already the case (local is inserted first, cloud only fills gaps). No change needed there. The real fix is the delete step in `syncToCloud` which ensures cloud never has "ghost" rows.

**Step: Write tests**

Add tests to `apps/web/lib/db/sync.ts`'s test file if one exists, or create `apps/web/test/sync.test.ts`.

Tests to write (mock the Supabase client):

1. `syncToCloud deletes unliked tracks from Supabase` — mock `supabase.from('favorites').delete()`, assert it's called with the right filter when a track is removed
2. `syncToCloud deletes removed playlists from Supabase` — same pattern for playlists
3. `syncFromCloud includes history from cloud` — mock history result, assert merged data contains cloud history tracks
4. `syncToCloud uploads history to listening_history table` — assert upsert called on `listening_history`

**Step: Run tests**

```bash
cd apps/web && bun run test
```

All 8 existing tests must still pass. New tests must pass.

**Step: Commit**

```bash
git add apps/web/lib/db/sync.ts apps/web/test/sync.test.ts
git commit -m "fix: add history sync and fix delete propagation in Supabase sync"
```

---

## Task 4: Remove dead import in PersistenceContext

**Files:**
- Modify: `apps/web/contexts/PersistenceContext.tsx`

**What to do:**

`syncToCloud` is imported at line 8 of `PersistenceContext.tsx` but never called. The comment at line 61 confirms this is intentional ("Sync is now manual only"). Remove the dead import.

**Step 1: Remove the import**

Delete line 8:
```typescript
import { syncToCloud } from "@/lib/db/sync";
```

**Step 2: Run tests to confirm nothing breaks**

```bash
cd apps/web && bun run test
```

**Step 3: Commit**

```bash
git add apps/web/contexts/PersistenceContext.tsx
git commit -m "chore: remove unused syncToCloud import from PersistenceContext"
```

---

## Done

After all tasks are committed, the branch `fix/supabase-sync` is ready. Summary of what was fixed:

| Issue | Fix |
|---|---|
| History never synced | Added `listening_history` table + full upload/download in sync.ts |
| Unlikes resurrected on sync | `syncToCloud` now deletes removed favorites from Supabase |
| Deleted playlists resurrected | `syncToCloud` now deletes removed playlists from Supabase |
| Stale database types | Added `tracks_data` and `listening_history` to database.types.ts |
| Dead import | Removed unused `syncToCloud` import from PersistenceContext |
