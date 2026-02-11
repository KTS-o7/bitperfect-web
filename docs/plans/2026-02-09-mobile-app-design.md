# bitperfect - Mobile App Design Revisionscument

**Date:** 2026-02-09
**Approach:** Turborepo monorepo with shared logic, separate native UI
**Platforms:** Android first, then iOS
**Audio:** expo-audio
**Styling:** NativeWind v5 + Tailwind CSS v4 (react-native-css)
**Design:** Native chrome (NativeTabs, Stack headers) + brutalist branded content areas

---

## 1. Monorepo Structure

```
side-a/
├── turbo.json
├── package.json                      # Root workspace config
├── packages/
│   └── shared/
│       ├── package.json              # @bitperfect/shared
│       ├── tsconfig.json
│       ├── api/
│       │   ├── client.ts             # LosslessAPI class (from lib/api/)
│       │   ├── types.ts              # All shared TypeScript interfaces
│       │   ├── cache.ts              # APICache
│       │   └── index.ts
│       ├── hooks/
│       │   ├── use-search.ts
│       │   ├── use-album.ts
│       │   └── use-lyrics.ts
│       └── utils/
│           └── index.ts              # Shared formatters, helpers
├── apps/
│   ├── web/                          # Current Next.js app (moved here)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── app/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── lib/
│   └── mobile/                       # New Expo app
│       ├── package.json
│       ├── app.json
│       ├── metro.config.js           # withNativewind Metro config
│       ├── postcss.config.mjs        # @tailwindcss/postcss
│       ├── app/                      # Expo Router file-based routes
│       ├── components/
│       ├── contexts/
│       ├── hooks/
│       ├── src/
│       │   ├── global.css            # Tailwind imports + theme vars
│       │   └── tw/                   # CSS-wrapped component primitives
│       │       ├── index.tsx          # View, Text, ScrollView, Pressable
│       │       ├── image.tsx          # expo-image with CSS support
│       │       └── animated.tsx       # Reanimated + CSS wrappers
│       └── tsconfig.json
└── instances.json                    # Shared API endpoints (root level)
```

## 2. Mobile Route Structure & Navigation

Using Expo Router with NativeTabs and native Stack navigation.

```
apps/mobile/app/
├── _layout.tsx                        # NativeTabs (root)
├── (home,search,library,settings)/
│   ├── _layout.tsx                    # Shared Stack layout
│   ├── home.tsx                       # Home / recently played
│   ├── search.tsx                     # Search screen
│   ├── library.tsx                    # Library / favorites
│   ├── settings.tsx                   # Settings screen
│   ├── album/[id].tsx                 # Album detail (pushed from any tab)
│   └── player.tsx                     # Fullscreen player (modal)
└── lyrics.tsx                         # Lyrics modal (formSheet)
```

### Root Layout (NativeTabs)

```tsx
// app/_layout.tsx
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";

export default function Layout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="house" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" role="search" />
      <NativeTabs.Trigger name="(library)">
        <Icon sf="square.stack" />
        <Label>Library</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

### Shared Stack Layout

```tsx
// app/(home,search,library,settings)/_layout.tsx
import { Stack } from "expo-router/stack";
import { PlatformColor } from "react-native";

export default function Layout({ segment }) {
  const screen = segment.match(/\((.*)\)/)?.[1]!;
  const titles = { home: "Side A", search: "Search", library: "Library", settings: "Settings" };

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: PlatformColor("label") },
        headerLargeTitle: true,
        headerBlurEffect: "none",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name={screen} options={{ title: titles[screen] }} />
      <Stack.Screen name="album/[id]" options={{ headerLargeTitle: false }} />
      <Stack.Screen name="player" options={{ presentation: "modal" }} />
    </Stack>
  );
}
```

### Lyrics Sheet

```tsx
// app/lyrics.tsx — presented as formSheet
<Stack.Screen
  name="lyrics"
  options={{
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
    contentStyle: { backgroundColor: "transparent" },
  }}
