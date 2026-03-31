# Schema Cleanup & Sync Correctness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up the Supabase schema to match what the code actually uses, remove dead columns, fix data inconsistencies, and make the sync layer authoritative.

**Architecture:** Single SQL migration (004) drops/adds columns and cleans existing data in one transaction. Code changes in `sync.ts` align writes/reads with the cleaned schema. `storage.ts` gets a version bump to migrate any existing localStorage data. `database.types.ts` updated to match exactly.

**Tech Stack:** Next.js 14, TypeScript, Supabase JS client, Supabase CLI (`supabase db push`), vitest

**Working directory:** `/Users/kts/Documents/side-projects/bitperfect-web/.worktrees/fix-schema`

**Run tests:** `cd apps/web && bun run test`

---

## Issues Being Fixed

| # | Issue | Fix |
|---|---|---|
| D1 | `playlists.track_ids` is redundant (tracks_data carries everything) | Remove column from schema + stop writing/reading it in code |
| D3/D4 | `listening_history.listened_at` always records sync time not listen time | Remove column; history is a "last heard" set, not a timestamped log |
| D5 | `user_settings.theme/auto_play/crossfade_seconds` hardcoded, never read back | Remove unused columns; keep only `audio_quality` + `settings_json` |
| D7 | `audio_quality` default is lowercase `'high'` but app writes uppercase | Fix default to `'LOSSLESS'`, normalise existing data |
| D6 | `favorites.type` allows `'artist'/'playlist'` but never used | Tighten CHECK constraint to only `('album','track')` |
| D8 | `profiles` columns `display_name/avatar_url` unused by sync | Leave table intact (used by auth trigger), no change needed |
| D9 | `Playlist.color` local-only, never synced | Add `color` column to playlists schema + sync it |
| - | Old data: `track_ids` populated but `tracks_data` null on pre-002 rows | Backfill: set `tracks_data = '[]'` where null, clear `track_ids` |
| - | Old data: `listening_history.listened_at` column being removed | Handled by DROP COLUMN in migration |

---

## Task 1: SQL migration 004

**Files:**
- Create: `supabase/migrations/004_schema_cleanup.sql`

**What to do:**

Write the migration. It must be safe to run on an existing database that already has data.

```sql
-- supabase/migrations/004_schema_cleanup.sql
-- Schema cleanup: remove unused columns, fix defaults, add color to playlists

BEGIN;

-- ── playlists ──────────────────────────────────────────────────────────────

-- Add color column (was local-only, now synced)
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Remove redundant track_ids column (tracks_data carries everything)
ALTER TABLE public.playlists
  DROP COLUMN IF EXISTS track_ids;

-- Backfill: ensure tracks_data is never null
UPDATE public.playlists
  SET tracks_data = '[]'
  WHERE tracks_data IS NULL;

-- Make tracks_data NOT NULL now that nulls are cleared
ALTER TABLE public.playlists
  ALTER COLUMN tracks_data SET NOT NULL,
  ALTER COLUMN tracks_data SET DEFAULT '[]';

-- ── listening_history ──────────────────────────────────────────────────────

-- Remove listened_at column (it recorded sync time, not listen time — misleading)
ALTER TABLE public.listening_history
  DROP COLUMN IF EXISTS listened_at;

-- ── user_settings ──────────────────────────────────────────────────────────

-- Remove hardcoded columns that are never read back by the app
ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS theme,
  DROP COLUMN IF EXISTS auto_play,
  DROP COLUMN IF EXISTS crossfade_seconds;

-- Fix audio_quality default casing (schema said 'high', app writes 'LOSSLESS')
ALTER TABLE public.user_settings
  ALTER COLUMN audio_quality SET DEFAULT 'LOSSLESS';

-- Normalise existing lowercase values to uppercase
UPDATE public.user_settings
  SET audio_quality = UPPER(audio_quality)
  WHERE audio_quality IN ('low', 'high');

-- ── favorites ──────────────────────────────────────────────────────────────

-- Tighten type constraint to only what the app actually uses
ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_type_check;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_type_check
  CHECK (type IN ('album', 'track'));

-- Remove any orphaned 'artist' or 'playlist' type rows
DELETE FROM public.favorites
  WHERE type IN ('artist', 'playlist');

COMMIT;
```

**Step: Commit**

```bash
git add supabase/migrations/004_schema_cleanup.sql
git commit -m "feat: add schema cleanup migration 004"
```

---

## Task 2: Fix sync.ts

**Files:**
- Modify: `apps/web/lib/db/sync.ts`

**What to do — 5 targeted changes:**

### Change 1: Update `DbPlaylist` interface — remove `track_ids`, add `color`

```typescript
interface DbPlaylist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  tracks_data: PlaylistTrack[] | null;
  color: string | null;         // ADD
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // track_ids REMOVED
}
```

### Change 2: Update `DbUserSettings` interface — remove removed columns

```typescript
interface DbUserSettings {
  user_id: string;
  audio_quality: string;
  settings_json: Record<string, unknown>;
  updated_at: string;
  // theme, auto_play, crossfade_seconds REMOVED
}
```

### Change 3: Fix `syncFromCloud` playlist mapping — remove `trackIds` parse, add `color`

Replace the cloudPlaylists mapping block (currently lines 69-78) with:

```typescript
const cloudPlaylists: Playlist[] = (playlistsResult.data || []).map((p: DbPlaylist) => ({
  id: p.id,
  name: p.name,
  description: p.description || undefined,
  trackIds: ((p.tracks_data || []) as PlaylistTrack[]).map(t => t.id), // derive from tracks_data
  tracks: (p.tracks_data || []) as PlaylistTrack[],
  coverArt: p.cover_url || undefined,
  color: p.color || undefined,  // ADD
  createdAt: p.created_at,
  updatedAt: p.updated_at,
}));
```

