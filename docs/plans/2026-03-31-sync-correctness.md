# Sync Correctness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken sync code caused by schema drift from migration 004, invert performSync order to prevent item resurrection, add history delete path, and make each sync category independent with Promise.allSettled.

**Architecture:** All fixes are in `apps/web/lib/db/sync.ts` and `apps/web/test/sync.test.ts`. No schema changes needed — migration 004 is already correct; the code just hasn't caught up. The four fixes are independent enough to commit separately for clean history.

**Tech Stack:** TypeScript, Supabase JS client, vitest

**Working directory:** `/Users/kts/Documents/side-projects/bitperfect-web/.worktrees/fix-sync-v2`

**Run tests:** `cd apps/web && bun run test`

---

## Current state of sync.ts (read before editing)

The file is at `apps/web/lib/db/sync.ts` — 363 lines. Key issues to fix:

| Line | Bug | Fix |
|------|-----|-----|
| 45 | `DbHistoryEntry.listened_at: string` — column dropped | Remove field from interface |
| 61 | `.order('listened_at', ...)` — column dropped | Remove the `.order()` call |
| 27 | `DbFavorite.type` allows `'artist' \| 'playlist'` — constraint removed | Narrow to `'album' \| 'track'` |
| 297–303 | `performSync` runs pull-then-push — causes item resurrection | Flip to push-then-pull |
| 57 | `Promise.all` — one failure aborts all categories | Replace with `Promise.allSettled` |
| 257–273 | History upsert — no delete path | Add delete step matching favorites pattern |

---

## Task 1: Fix schema drift in interfaces and queries

**Files:**
- Modify: `apps/web/lib/db/sync.ts`

**Exact changes:**

### 1a. Fix `DbHistoryEntry` interface (lines 40–46)

Remove `listened_at` field. Replace:
```typescript
interface DbHistoryEntry {
  id: string;
  user_id: string;
  track_id: string;
  track_data: Record<string, unknown>;
  listened_at: string;
}
```
With:
```typescript
interface DbHistoryEntry {
  id: string;
  user_id: string;
  track_id: string;
  track_data: Record<string, unknown>;
}
```

### 1b. Fix `DbFavorite` interface (line 27)

Narrow `type` to match the tightened CHECK constraint. Replace:
```typescript
type: 'album' | 'artist' | 'track' | 'playlist';
```
With:
```typescript
type: 'album' | 'track';
```

### 1c. Remove `.order('listened_at', ...)` from `syncFromCloud` (line 61)

Replace:
```typescript
supabase.from('listening_history').select('*').eq('user_id', user.id).order('listened_at', { ascending: false }).limit(100),
```
With:
```typescript
supabase.from('listening_history').select('*').eq('user_id', user.id).limit(100),
```
The ORDER BY is irrelevant — `mergeHistory` deduplicates by track id and the local array already has the correct listen order. We just need the most recent 100 distinct tracks from cloud.

**Run tests:**
```bash
cd apps/web && bun run test
```
Expected: 12/12 pass.

**Commit:**
```bash
git add apps/web/lib/db/sync.ts
git commit -m "fix(sync): remove dropped listened_at column references and narrow DbFavorite type"
```

---

## Task 2: Replace Promise.all with Promise.allSettled in syncFromCloud

**Files:**
- Modify: `apps/web/lib/db/sync.ts`

**What to do:**

Currently `syncFromCloud` (line 57–62) uses `Promise.all` — if ANY of the 4 queries fails (history, playlists, favorites, settings), the entire function throws and nothing syncs. Replace with `Promise.allSettled` so each category degrades independently.

### Replace the Promise.all block (lines 57–62)

Replace:
```typescript
const [playlistsResult, favoritesResult, settingsResult, historyResult] = await Promise.all([
  supabase.from('playlists').select('*').eq('user_id', user.id),
  supabase.from('favorites').select('*').eq('user_id', user.id),
  supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
  supabase.from('listening_history').select('*').eq('user_id', user.id).limit(100),
]);
```
With:
```typescript
const [playlistsResult, favoritesResult, settingsResult, historyResult] = await Promise.allSettled([
  supabase.from('playlists').select('*').eq('user_id', user.id),
  supabase.from('favorites').select('*').eq('user_id', user.id),
  supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
  supabase.from('listening_history').select('*').eq('user_id', user.id).limit(100),
]);
```

### Update all downstream uses of these results

With `Promise.allSettled`, each result is `{ status: 'fulfilled', value: ... } | { status: 'rejected', reason: ... }`. Extract `.value` safely:

Replace all four result usages. The pattern is: extract `.value` if fulfilled, otherwise use a safe default.

```typescript
const playlistsData = playlistsResult.status === 'fulfilled' ? playlistsResult.value : { data: null, error: null };
const favoritesData = favoritesResult.status === 'fulfilled' ? favoritesResult.value : { data: null, error: null };
const settingsData = settingsResult.status === 'fulfilled' ? settingsResult.value : { data: null, error: null };
const historyData = historyResult.status === 'fulfilled' ? historyResult.value : { data: null, error: null };

if (playlistsResult.status === 'rejected') console.error('Playlists fetch error:', playlistsResult.reason);
if (favoritesResult.status === 'rejected') console.error('Favorites fetch error:', favoritesResult.reason);
if (settingsResult.status === 'rejected') console.error('Settings fetch error:', settingsResult.reason);
if (historyResult.status === 'rejected') console.error('History fetch error:', historyResult.reason);
```