/>
```

## 3. Component Architecture

```
apps/mobile/
├── components/
│   ├── player/
│   │   ├── mini-player.tsx            # Bottom bar overlay above tabs
│   │   ├── fullscreen-player.tsx      # Album art, controls, progress
│   │   ├── queue-list.tsx             # Draggable queue (FlashList)
│   │   └── progress-bar.tsx           # Seek bar with gesture handler
│   ├── search/
│   │   ├── search-results.tsx         # FlashList with item types
│   │   ├── track-row.tsx              # Memoized track item
│   │   ├── album-card.tsx             # Album grid item
│   │   └── artist-card.tsx            # Artist item
│   ├── album/
│   │   ├── album-header.tsx           # Art + metadata
│   │   └── track-list.tsx             # Album tracks list
│   ├── lyrics/
│   │   └── lyrics-view.tsx            # Synced lyrics with auto-scroll
│   ├── library/
│   │   ├── favorites-list.tsx         # Saved tracks
│   │   └── recent-list.tsx            # Recently played
│   └── common/
│       ├── cover-image.tsx            # expo-image wrapper for album art
│       └── themed-text.tsx            # Branded monospace text component
├── contexts/
│   ├── audio-context.tsx              # expo-audio playback + queue state
│   ├── library-context.tsx            # Favorites/recents (persisted)
│   └── theme-context.tsx              # Dark/light mode
├── hooks/
│   ├── use-audio-player.ts            # expo-audio controls
│   ├── use-queue.ts                   # Queue management
│   ├── use-media-session.ts           # Lock screen / notification controls
│   └── use-haptics.ts                 # Conditional iOS haptics
```

### Key Patterns

- **NativeWind v5 + Tailwind CSS v4** for all styling via className prop
- **CSS-wrapped primitives** from `src/tw/` — View, Text, ScrollView, Pressable, Image
- **FlashList** for all large lists (search results, queue, album tracks)
- **React.memo** on all list item components with stable callback refs
- **expo-image** for album art with blurhash placeholders and transitions
- **expo-haptics** conditionally on iOS for play/pause, skip, queue reorder
- **Kebab-case** filenames throughout
- **ScrollView** with `contentInsetAdjustmentBehavior="automatic"` on every screen
- **`borderCurve: 'continuous'`** via `rounded-continuous` utility
- **`boxShadow`** via Tailwind shadow classes (not legacy shadow/elevation)
- **Platform-specific styles** via `@media ios` / `@media android` in CSS
- **Apple system colors** via CSS variables (`--sf-blue`, `--sf-text`, etc.)

### Styling Setup

```bash
# NativeWind v5 dependencies
npx expo install tailwindcss@^4 nativewind@5.0.0-preview.2 \
  react-native-css@0.0.0-nightly.5ce6396 @tailwindcss/postcss \
  tailwind-merge clsx
```

- Metro config: `withNativewind` wrapper with `inlineVariables: false`
- PostCSS config: `@tailwindcss/postcss` plugin
- Global CSS: Tailwind imports + custom theme vars + platform font families
- Components import from `@/tw` instead of `react-native` directly
- No babel.config.js needed for NativeWind v5

### Shared Tailwind Patterns (Web <-> Mobile)

Since both web and mobile use Tailwind, utility class patterns are shared mentally
(same `gap-4`, `p-4`, `text-xl`, `rounded-lg` vocabulary) even though the
runtimes differ (web CSS vs react-native-css). Custom theme tokens in
`global.css` can mirror the web's `tailwind.config.ts` values for brand consistency.

## 4. Data Flow & Shared Package

```
packages/shared/
├── package.json                       # @bitperfect/shared
├── api/
│   ├── client.ts                      # LosslessAPI class (unchanged)
│   ├── types.ts                       # Track, Album, Artist, SearchResult, etc.
│   ├── cache.ts                       # APICache (in-memory, max 200, 30min TTL)
│   └── index.ts                       # Export singleton + factory
├── hooks/
│   ├── use-search.ts
│   ├── use-album.ts
│   └── use-lyrics.ts
└── utils/
    ├── format.ts                      # formatDuration, formatNumber, etc.
    └── index.ts
