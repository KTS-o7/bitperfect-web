# Authentication & Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement user authentication with email/password and Google OAuth, plus cross-device sync for playlists, favorites, and settings using Supabase, while maintaining full functionality for anonymous users.

**Architecture:** Supabase handles auth and PostgreSQL database. App uses local IndexedDB for all operations with sync-on-login strategy to avoid rate limits. All data operations go through local storage first, cloud sync happens only during authentication events.

**Tech Stack:** Supabase (@supabase/supabase-js), IndexedDB (idb library), Next.js 16, React Context, TypeScript

---

## Prerequisites

Before starting, you need:
1. A Supabase account (free tier at supabase.com)
2. A Google Cloud project for OAuth (optional but recommended)

---

## Phase 1: Supabase Setup

### Task 1: Create Supabase Project

**Step 1: Create project**
- Go to https://supabase.com
- Click "New Project"
- Name: "bitperfect-web"
- Database password: Generate strong password
- Region: Pick closest to your users
- Click "Create new project"

**Step 2: Get credentials**
- Go to Project Settings → API
- Copy "Project URL" and "anon public" key
- Save to `.env.local` file in `apps/web/`

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 3: Enable Auth providers**
- Go to Authentication → Providers
- Email: Enable (default)
- Google: Enable and add OAuth credentials
  - Get credentials from Google Cloud Console
  - Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

**Step 4: Commit environment template**

Create `apps/web/.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

```bash
git add apps/web/.env.example
git commit -m "chore: add Supabase environment template"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Add dependencies**

```bash
cd apps/web
bun add @supabase/supabase-js @supabase/ssr idb
```

**Step 2: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add Supabase and IndexedDB dependencies"
```

---

### Task 3: Create Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write migration file**

```sql
-- Enable RLS
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO '';

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  track_ids JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('album', 'artist', 'track', 'playlist')),
  item_id TEXT NOT NULL,
  item_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, item_id)
);

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  theme TEXT DEFAULT 'dark',
  audio_quality TEXT DEFAULT 'high',
  auto_play BOOLEAN DEFAULT TRUE,
  crossfade_seconds INTEGER DEFAULT 0,
  settings_json JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for playlists
CREATE POLICY "Users can view own playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Step 2: Run migration in Supabase SQL Editor**
- Go to Supabase Dashboard → SQL Editor
- Copy paste the SQL above
- Click "Run"
- Verify no errors

**Step 3: Commit migration file**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "chore: add initial Supabase database schema"
```

---

## Phase 2: Local Database Layer

### Task 4: Create IndexedDB Local Storage

**Files:**
- Create: `apps/web/lib/db/indexeddb.ts`

**Step 1: Write IndexedDB wrapper**

```typescript
// apps/web/lib/db/indexeddb.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  trackIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string; // Last time synced to cloud
}

interface Favorite {
  id: string;
  type: 'album' | 'artist' | 'track' | 'playlist';
  itemId: string;
  itemData?: Record<string, unknown>;
  createdAt: string;
}

interface UserSettings {
  theme: 'dark' | 'light';
  audioQuality: 'low' | 'medium' | 'high';
  autoPlay: boolean;
  crossfadeSeconds: number;
  settingsJson: Record<string, unknown>;
  updatedAt: string;
}

