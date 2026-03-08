# @bitperfect/web

The web application for bitperfect - a high-fidelity music streaming PWA.

## Development

```bash
# From root
bun run dev:web

# Or from this directory
bun run dev
```

## Build

```bash
bun run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `dev` | Start Next.js development server |
| `build` | Production build (webpack) |
| `build:turbo` | Production build (Turbopack) |
| `start` | Start production server |
| `lint` | Run ESLint |

## Structure

```
apps/web/
├── app/              # Next.js App Router
│   ├── album/       # Album detail pages
│   ├── artist/      # Artist detail pages
│   ├── library/     # User library
│   ├── playlist/    # Playlist pages
│   └── settings/    # Settings page
├── components/
│   ├── layout/      # AppLayout, Header
│   ├── mobile/      # PWA components (MiniPlayer, MobileNav, InstallPrompt)
│   ├── player/      # AudioPlayer, FullscreenPlayer, Queue, Lyrics
│   └── search/      # SearchBar, TrackRow, AlbumCard, ArtistCard
├── contexts/        # React contexts
│   ├── AudioPlayerContext.tsx
│   ├── QueueContext.tsx
│   ├── ThemeContext.tsx
│   └── ToastContext.tsx
├── hooks/           # Custom hooks
│   ├── useSearch.ts
│   ├── useDownload.ts
│   ├── usePWAInstall.ts
│   └── useMediaSession.ts
└── lib/             # Utilities
    ├── api/         # API client
    ├── storage.ts   # Local storage helpers
    └── performance.ts
```

## Key Dependencies

- **next** - React framework with App Router
- **react** / **react-dom** - React 19
- **motion** - Animations
- **@dnd-kit** - Drag and drop for queue
- **@tanstack/react-query** - Data fetching
- **tailwindcss** - Styling
- **lucide-react** - Icons

## PWA Features

This app is a Progressive Web App with:
- Service worker for offline support
- Install prompt for mobile/desktop
- Media session API for system controls

## Design

See [Design Language](../../docs/DESIGN_LANGUAGE.md) for the brutalist minimalist design system.
