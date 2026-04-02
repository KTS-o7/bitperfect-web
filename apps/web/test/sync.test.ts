import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Track } from '@bitperfect/shared/api';

// ---------- localStorage mock ----------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, 'window', { value: {}, writable: true });

// ---------- Supabase mock helpers ----------

// Spy-aware builder: returns an object whose methods are vi.fn() stubs
// that keep returning `this` so chains work, with a final async resolution.
function buildSupabaseMock(overrides: Record<string, Record<string, unknown>> = {}) {
  const calls: Record<string, unknown[][]> = {};

  const record = (table: string, method: string, args: unknown[]) => {
    const key = `${table}.${method}`;
    if (!calls[key]) calls[key] = [];
    calls[key].push(args);
  };

  function makeTable(table: string) {
    const chain: Record<string, unknown> = {};

    const defaultResult = overrides[table] || { data: null, error: null };

    const methods = ['select', 'eq', 'not', 'order', 'limit', 'single', 'delete', 'upsert', 'insert'];

    methods.forEach(method => {
      chain[method] = vi.fn((...args: unknown[]) => {
        record(table, method, args);
        // Make it thenable so await works
        const self = chain as Record<string, unknown> & { then?: unknown };
        self.then = (resolve: (v: unknown) => void) => resolve(defaultResult);
        return chain;
      });
    });

    return chain;
  }

  const tables: Record<string, ReturnType<typeof makeTable>> = {};

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn((table: string) => {
      if (!tables[table]) tables[table] = makeTable(table);
      return tables[table];
    }),
    _calls: calls,
    _tables: tables,
  };

  return supabase;
}

// ---------- Module mocks ----------

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...actual,
    storage: {
      load: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    },
  };
});

// ---------- Import after mocks ----------
import { syncToCloud, syncFromCloud } from '@/lib/db/sync';
import { createClient } from '@/lib/supabase/client';
import { storage } from '@/lib/storage';

const mockCreateClient = vi.mocked(createClient);
const mockStorage = vi.mocked(storage);

// Helper: a minimal Track
function makeTrack(id: number): Track {
  return { id, title: `Track ${id}`, duration: 180, artist: { name: 'Artist' } } as Track;
}

// Default empty local data
const emptyLocalData = {
  likedTracks: [],
  history: [],
  savedAlbums: [],
  playlists: [],
  settings: { quality: 'LOSSLESS' as const },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Test 1: syncToCloud deletes unliked tracks from Supabase
// ============================================================
describe('syncToCloud deletes unliked tracks from Supabase', () => {
  it('calls favorites.delete with type=track when likedTracks is empty', async () => {
    mockStorage.load.mockReturnValue(emptyLocalData);

    const supabase = buildSupabaseMock();
    mockCreateClient.mockReturnValue(supabase as ReturnType<typeof createClient>);

    await syncToCloud();

    // .from('favorites') must have been called
    expect(supabase.from).toHaveBeenCalledWith('favorites');

    const favTable = supabase._tables['favorites'];
    expect(favTable).toBeDefined();

    // delete() should have been called
    expect(favTable.delete).toHaveBeenCalled();

    // eq('type', 'track') should have been called on the favorites chain
    const eqCalls = (favTable.eq as ReturnType<typeof vi.fn>).mock.calls;
    const trackTypeCall = eqCalls.some(
      (args: unknown[]) => args[0] === 'type' && args[1] === 'track'
    );
    expect(trackTypeCall).toBe(true);
  });
});

// ============================================================
// Test 2: syncToCloud deletes removed playlists from Supabase
// ============================================================
describe('syncToCloud deletes removed playlists from Supabase', () => {
  it('calls playlists.delete when playlists is empty', async () => {
    mockStorage.load.mockReturnValue(emptyLocalData);

    const supabase = buildSupabaseMock();
    mockCreateClient.mockReturnValue(supabase as ReturnType<typeof createClient>);

    await syncToCloud();

    expect(supabase.from).toHaveBeenCalledWith('playlists');

    const playlistTable = supabase._tables['playlists'];
    expect(playlistTable).toBeDefined();

    expect(playlistTable.delete).toHaveBeenCalled();

    const eqCalls = (playlistTable.eq as ReturnType<typeof vi.fn>).mock.calls;
    const userIdCall = eqCalls.some(
      (args: unknown[]) => args[0] === 'user_id' && args[1] === 'user-123'
    );
    expect(userIdCall).toBe(true);
  });
});

// ============================================================
// Test 3: syncFromCloud merges history from cloud
// ============================================================
describe('syncFromCloud merges history from cloud', () => {
  it('includes cloud history track in saved local data', async () => {
    const cloudTrack = makeTrack(42);

    const historyEntry = {
      id: 'hist-1',
      user_id: 'user-123',
      track_id: '42',
      track_data: cloudTrack,
    };

    const supabase = buildSupabaseMock({
      playlists: { data: [], error: null },
      favorites: { data: [], error: null },
      user_settings: { data: null, error: null },
      listening_history: { data: [historyEntry], error: null },
    });
    mockCreateClient.mockReturnValue(supabase as ReturnType<typeof createClient>);

    mockStorage.load.mockReturnValue(emptyLocalData);

    await syncFromCloud();

    expect(mockStorage.save).toHaveBeenCalled();

    const savedData = (mockStorage.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedData.history).toHaveLength(1);
    expect(savedData.history[0].id).toBe(42);
  });
});

// ============================================================
// Test 4: syncToCloud uploads history to listening_history
// ============================================================
describe('syncToCloud uploads history to listening_history', () => {
  it('calls listening_history.upsert with the history track', async () => {
    const historyTrack = makeTrack(99);

    mockStorage.load.mockReturnValue({
      ...emptyLocalData,
      history: [historyTrack],
    });

    const supabase = buildSupabaseMock();
    mockCreateClient.mockReturnValue(supabase as ReturnType<typeof createClient>);

    await syncToCloud();

    expect(supabase.from).toHaveBeenCalledWith('listening_history');

    const histTable = supabase._tables['listening_history'];
    expect(histTable).toBeDefined();

    expect(histTable.upsert).toHaveBeenCalled();

    const upsertArgs = (histTable.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
    const rows = upsertArgs[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].track_id).toBe('99');
    expect(rows[0].user_id).toBe('user-123');
    expect((rows[0].track_data as Record<string, unknown>).id).toBe(99);
  });
});

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