interface BitperfectDB extends DBSchema {
  playlists: {
    key: string;
    value: Playlist;
    indexes: { 'by-updated': string };
  };
  favorites: {
    key: string;
    value: Favorite;
    indexes: { 'by-type': string; 'by-item': [string, string] };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

const DB_NAME = 'bitperfect-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BitperfectDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BitperfectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BitperfectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Playlists store
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('by-updated', 'updatedAt');

        // Favorites store
        const favoriteStore = db.createObjectStore('favorites', { keyPath: 'id' });
        favoriteStore.createIndex('by-type', 'type');
        favoriteStore.createIndex('by-item', ['type', 'itemId']);

        // Settings store
        db.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// Playlist operations
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  playlist.updatedAt = new Date().toISOString();
  await db.put('playlists', playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

// Favorite operations
export async function getAllFavorites(): Promise<Favorite[]> {
  const db = await getDB();
  return db.getAll('favorites');
}

export async function getFavoritesByType(type: Favorite['type']): Promise<Favorite[]> {
  const db = await getDB();
  return db.getAllFromIndex('favorites', 'by-type', type);
}

export async function isFavorited(type: Favorite['type'], itemId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.getFromIndex('favorites', 'by-item', [type, itemId]);
  return !!result;
}

export async function addFavorite(favorite: Favorite): Promise<void> {
  const db = await getDB();
  favorite.createdAt = new Date().toISOString();
  await db.put('favorites', favorite);
}

export async function removeFavorite(type: Favorite['type'], itemId: string): Promise<void> {
  const db = await getDB();
  const favorite = await db.getFromIndex('favorites', 'by-item', [type, itemId]);
  if (favorite) {
    await db.delete('favorites', favorite.id);
  }
}

// Settings operations
export async function getSettings(): Promise<UserSettings | undefined> {
  const db = await getDB();
  return db.get('settings', 'user-settings');
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDB();
  settings.updatedAt = new Date().toISOString();
  await db.put('settings', { ...settings, id: 'user-settings' });
}

export async function getOrCreateSettings(): Promise<UserSettings> {
  const existing = await getSettings();
  if (existing) return existing;
  
  const defaults: UserSettings = {
    theme: 'dark',
    audioQuality: 'high',
    autoPlay: true,
    crossfadeSeconds: 0,
    settingsJson: {},
    updatedAt: new Date().toISOString(),
  };
  
  await saveSettings(defaults);
  return defaults;
}

export type { Playlist, Favorite, UserSettings };
```

**Step 2: Commit**

```bash
git add apps/web/lib/db/indexeddb.ts
git commit -m "feat: add IndexedDB local storage layer"
```

---

### Task 5: Create Supabase Client

**Files:**
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/server.ts`

**Step 1: Create browser client**

```typescript
// apps/web/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server client**

```typescript
// apps/web/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/lib/supabase/client.ts apps/web/lib/supabase/server.ts
git commit -m "feat: add Supabase client configurations"
```

---

### Task 6: Generate Database Types

**Files:**
- Create: `apps/web/lib/supabase/database.types.ts`

**Step 1: Install Supabase CLI**

```bash
# Install globally or use npx
npm install -g supabase
```

**Step 2: Generate types**

```bash
cd apps/web
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > lib/supabase/database.types.ts
```

Replace `YOUR_PROJECT_ID` with your Supabase project ID (from Project Settings).

**Step 3: Commit**

```bash
git add apps/web/lib/supabase/database.types.ts
git commit -m "chore: generate Supabase TypeScript types"
```

---

## Phase 3: Authentication Context

### Task 7: Create Auth Context

**Files:**
- Create: `apps/web/contexts/AuthContext.tsx`

**Step 1: Write auth context**

```typescript
// apps/web/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check active session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add apps/web/contexts/AuthContext.tsx
git commit -m "feat: add authentication context"
```

---

### Task 8: Create Auth Callback Route

**Files:**
- Create: `apps/web/app/auth/callback/route.ts`

**Step 1: Write OAuth callback handler**

```typescript
// apps/web/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

**Step 2: Commit**

```bash
git add apps/web/app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route"
```

---

### Task 9: Wrap Layout with AuthProvider

**Files:**
- Modify: `apps/web/app/layout.tsx`

**Step 1: Add AuthProvider**

```typescript
// Add this import at the top
import { AuthProvider } from '@/contexts/AuthContext';

// Wrap children with AuthProvider
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "feat: wrap app with AuthProvider"
```

---

## Phase 4: Sync Logic

### Task 10: Create Sync Service

**Files:**
- Create: `apps/web/lib/db/sync.ts`

**Step 1: Write sync logic**

```typescript
// apps/web/lib/db/sync.ts
import { createClient } from '@/lib/supabase/client';
import {
  getAllPlaylists,
  getAllFavorites,
  getSettings,
  savePlaylist,
  addFavorite,
  saveSettings,
  Playlist,
  Favorite,
  UserSettings,
} from './indexeddb';

interface SyncResult {
  playlistsSynced: number;
  favoritesSynced: number;
  settingsSynced: boolean;
  error?: string;
}

export async function syncFromCloud(): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = {
    playlistsSynced: 0,
    favoritesSynced: 0,
    settingsSynced: false,
  };

  try {
    // Fetch all user data in parallel
    const [{ data: playlists }, { data: favorites }, { data: settings }] = await Promise.all([
      supabase.from('playlists').select('*'),
      supabase.from('favorites').select('*'),
      supabase.from('user_settings').select('*').single(),
    ]);

    // Sync playlists
    if (playlists) {
      const localPlaylists = await getAllPlaylists();
      const localMap = new Map(localPlaylists.map(p => [p.id, p]));

      for (const remotePlaylist of playlists) {
        const localPlaylist = localMap.get(remotePlaylist.id);
        
        // Merge: keep newer version
        if (!localPlaylist || new Date(remotePlaylist.updated_at) > new Date(localPlaylist.updatedAt)) {
          await savePlaylist({
            id: remotePlaylist.id,
            name: remotePlaylist.name,
            description: remotePlaylist.description || undefined,
            coverUrl: remotePlaylist.cover_url || undefined,
            trackIds: remotePlaylist.track_ids || [],
            isPublic: remotePlaylist.is_public || false,
            createdAt: remotePlaylist.created_at,
            updatedAt: remotePlaylist.updated_at,
            syncedAt: new Date().toISOString(),
          });
          result.playlistsSynced++;
        }
      }
    }

    // Sync favorites
    if (favorites) {
      const localFavorites = await getAllFavorites();
      const localSet = new Set(localFavorites.map(f => `${f.type}:${f.itemId}`));

      for (const remoteFavorite of favorites) {
        const key = `${remoteFavorite.type}:${remoteFavorite.item_id}`;
        
        if (!localSet.has(key)) {
          await addFavorite({
            id: remoteFavorite.id,
            type: remoteFavorite.type,
            itemId: remoteFavorite.item_id,
            itemData: remoteFavorite.item_data || undefined,
            createdAt: remoteFavorite.created_at,
          });
          result.favoritesSynced++;
        }
      }
    }

    // Sync settings
    if (settings) {
      const localSettings = await getSettings();
      
      if (!localSettings || new Date(settings.updated_at) > new Date(localSettings.updatedAt)) {
        await saveSettings({
          theme: settings.theme as 'dark' | 'light',
          audioQuality: settings.audio_quality as 'low' | 'medium' | 'high',
          autoPlay: settings.auto_play,
          crossfadeSeconds: settings.crossfade_seconds,
          settingsJson: settings.settings_json || {},
          updatedAt: settings.updated_at,
        });
        result.settingsSynced = true;
      }
    }

    return result;
  } catch (error) {
    console.error('Sync from cloud failed:', error);
    return {
      ...result,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function syncToCloud(): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = {
    playlistsSynced: 0,
    favoritesSynced: 0,
    settingsSynced: false,
  };

  try {
    const [playlists, favorites, settings] = await Promise.all([
      getAllPlaylists(),
      getAllFavorites(),
      getSettings(),
    ]);

    // Sync playlists
    const playlistUpserts = playlists
      .filter(p => !p.syncedAt || new Date(p.updatedAt) > new Date(p.syncedAt))
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || null,
        cover_url: p.coverUrl || null,
        track_ids: p.trackIds,
        is_public: p.isPublic,
        updated_at: p.updatedAt,
      }));

    if (playlistUpserts.length > 0) {
      const { error } = await supabase.from('playlists').upsert(playlistUpserts);
      if (error) throw error;
      result.playlistsSynced = playlistUpserts.length;
    }

    // Sync favorites
    const favoriteUpserts = favorites.map(f => ({
      id: f.id,
      type: f.type,
      item_id: f.itemId,
      item_data: f.itemData || null,
      created_at: f.createdAt,
    }));

    if (favoriteUpserts.length > 0) {
      const { error } = await supabase.from('favorites').upsert(favoriteUpserts);
      if (error) throw error;
      result.favoritesSynced = favoriteUpserts.length;
    }

    // Sync settings
    if (settings) {
      const { error } = await supabase.from('user_settings').upsert({
        theme: settings.theme,
        audio_quality: settings.audioQuality,
        auto_play: settings.autoPlay,
        crossfade_seconds: settings.crossfadeSeconds,
        settings_json: settings.settingsJson,
        updated_at: settings.updatedAt,
      });
      if (error) throw error;
      result.settingsSynced = true;
    }

    // Update syncedAt timestamps
    for (const playlist of playlists) {
      if (!playlist.syncedAt || new Date(playlist.updatedAt) > new Date(playlist.syncedAt)) {
        await savePlaylist({ ...playlist, syncedAt: new Date().toISOString() });
      }
    }

    return result;
  } catch (error) {
    console.error('Sync to cloud failed:', error);
    return {
      ...result,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function performFullSync(): Promise<SyncResult> {
  // First sync from cloud to get any remote changes
  const fromCloud = await syncFromCloud();
  
  // Then sync local changes to cloud
  const toCloud = await syncToCloud();

  return {
    playlistsSynced: fromCloud.playlistsSynced + toCloud.playlistsSynced,
    favoritesSynced: fromCloud.favoritesSynced + toCloud.favoritesSynced,
    settingsSynced: fromCloud.settingsSynced || toCloud.settingsSynced,
    error: fromCloud.error || toCloud.error,
  };
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/db/sync.ts
git commit -m "feat: add cloud sync service"
```

---

### Task 11: Create Auto-Sync Hook

**Files:**
- Create: `apps/web/hooks/useSync.ts`

**Step 1: Write sync hook**

```typescript
// apps/web/hooks/useSync.ts
import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { performFullSync, SyncResult } from '@/lib/db/sync';

interface UseSyncReturn {
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
  triggerSync: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const { isAuthenticated } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const triggerSync = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await performFullSync();
      
      if (result.error) {
        setSyncError(result.error);
      } else {
        setLastSync(new Date());
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  // Auto-sync when user logs in
  useEffect(() => {
    if (isAuthenticated && !lastSync) {
      triggerSync();
    }
  }, [isAuthenticated, lastSync, triggerSync]);

  return {
    isSyncing,
    lastSync,
    syncError,
    triggerSync,
  };
}
```

**Step 2: Commit**

```bash
git add apps/web/hooks/useSync.ts
git commit -m "feat: add auto-sync hook"
```

---

## Phase 5: Authentication UI

### Task 12: Create Login Form Component

**Files:**
- Create: `apps/web/components/auth/LoginForm.tsx`

**Step 1: Write login form**

```tsx
// apps/web/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = isSignUp
        ? await signup(email, password)
        : await login(email, password);

      if (authError) {
        setError(authError.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
      </button>

      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full text-sm text-blue-600 hover:underline"
      >
        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
      </button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/auth/LoginForm.tsx
git commit -m "feat: add login form component"
```

---

### Task 13: Create Google Auth Button

**Files:**
- Create: `apps/web/components/auth/GoogleButton.tsx`

**Step 1: Write Google button**

```tsx
// apps/web/components/auth/GoogleButton.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function GoogleButton() {
  const { loginWithGoogle } = useAuth();

  return (
    <button
      onClick={loginWithGoogle}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/auth/GoogleButton.tsx
git commit -m "feat: add Google OAuth button"
```

---

### Task 14: Create User Menu Component

**Files:**
- Create: `apps/web/components/auth/UserMenu.tsx`

**Step 1: Write user menu**

```tsx
// apps/web/components/auth/UserMenu.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/hooks/useSync';

export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isSyncing, lastSync, triggerSync } = useSync();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <a
        href="/login"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Login
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-100"
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
        )}
        <span className="hidden text-sm font-medium md:block">
          {user?.user_metadata?.full_name || user?.email}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border bg-white py-2 shadow-lg">
            <div className="border-b px-4 py-2">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-gray-500">
                {isSyncing
                  ? 'Syncing...'
                  : lastSync
                  ? `Last sync: ${lastSync.toLocaleTimeString()}`
                  : 'Not synced'}
              </p>
            </div>

            <button
              onClick={() => {
                triggerSync();
                setIsOpen(false);
              }}
              disabled={isSyncing}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <a
              href="/settings"
              className="block px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Settings
            </a>

            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/auth/UserMenu.tsx
git commit -m "feat: add user menu component"
```

---

### Task 15: Create Login Page

**Files:**
- Create: `apps/web/app/login/page.tsx`

**Step 1: Write login page**

```tsx
// apps/web/app/login/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to Bitperfect</h1>
          <p className="mt-2 text-sm text-gray-600">
            Login to sync your playlists across devices
          </p>
        </div>

        <div className="space-y-4">
          <GoogleButton />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <LoginForm />
        </div>

        <div className="text-center text-sm text-gray-500">
          <a href="/" className="hover:text-gray-700">
            Continue as guest →
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "feat: add login page"
```

---

### Task 16: Add UserMenu to Header

**Files:**
- Modify: `apps/web/components/layout/Header.tsx`

**Step 1: Add UserMenu import and placement**

Find the Header component and add UserMenu to the right side of the header, next to any existing navigation elements.

```tsx
// Add import at top
import { UserMenu } from '@/components/auth/UserMenu';

// Add UserMenu in the header JSX, typically in a flex container
// Example placement:
<header className="flex items-center justify-between px-4 py-3">
  <div className="flex items-center gap-4">
    {/* Logo, navigation links */}
  </div>
  <div className="flex items-center gap-4">
    {/* Other header items */}
    <UserMenu />
  </div>
</header>
```

**Step 2: Commit**

```bash
git add apps/web/components/layout/Header.tsx
git commit -m "feat: integrate UserMenu into header"
```

---

## Phase 6: Settings Page Integration

### Task 17: Update Settings Page with Account Section

**Files:**
- Modify: `apps/web/app/settings/page.tsx`

**Step 1: Add account section**

```tsx
// Add these imports at the top
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/hooks/useSync';

// Add AccountSection component within the settings page
function AccountSection() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isSyncing, lastSync, syncError, triggerSync } = useSync();

  if (!isAuthenticated) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Account</h2>
        <div className="rounded-lg border p-4">
          <p className="text-gray-600">
            Login to sync your playlists, favorites, and settings across all your devices.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Login or Sign Up
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Account</h2>
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg text-white">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <p className="font-medium">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>

        {lastSync && (
          <p className="mt-2 text-sm text-gray-500">
            Last synced: {lastSync.toLocaleString()}
          </p>
        )}

        {syncError && (
          <p className="mt-2 text-sm text-red-600">
            Sync error: {syncError}
          </p>
        )}
      </div>
    </section>
  );
}

// Then add <AccountSection /> to your settings page JSX
```

**Step 2: Commit**

```bash
git add apps/web/app/settings/page.tsx
git commit -m "feat: add account section to settings page"
```

---

## Phase 7: Testing & Verification

### Task 18: Manual Testing Checklist

**Step 1: Test Anonymous Mode**
- [ ] Open app in incognito window
- [ ] Verify no login prompt appears
- [ ] Create a playlist (should save locally)
- [ ] Add some favorites
- [ ] Change settings
- [ ] Close and reopen app
- [ ] Verify data persisted locally

**Step 2: Test Authentication**
- [ ] Navigate to `/login`
- [ ] Sign up with new email/password
- [ ] Verify redirect to home page
- [ ] Check that UserMenu shows email
- [ ] Logout and verify UserMenu shows "Login" button
- [ ] Login with existing credentials
- [ ] Verify sync completes (check UserMenu or Settings)

**Step 3: Test Google OAuth**
- [ ] Click "Continue with Google"
- [ ] Complete Google auth flow
- [ ] Verify redirect back to app
- [ ] Check that profile shows Google account info

**Step 4: Test Cross-Device Sync**
- [ ] Login on Device A, create playlist
- [ ] Verify sync shows "Last synced: X"
- [ ] Open app on Device B (incognito/different browser)
- [ ] Login with same account
- [ ] Verify playlist from Device A appears
- [ ] Edit playlist on Device B
- [ ] Refresh Device A and verify changes appear

**Step 5: Test Edge Cases**
- [ ] Login with wrong password (should show error)
- [ ] Sign up with existing email (should show error)
- [ ] Logout and verify local data still accessible
- [ ] Login again and verify merge works correctly
- [ ] Test offline mode (turn off wifi, app should still work)

### Task 19: Run Type Check

**Step 1: Type check the project**

```bash
cd apps/web
bun run typecheck
```

Fix any TypeScript errors.

**Step 2: Commit fixes**

```bash
git add .
git commit -m "fix: resolve TypeScript errors"
```

### Task 20: Final Review and Merge

**Step 1: Review changes**

```bash
git log --oneline main..HEAD
```

**Step 2: Test build**

```bash
bun run build:web
```

**Step 3: Push branch and create PR**

```bash
git push -u origin feature/auth-and-sync
```

---

## Environment Variables Summary

Required in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Post-Deployment

After deploying to production:

1. **Update Google OAuth redirect URI** to production domain
2. **Enable email confirmation** in Supabase if desired
3. **Monitor Supabase dashboard** for usage (should stay on free tier)
4. **Set up logging** for sync errors (optional)
5. **Create user documentation** about the sync feature

---

## Troubleshooting

### Common Issues

**"Auth callback failed" error:**
- Check Google OAuth credentials in Supabase
- Verify redirect URI matches exactly

**Sync not working:**
- Check browser console for errors
- Verify user is authenticated (check UserMenu)
- Check Supabase RLS policies are correct

**Data not persisting locally:**
- Check IndexedDB is enabled in browser
- Clear site data and try again

**Rate limit errors:**
- Normal usage should not hit limits
- Check Supabase dashboard for usage stats
- Verify sync is only happening on login

---

**Plan complete! This implementation provides:**
- ✅ Free Supabase auth (email + Google)
- ✅ Free PostgreSQL database
- ✅ Local-first architecture (no forced login)
- ✅ Sync-on-login (rate limit safe)
- ✅ Cross-device playlist sync
- ✅ Full offline functionality

**Total estimated time:** 4-6 hours
