# Authentication & Cross-Device Sync Design

**Date:** 2026-03-15  
**Status:** Approved  
**Author:** Assistant  

## Overview

This design document outlines the implementation of user authentication and cross-device data synchronization for bitperfect-web using Supabase. The system supports both authenticated users (with cloud sync) and anonymous users (local-only mode), allowing users to enjoy the app without mandatory login while offering seamless sync when they choose to authenticate.

## Goals

1. **Zero-cost infrastructure** - Use Supabase free tier for auth and database
2. **Rate-limit safe** - Sync only on login to minimize API calls
3. **Progressive enhancement** - App works fully without login, sync is optional
4. **Cross-device continuity** - Playlists, favorites, and settings follow the user
5. **Simple UX** - Minimal friction, no forced login prompts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    bitperfect-web                            │
│                  (Next.js 16 PWA)                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Login UI   │  │  User Menu   │  │ Auth Context │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │          Local Storage (IndexedDB)                       ││
│  │   ┌──────────┐ ┌──────────┐ ┌──────────────┐           ││
│  │   │Playlists │ │ Favorites│ │   Settings   │           ││
│  │   └──────────┘ └──────────┘ └──────────────┘           ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────┬────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │  Supabase   │
              │  (Auth + DB)│
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
    ┌────▼────┐ ┌───▼───┐ ┌─────▼──────┐
    │  users  │ │playlists│ │favorites  │
    └─────────┘ └─────────┘ └────────────┘