```

### What Gets Shared

- **LosslessAPI** class + all TypeScript interfaces
- **APICache** logic
- **Utility functions** (formatDuration, formatNumber)
- **instances.json** endpoint list (root level)

### What Stays Platform-Specific

**Web only:**
- useMediaSession (Web Media Session API)
- usePWAInstall
- All Tailwind CSS UI
- react-window virtualization
- @dnd-kit drag-and-drop

**Mobile only:**
- use-audio-player (expo-audio)
- use-haptics (expo-haptics)
- use-media-session (native Now Playing)
- FlashList virtualization
- Gesture Handler drag-and-drop
- expo-sqlite for library persistence

### Platform Wrapping Pattern

Each platform wraps shared API with its own data-fetching layer:

```ts
// apps/web/hooks/useSearch.ts
import { api } from "@bitperfect/shared";
import { useQuery } from "@tanstack/react-query";
// wraps api.searchTracks() with React Query + web-specific options

// apps/mobile/hooks/use-search.ts
import { api } from "@bitperfect/shared";
import { useQuery } from "@tanstack/react-query";
// wraps api.searchTracks() with React Query + mobile-specific options
```

## 5. Audio Playback Architecture

### State & Controls Interface

```tsx
interface AudioState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
}

interface AudioControls {
  playTrack: (track: Track) => void;
  playAlbum: (tracks: Track[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  seekTo: (position: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  setRepeatMode: (mode: "off" | "all" | "one") => void;
  setShuffle: (enabled: boolean) => void;
}
```

### Playback Flow

1. User taps track -> `playTrack()` called
2. Fetch stream URL via `api.getStreamUrl(trackId, quality)` from shared package
3. Decode base64 manifest -> extract direct stream URL
4. Create expo-audio player instance with the URL
5. Configure background audio mode
6. Update AudioState on playback status changes
7. On track end -> auto-advance queue via `skipNext()`

### Background Audio Config (app.json)

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "permissions": ["FOREGROUND_SERVICE"]
    }
  }
}
```

### Lock Screen Controls

- **Android:** Notification media controls via expo-audio AudioPlayer notification support
- **iOS:** NowPlayingInfo — track title, artist, album art, progress bar
- **Both:** Play/pause, skip next, skip previous from lock screen

### Mirror Web API

The AudioContext mirrors the web AudioPlayerContext API — same method names, same state shape. Only the underlying audio engine (expo-audio vs HTML5 Audio) differs.

## 6. Implementation Order

1. ~~**Monorepo setup** — Turborepo config, move web app to apps/web/, create packages/shared/~~ DONE
2. ~~**Extract shared code** — Move API client, types, cache, utils to packages/shared/~~ DONE
3. ~~**Verify web still works** — Update imports, test web app builds~~ DONE
4. ~~**Scaffold Expo app** — Create apps/mobile/ with Expo Router, NativeTabs, basic navigation~~ DONE
5. ~~**NativeWind setup** — Install Tailwind v4 + NativeWind v5, metro/postcss config, CSS-wrapped primitives in src/tw/, global.css with theme vars and platform fonts~~ DONE
6. **Search screen** — Connect shared API, FlashList results, headerSearchBarOptions
7. **Album detail screen** — Album header, track list, play album
8. **Audio playback** — expo-audio context, mini player, fullscreen player
9. **Queue management** — Queue list, reorder, add/remove
10. **Lyrics** — Synced lyrics view with formSheet presentation
11. **Library** — Favorites + recently played with expo-sqlite persistence
12. **Settings** — Audio quality, theme, about
13. **Polish** — Animations, haptics, context menus, link previews