### Change 4: Fix `syncToCloud` playlist upsert — remove `track_ids`, add `color`

Replace the playlistRows mapping (currently lines 141-151) with:

```typescript
const playlistRows = localData.playlists.map((p: Playlist) => ({
  id: isValidUUID(p.id) ? p.id : uuidv4(),
  user_id: user.id,
  name: p.name,
  description: p.description || null,
  cover_url: p.coverArt || null,
  tracks_data: p.tracks as unknown as Record<string, unknown>[],
  color: p.color || null,       // ADD
  is_public: false,
  updated_at: new Date().toISOString(),
  // track_ids REMOVED
}));
```

### Change 5: Fix `syncToCloud` user_settings upsert — remove removed columns, fix quality normalisation

Replace the settings upsert block (currently lines 277-291) with:

```typescript
// Normalise quality to uppercase before writing
const qualityValue = (localData.settings.quality || 'LOSSLESS').toUpperCase() as 'LOW' | 'HIGH' | 'LOSSLESS';

const { error: settingsError } = await supabase
  .from('user_settings')
  .upsert({
    user_id: user.id,
    audio_quality: qualityValue,
    settings_json: localData.settings as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

if (settingsError) {
  console.error('Settings sync error:', settingsError);
}
```

Also fix `syncFromCloud` settings read to normalise casing on load (line 98-101):

```typescript
mergedSettings = {
  quality: ((dbSettings.audio_quality?.toUpperCase() || 'LOSSLESS') as 'LOW' | 'HIGH' | 'LOSSLESS'),
  ...(dbSettings.settings_json as Record<string, unknown>),
};
```

**Step: Run tests**

```bash
cd apps/web && bun run test
```

All 12 existing tests must pass. If any test references `track_ids` in assertions, update those assertions to match the new schema.

**Step: Commit**

```bash
git add apps/web/lib/db/sync.ts
git commit -m "fix(sync): remove track_ids, add color sync, fix settings columns and casing"
```

---

## Task 3: Update database.types.ts

**Files:**
- Modify: `apps/web/lib/supabase/database.types.ts`

**What to do:**

Update the types to exactly match the schema after migration 004.

### playlists table

Remove `track_ids` from Row/Insert/Update. Add `color: string | null` (Row), `color?: string | null` (Insert/Update).

Make `tracks_data` non-nullable in Row (it's now `NOT NULL`): `tracks_data: Json` (not `Json | null`).

### user_settings table

Remove `theme`, `auto_play`, `crossfade_seconds` from Row/Insert/Update.

### listening_history table

Remove `listened_at` from Row/Insert/Update.

### favorites table

The `type` field is still `'album' | 'artist' | 'track' | 'playlist'` in the current types — narrow it to `'album' | 'track'` in Row/Insert/Update.

**Step: Run TypeScript check**

```bash
cd apps/web && bunx tsc --noEmit 2>&1
```

Any new errors (not pre-existing) must be fixed.

**Step: Commit**

```bash
git add apps/web/lib/supabase/database.types.ts
git commit -m "feat: update database types to match schema after cleanup migration"
```

---

## Task 4: Update sync.test.ts

**Files:**
- Modify: `apps/web/test/sync.test.ts`

**What to do:**

The existing tests mock `track_ids` in playlist data and reference `theme`/`auto_play`/`crossfade_seconds` in settings. After the sync.ts changes these fields no longer exist. Update the tests:

1. In any test that constructs a mock playlist DB row, remove `track_ids` and add `color: null`.
2. In any test that constructs a mock `user_settings` row, remove `theme`, `auto_play`, `crossfade_seconds`.
3. In any test that constructs a mock `listening_history` row, remove `listened_at`.
4. In any test that asserts on `trackIds` being derived from `track_ids`, update to assert they come from `tracks_data`.

**Step: Run tests — all 12 must pass**

```bash
cd apps/web && bun run test
```

**Step: Commit**

```bash
git add apps/web/test/sync.test.ts
git commit -m "test: update sync tests after schema cleanup"
```

---

## Task 5: Push migration via Supabase CLI

**What to do:**

From the **repo root** (not the worktree), link and push:

```bash
cd /Users/kts/Documents/side-projects/bitperfect-web
supabase link --project-ref yprtndticpiygnliyaeq
supabase db push
```

When prompted `Do you want to push these migrations?`, confirm — only migration 004 should appear.

**Step: Verify migration applied**

```bash
supabase migration list
```

Expected: all 4 migrations show in both Local and Remote columns.

**Step: Commit the linked supabase config if changed**

```bash
git add supabase/.temp 2>/dev/null || true
git status  # confirm nothing unexpected staged
```

---

## Done

After all tasks, branch `fix/schema-cleanup` is ready for PR. Summary:

| What | Status |
|---|---|
| `playlists.track_ids` | Dropped from schema + code |
| `playlists.color` | Added to schema + synced |
| `playlists.tracks_data` | Made NOT NULL, backfilled |
| `listening_history.listened_at` | Dropped |
| `user_settings.theme/auto_play/crossfade_seconds` | Dropped |
| `user_settings.audio_quality` default | Fixed to `'LOSSLESS'` |
| `favorites.type` constraint | Tightened to `album/track` only |
| Orphaned `artist/playlist` favorites rows | Deleted |
| Sync code | Aligned with new schema |
| Types | Aligned with new schema |