Then replace all usages of `playlistsResult.data` → `playlistsData.data`, `favoritesResult.data` → `favoritesData.data`, etc. throughout the function body:

- Line 66: `(playlistsResult.data || [])` → `(playlistsData.data || [])`
- Line 78: `(favoritesResult.data || [])` → `(favoritesData.data || [])`
- Line 82: `(favoritesResult.data || [])` → `(favoritesData.data || [])`
- Line 90: `(historyResult.data || [])` → `(historyData.data || [])`
- Lines 93–100 (settings check): `if (settingsResult.data)` → `if (settingsData.data)`

**Run tests:**
```bash
cd apps/web && bun run test
```
Expected: 12/12 pass.

**Commit:**
```bash
git add apps/web/lib/db/sync.ts
git commit -m "fix(sync): use Promise.allSettled so each sync category is independent"
```

---

## Task 3: Flip performSync order — push first, then pull

**Files:**
- Modify: `apps/web/lib/db/sync.ts`

**Why:** Currently `performSync` runs `syncFromCloud` first. This merges cloud data (including items the user deleted locally) back into localStorage BEFORE the delete sweep in `syncToCloud` runs. Result: deleted items reappear in the UI for one sync cycle. Flipping to push-first means local state (including deletions) is written to cloud first; then pull merges in any new items from other devices.

**Replace `performSync` (lines 297–303):**

```typescript
// BEFORE:
export async function performSync(): Promise<SyncResult> {
  const fromCloud = await syncFromCloud();
  if (!fromCloud.success) {
    return fromCloud;
  }
  return await syncToCloud();
}
```

```typescript
// AFTER:
export async function performSync(): Promise<SyncResult> {
  // Push local state first (including deletions) so cloud reflects current truth.
  // Then pull from cloud to merge in changes from other devices.
  const toCloud = await syncToCloud();
  if (!toCloud.success) {
    return toCloud;
  }
  return await syncFromCloud();
}
```

**Run tests:**
```bash
cd apps/web && bun run test
```
Expected: 12/12 pass. The existing tests test `syncToCloud` and `syncFromCloud` independently — they don't test `performSync` order — so all should still pass.

**Commit:**
```bash
git add apps/web/lib/db/sync.ts
git commit -m "fix(sync): push local state to cloud before pulling to prevent item resurrection"
```

---

## Task 4: Add history delete path in syncToCloud

**Files:**
- Modify: `apps/web/lib/db/sync.ts`
- Modify: `apps/web/test/sync.test.ts`

**Why:** History upsert in `syncToCloud` (lines 257–273) only adds rows, never removes them. If a user clears history locally, the cloud retains all rows and restores them on the next `syncFromCloud`. Fix: add a DELETE step after the upsert, mirroring the exact pattern already used for favorites and playlists.

### Add delete step after the history upsert block

After the existing history upsert block (currently ending around line 273), add:

```typescript
// Delete history entries no longer present locally
const localHistoryIds = localData.history.map(t => String(t.id));
if (localHistoryIds.length > 0) {
  const { error: deleteHistoryError } = await supabase
    .from('listening_history')
    .delete()
    .eq('user_id', user.id)
    .not('track_id', 'in', `(${localHistoryIds.map(id => `"${id}"`).join(',')})`);
  if (deleteHistoryError) console.error('Delete history error:', deleteHistoryError);
} else {
  // All history cleared locally — remove all cloud history for this user
  const { error: deleteHistoryError } = await supabase
    .from('listening_history')
    .delete()
    .eq('user_id', user.id);
  if (deleteHistoryError) console.error('Delete history error:', deleteHistoryError);
}
```

### Add a test for this

In `apps/web/test/sync.test.ts`, add a 5th test after the existing 4:

```typescript
// ============================================================
// Test 5: syncToCloud deletes cleared history from Supabase
// ============================================================
describe('syncToCloud deletes cleared history from Supabase', () => {
  it('calls listening_history.delete when history is empty', async () => {
    mockStorage.load.mockReturnValue(emptyLocalData); // history: []

    const supabase = buildSupabaseMock();
    mockCreateClient.mockReturnValue(supabase as ReturnType<typeof createClient>);

    await syncToCloud();

    expect(supabase.from).toHaveBeenCalledWith('listening_history');

    const histTable = supabase._tables['listening_history'];
    expect(histTable).toBeDefined();
    expect(histTable.delete).toHaveBeenCalled();

    const eqCalls = (histTable.eq as ReturnType<typeof vi.fn>).mock.calls;
    const userIdCall = eqCalls.some(
      (args: unknown[]) => args[0] === 'user_id' && args[1] === 'user-123'
    );
    expect(userIdCall).toBe(true);
  });
});
```

**Run tests:**
```bash
cd apps/web && bun run test
```
Expected: 13 tests pass (12 existing + 1 new).

**Commit:**
```bash
git add apps/web/lib/db/sync.ts apps/web/test/sync.test.ts
git commit -m "fix(sync): add history delete path so clearing history locally clears cloud too"
```

---

## Done

After all 4 tasks are committed on branch `fix/sync-correctness`, the sync layer will be:

| Fix | Status |
|---|---|
| `listened_at` ORDER BY removed | ✅ |
| `DbHistoryEntry.listened_at` removed | ✅ |
| `DbFavorite.type` narrowed | ✅ |
| `Promise.allSettled` for independent categories | ✅ |
| Push-first order prevents resurrection | ✅ |
| History delete path added | ✅ |
| 13 tests passing | ✅ |
