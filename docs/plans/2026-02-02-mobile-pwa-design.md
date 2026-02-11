# SIDE A# Mobile PWA Design Revisions - bitperfectate**: 2026-02-02
**Status**: Approved
**Type**: Mobile-optimized Progressive Web App

---

## Overview

Enhance the existing Next.js web app with mobile-responsive UI and PWA capabilities. Single codebase approach - no separate native app.

**Goals:**
- Mobile-first responsive UI across all areas
- PWA with install prompt and service worker caching
- Push notifications with media controls
- Touch-optimized interactions (44px minimum targets)

**Priority order:**
1. Core essentials (responsive UI, PWA manifest, service worker, install prompt)
2. Notifications (media session, push notifications)
3. Advanced features (offline, gestures, haptics) - future

---

## 1. Mobile App Shell & Navigation

### Bottom Tab Bar

```
┌─────────────────────────────────────┐
│                                     │
│           Content Area              │
│                                     │
├─────────────────────────────────────┤
│      Mini Player Bar (64px)         │
├─────────────────────────────────────┤
│  🏠    🔍    📚    ⚙️              │
│ Home  Search Library Settings       │
└─────────────────────────────────────┘
```

### Specifications

| Property | Value |
|----------|-------|
| Tab bar height | 56px + `env(safe-area-inset-bottom)` |
| Icon size | 24px |
| Label | 9px monospace uppercase |
| Active indicator | 2px top border white |
| Background | `bg-black border-t border-white/10` |

### Responsive Breakpoints

| Breakpoint | Navigation |
|------------|------------|
| `< 1024px` | Bottom tab bar, hide sidebar |
| `≥ 1024px` | Desktop sidebar, hide tab bar |

### Component: `MobileNav.tsx`

```tsx
interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const tabs: Tab[] = [
  { id: 'home', label: 'HOME', icon: Home, href: '/' },
  { id: 'search', label: 'SEARCH', icon: Search, href: '/search' },
  { id: 'library', label: 'LIBRARY', icon: Library, href: '/library' },
  { id: 'settings', label: 'SETTINGS', icon: Settings, href: '/settings' },
];
```

---

## 2. Mobile Player

### Mini Player Bar (Collapsed)

```
┌─────────────────────────────────────┐
│ [40px]  Title              ▶ ▶▶    │
│  cover  Artist             ⏸ skip   │
├─────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  ← 2px progress bar
└─────────────────────────────────────┘
```

### Mini Player Specifications

| Property | Value |
|----------|-------|
| Height | 64px + 2px progress |
| Cover art | 40x40px, square, no radius |
| Play/Pause touch target | 44x44px |
| Skip touch target | 44x44px |
| Tap action | Expand to fullscreen |
| Swipe up | Expand to fullscreen |

### Fullscreen Player (Expanded)

```
┌─────────────────────────────────────┐
│  ▼ (collapse)          ⋯ (menu)    │
│                                     │
│      ┌─────────────────────┐       │
│      │                     │       │
│      │    Cover Art        │       │
│      │    (80vw x 80vw)    │       │
│      │                     │       │
│      └─────────────────────┘       │
│                                     │
│         TRACK TITLE                 │
│         Artist Name                 │
│                                     │
│  0:00 ━━━━━━━━●━━━━━━━━━━━ 3:45    │
│                                     │
│      ◀◀    ▶/⏸    ▶▶             │
│       ↻      🔊     ≡              │
│     repeat  volume  queue          │
└─────────────────────────────────────┘
```

### Fullscreen Specifications

| Property | Value |
|----------|-------|
| Cover art | 80vw × 80vw, max 400px |
| Title | 18px semibold white |
| Artist | 14px white/60 |
| Control buttons | 48x48px touch targets |
| Seek bar | 48px touch height, 4px visual |
| Swipe down | Collapse to mini player |
| Swipe left/right | Prev/next track |

---

## 3. Mobile Search & Track Lists

### Search Header

```
┌─────────────────────────────────────┐
│  ═══  SIDE A                        │
├─────────────────────────────────────┤
│  🔍  SEARCH MUSIC_____________ [X]  │
└─────────────────────────────────────┘
```

