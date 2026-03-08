# bitperfect-web

A high-fidelity music streaming web application with PWA support, built with Next.js and a brutalist minimalist design.

## Project Overview

bitperfect-web is a music streaming platform that connects to multiple backend instances. It features a full audio player with queue management, lyrics display, library management, and progressive web app capabilities for mobile installation.

**Note:** This project is web-only. Mobile users access the PWA directly - no separate mobile app exists.

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** React Context + TanStack Query
- **Animation:** Motion (Framer Motion)
- **Drag & Drop:** @dnd-kit
- **Package Manager:** Bun
- **Build System:** Turborepo
- **Deployment:** Vercel

## Monorepo Structure

```
bitperfect-web/
├── apps/
│   └── web/              # Next.js web application (PWA)
├── packages/
│   └── shared/           # Shared API client and utilities
└── docs/                 # Design language and planning docs
```

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev:web

# Build for production
bun run build:web
```

The app will be available at `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev:web` | Start Next.js development server |
| `bun run build:web` | Build the web app for production |
| `bun run dev` | Run all workspaces in dev mode (Turborepo) |
| `bun run build` | Build all workspaces (Turborepo) |

## App Routes

| Route | Description |
|-------|-------------|
| `/` | Home - Search and discover music |
| `/album/[id]` | Album detail page |
| `/artist/[id]` | Artist detail page |
| `/playlist/[id]` | Playlist detail page |
| `/library` | User's saved library |
| `/settings` | App settings and preferences |

## Key Features

- **Music Search:** Search across multiple backend instances
- **Audio Player:** Full-featured player with queue, shuffle, repeat
- **Lyrics:** Synchronized lyrics display
- **Library:** Save favorite albums, artists, and playlists
- **PWA:** Install as progressive web app on mobile/desktop
- **Offline Support:** Basic offline capabilities
- **Dark Theme:** Brutalist minimalist design

## Architecture

### Apps/Web Structure

```
apps/web/
├── app/                  # Next.js App Router pages
├── components/
│   ├── layout/          # Header, AppLayout
│   ├── mobile/          # PWA mobile components (MiniPlayer, MobileNav)
│   ├── player/          # Audio player, queue, lyrics
│   └── search/          # Search UI, track rows, cards
├── contexts/            # React contexts (AudioPlayer, Queue, Theme, Toast)
├── hooks/               # Custom hooks (useSearch, useDownload, usePWA)
└── lib/                 # Utilities and API client
```

### Packages/Shared Structure

```
packages/shared/
├── api/
│   ├── client.ts        # API client with instance selection
│   ├── types.ts         # TypeScript types for API responses
│   └── utils.ts         # API utilities
└── utils/               # Shared utility functions
```

## Backend Instances

The app connects to multiple music backend instances defined in `instances.json`. The API client automatically selects an available instance.

## Documentation

- [Design Language](docs/DESIGN_LANGUAGE.md) - Brutalist minimalist design system
- [Migration Plan](docs/plans/2026-02-10-nativewind-to-stylesheet-migration.md) - Styling migration notes
- [Music Player Design](docs/plans/2026-02-10-music-player-design.md) - Player component architecture

## Development Notes

- Use `bun` as the package manager (not npm)
- Follow the brutalist design language in `docs/DESIGN_LANGUAGE.md`
- Server components are preferred - only use `"use client"` when necessary
- The project is deployed on Vercel

## License

Private