```

### User Modes

#### Anonymous Mode (Default)
- All data stored locally in IndexedDB
- Full app functionality (play music, create playlists, favorites)
- No account required
- Data persists across sessions on same device
- Login available any time via settings

#### Authenticated Mode
- All anonymous features PLUS
- Data syncs to Supabase on login
- Cross-device access to playlists/favorites/settings
- Automatic backup of local data
- User profile with avatar

## Database Schema

### Tables

#### profiles
Extension of Supabase Auth users table for additional user data.

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### playlists
User-created playlists with track references.

```sql
CREATE TABLE public.playlists (
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
```

#### favorites
User's favorited items (albums, artists, tracks, playlists).

```sql
CREATE TABLE public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('album', 'artist', 'track', 'playlist')),
  item_id TEXT NOT NULL,
  item_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, item_id)
);
```

#### user_settings
User preferences and app settings.

```sql
CREATE TABLE public.user_settings (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  theme TEXT DEFAULT 'dark',
  audio_quality TEXT DEFAULT 'high',
  auto_play BOOLEAN DEFAULT TRUE,
  crossfade_seconds INTEGER DEFAULT 0,
  settings_json JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can only access own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- Playlists: Users can only access own playlists
CREATE POLICY "Users can only access own playlists"
  ON playlists FOR ALL
  USING (auth.uid() = user_id);

-- Favorites: Users can only access own favorites
CREATE POLICY "Users can only access own favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- Settings: Users can only access own settings
CREATE POLICY "Users can only access own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id);
```

## Sync Strategy

### Philosophy
**Sync-on-login only** - To avoid hitting Supabase rate limits, we only fetch from the server when the user logs in. All other operations use local storage.

### Sync Flow

#### On Login
```
1. User authenticates → receive JWT token
2. Fetch all user data in ONE batch query:
   - SELECT * FROM playlists WHERE user_id = $1
   - SELECT * FROM favorites WHERE user_id = $1
   - SELECT * FROM user_settings WHERE user_id = $1
3. Merge server data with local data:
   - Last-write-wins for conflicts (compare timestamps)
   - Combine unique items from both sources
4. Save merged data to local IndexedDB
5. Push any local-only changes back to server (batch upsert)
6. Show app with local data (instant load)
```

#### On Logout
```
1. Push any pending local changes to server (if online)
2. Clear auth session
3. Keep local data intact (don't delete)
4. Return to anonymous mode
```

#### During Session
```
- All reads: From local IndexedDB (fast)
- All writes: To local IndexedDB + background sync queue
- No real-time sync (not needed for this use case)
```

### Rate Limit Analysis

**Supabase Free Tier Limits:**
- 50,000 monthly active users
- 2GB bandwidth
- 500MB database storage

**Our Usage Pattern:**
- 1 read query per login (fetch all user data)
- 1-3 write queries per login (sync local changes)
- 0 API calls during normal app usage

**Worst Case Scenario:**
- 50K users × 2 API calls = 100K requests/month
- Well within free tier limits
- Bandwidth usage minimal (playlist metadata only, not audio)

## Authentication Methods

### Email/Password
- Traditional email + password login
- Email verification optional (can be disabled for simpler UX)
- Password reset via email

### Google OAuth
- One-click sign-in with Google
- Uses Supabase's built-in OAuth integration
- Callback handled automatically

## File Structure

```
apps/web/
├── app/
│   ├── login/
│   │   └── page.tsx              # Login page UI
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   └── layout.tsx                # Add AuthProvider wrapper
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx         # Email/password form
│   │   ├── GoogleButton.tsx      # Google OAuth button
│   │   └── UserMenu.tsx          # User avatar dropdown
│   └── layout/
│       └── Header.tsx            # Add UserMenu integration
├── contexts/
│   ├── AuthContext.tsx           # Authentication state
│   └── SyncContext.tsx           # Sync orchestration
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client
│   │   └── database.types.ts     # Generated TypeScript types
│   └── db/                       # Local database
│       ├── indexeddb.ts          # IndexedDB wrapper
│       └── sync.ts               # Sync logic
├── hooks/
│   ├── useAuth.ts                # Auth hook
│   ├── useSync.ts                # Sync operations
│   └── useLocalData.ts           # Local storage operations
└── middleware.ts                 # Auth middleware
```

## UI/UX Design

### Login Page (`/login`)
- Centered card layout with brutalist design
- Email input + password input
- "Login" primary button
- "Continue with Google" secondary button
- "Continue as Guest" link (optional, skips login)
- "Don't have an account? Sign up" toggle

### User Menu (Header)
- Anonymous: Show "Login" button in header
- Authenticated: Show user avatar with dropdown
  - Display name / email
  - "My Profile" link (future)
  - "Sync Status" indicator
  - "Logout" option

### Settings Page Updates
- Add "Account" section
- Show login status
- When anonymous: "Login to sync across devices" CTA
- When authenticated: Show last sync time, logout button
- Sync button: Manual trigger for immediate sync

## Security Considerations

1. **JWT Storage**: Store in memory (React state), not localStorage
2. **Refresh Tokens**: Supabase handles automatic token refresh
3. **RLS Policies**: Strict user isolation at database level
4. **HTTPS Only**: All API calls over HTTPS
5. **No Sensitive Data**: Only sync playlist metadata, never passwords or payment info

## Error Handling

### Sync Failures
- Show toast notification: "Sync failed, will retry"
- Queue failed operations for next login
- Don't block app usage

### Auth Failures
- Clear error messages on login form
- "Invalid credentials" for wrong password
- "Account not found" for non-existent email

### Offline Handling
- App works fully offline with local data
- Queue sync operations for when online
- Show "Offline mode" indicator in header

## Future Enhancements

1. **Playlist Sharing**: Public playlists via shareable links
2. **Collaborative Playlists**: Multiple users can edit
3. **Import/Export**: Backup playlists to JSON file
4. **Sync Settings**: Choose what to sync (playlists only, or everything)
5. **Conflict Resolution UI**: Manual merge when timestamps are close

## Success Criteria

- [ ] Users can sign up with email/password
- [ ] Users can login with Google OAuth
- [ ] Anonymous users have full app functionality
- [ ] Login syncs playlists, favorites, and settings across devices
- [ ] No forced login prompts (100% optional)
- [ ] Sync completes within 2 seconds on login
- [ ] App remains functional when offline
- [ ] Zero Supabase rate limit errors in normal usage

## Technical Stack

- **Auth**: Supabase Auth (free tier)
- **Database**: Supabase PostgreSQL (free tier)
- **Local Storage**: IndexedDB via idb library
- **Client**: @supabase/supabase-js
- **State Management**: React Context + TanStack Query (existing)

## Cost Analysis

**Supabase Free Tier:**
- Auth: Unlimited users, $0
- Database: 500MB, $0
- Bandwidth: 2GB/month, $0

**Estimated Usage:**
- 1,000 users × 10 logins/month = 10K API calls
- Average playlist: 50 tracks × 100 bytes = 5KB per playlist
- 1,000 users × 20 playlists = 100MB storage

**Total Cost: $0/month**

## Migration Path

For existing users (no breaking changes):
1. Deploy auth system
2. Existing users continue in anonymous mode
3. Optional: Prompt existing users to create account
4. Local data automatically migrates on first login

## Appendix: Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Next Steps

1. Create implementation plan with specific tasks
2. Set up Supabase project and configure OAuth
3. Implement database schema and RLS policies
4. Build authentication UI components
5. Implement sync logic
6. Test cross-device sync
7. Deploy and monitor