### Search Specifications

| Property | Value |
|----------|-------|
| Input | Full width, bottom border only |
| Placeholder | "SEARCH MUSIC" monospace uppercase |
| Clear button | 44x44px, appears when has text |
| Header | Sticky with `backdrop-blur-xl` |

### Track Row (Mobile)

```
┌─────────────────────────────────────┐
│ [40px]  Track Title          3:45  │
│  cover  Artist Name          HI-RES │
│─────────────────────────────────────│
```

### Track Row Specifications

| Property | Value |
|----------|-------|
| Grid | `grid-cols-[40px_1fr_auto]` |
| Row height | ~64px (py-3) |
| Cover | 40x40px square |
| Title | 15px white/90 |
| Artist | 13px white/50 |
| Duration | 12px mono white/40 |
| Tap action | Play track |
| Long press | Context menu |
| Active state | 3px left border white |

### Results Tabs

```
┌─────────────────────────────────────┐
│ TRACKS | ALBUMS | ARTISTS | PLAYLI… │
│ ═══════                             │
└─────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Scroll | Horizontal overflow |
| Label | 10px mono uppercase tracking-widest |
| Active | 2px bottom border white |
| Inactive | white/40 |

---

## 4. PWA Configuration

### Manifest (`app/manifest.json`)

```json
{
  "name": "SIDE A - Hi-Fi Music",
  "short_name": "SIDE A",
  "description": "Hi-Fi music search and playback",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker Strategy

| Resource | Strategy |
|----------|----------|
| Static assets (JS, CSS, fonts) | Cache-first |
| API calls (search, tracks) | Network-first |
| Album art images | Stale-while-revalidate |
| Audio streams | Network-only (no cache) |

### Install Prompt Banner

```
┌─────────────────────────────────────┐
│ ═══  INSTALL SIDE A           [X]  │
│      Add to home screen for        │
│      the best experience           │
│                     [INSTALL]      │
└─────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Show after | 2 sessions or 30s use |
| Dismiss | Remember in localStorage |
| Android | Use `beforeinstallprompt` |
| iOS | Show manual instructions |

---

## 5. Notifications & Media Controls

### Media Session API

```typescript
// Enhanced artwork sizes for notifications
navigator.mediaSession.metadata = new MediaMetadata({
  title: track.title,
  artist: track.artist,
  album: track.album,
  artwork: [
    { src: coverUrl96, sizes: '96x96', type: 'image/jpeg' },
    { src: coverUrl128, sizes: '128x128', type: 'image/jpeg' },
    { src: coverUrl256, sizes: '256x256', type: 'image/jpeg' },
    { src: coverUrl512, sizes: '512x512', type: 'image/jpeg' }
  ]
});

// Action handlers
navigator.mediaSession.setActionHandler('play', play);
navigator.mediaSession.setActionHandler('pause', pause);
navigator.mediaSession.setActionHandler('previoustrack', previous);
navigator.mediaSession.setActionHandler('nexttrack', next);
navigator.mediaSession.setActionHandler('seekto', (details) => {
  if (details.seekTime !== undefined) {
    seekTo(details.seekTime);
  }
});
navigator.mediaSession.setActionHandler('seekbackward', (details) => {
  seekBy(-(details.seekOffset || 10));
});
navigator.mediaSession.setActionHandler('seekforward', (details) => {
  seekBy(details.seekOffset || 10);
});
```

### Platform Integration

| Platform | Features |
|----------|----------|
| Android | Media notification with cover, controls, seek bar |
| iOS | Control Center, lock screen controls |
| Bluetooth | Play/pause, skip via Media Session |

### Push Notification Types (Future Phase)

| Type | Trigger | Content |
|------|---------|---------|
| Now Playing | Track starts | Cover, title, artist, actions |
| Queue Update | Track added | "Added: Track Name" |

---

## 6. File Structure

### New Files

```
app/
├── manifest.ts                   # Next.js metadata manifest
│
components/
├── mobile/
│   ├── MobileNav.tsx             # Bottom tab bar
│   ├── MobileAppShell.tsx        # Mobile layout wrapper
│   ├── MiniPlayer.tsx            # Collapsed player bar
│   ├── MobileTrackRow.tsx        # Touch-optimized track row
│   ├── InstallPrompt.tsx         # PWA install banner
│   └── MobileSearchHeader.tsx    # Mobile search UI
│
hooks/
├── usePWAInstall.ts              # Install prompt logic
├── useMediaSession.ts            # Enhanced media session hook
└── useMobileDetect.ts            # Viewport/touch detection

public/
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
```

### Dependencies

```json
{
  "@ducanh2912/next-pwa": "^5.6.0"
}
```

---

## 7. Implementation Phases

### Phase 1: Mobile Navigation & Shell
- [ ] Create `MobileNav.tsx` bottom tab bar
- [ ] Create `MobileAppShell.tsx` layout wrapper
- [ ] Update `AppLayout.tsx` with responsive breakpoints
- [ ] Add safe area inset handling
- [ ] Test on iOS Safari and Android Chrome

### Phase 2: Mobile Player
- [ ] Create `MiniPlayer.tsx` collapsed bar
- [ ] Update `FullscreenPlayer.tsx` with swipe gestures
- [ ] Add touch-optimized controls (44px targets)
- [ ] Implement expand/collapse animations
- [ ] Position mini player above tab bar

### Phase 3: Mobile Search & Lists
- [ ] Create `MobileSearchHeader.tsx`
- [ ] Create `MobileTrackRow.tsx` with long-press
- [ ] Update results tabs for horizontal scroll
- [ ] Optimize virtual list for touch scrolling

### Phase 4: PWA Setup
- [ ] Add `manifest.ts` to app directory
- [ ] Configure `next-pwa` for service worker
- [ ] Create PWA icons (192, 512, maskable)
- [ ] Add apple-touch-icon and meta tags
- [ ] Create `InstallPrompt.tsx` banner
- [ ] Implement `usePWAInstall.ts` hook

### Phase 5: Enhanced Media Session
- [ ] Create `useMediaSession.ts` hook
- [ ] Add all artwork sizes to metadata
- [ ] Implement seek forward/backward handlers
- [ ] Test on Android and iOS lock screens

---

## 8. Design Language Compliance

All mobile components follow `docs/DESIGN_LANGUAGE.md`:

| Principle | Implementation |
|-----------|----------------|
| No rounded corners | Square cover art, sharp buttons |
| Monospace labels | Tab labels, search input, badges |
| Border accents | Active states use left/bottom borders |
| Opacity hierarchy | white/90, white/50, white/40 |
| Minimal hover | Touch uses active states instead |
| No shadows | Border-based depth only |

---

## 9. Accessibility

| Feature | Implementation |
|---------|----------------|
| Touch targets | Minimum 44x44px |
| Focus indicators | 2px white outline |
| Screen readers | ARIA labels on controls |
| Reduced motion | Respect `prefers-reduced-motion` |
| Color contrast | WCAG AA compliant |

---

## Appendix: ASCII Wireframes

### Complete Mobile Layout

```
┌─────────────────────────────────────┐
│ ═══  SIDE A            HI-FI SEARCH │  ← Header (sticky)
├─────────────────────────────────────┤
│  🔍  SEARCH MUSIC_________________  │  ← Search bar
├─────────────────────────────────────┤
│ TRACKS | ALBUMS | ARTISTS | PLAY... │  ← Tabs (scroll)
│ ═══════                             │
├─────────────────────────────────────┤
│ [■] Track Title              3:45   │
│     Artist Name             HI-RES  │
│─────────────────────────────────────│
│ [■] Track Title              4:12   │
│     Artist Name           LOSSLESS  │
│─────────────────────────────────────│
│ [■] Track Title              2:58   │
│     Artist Name             HI-RES  │
│─────────────────────────────────────│
│              ...                    │  ← Virtual scroll
├─────────────────────────────────────┤
│ [■] Now Playing         advancement ▶ ▶▶   │  ← Mini player
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
├─────────────────────────────────────┤
│  🏠    🔍    📚    ⚙️              │  ← Bottom nav
│ HOME  SEARCH LIBRARY SETTINGS       │
└─────────────────────────────────────┘
```
