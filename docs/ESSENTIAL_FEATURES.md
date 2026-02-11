# bitperfect - Essential Features Beyond MVP

Current state: Search, playback, queue, lyrics, album pages, mobile PWA.
Below are the missing essentials grouped by priority.

---

## P0 — Must Have (Core gaps)

### 1. Library Page (`/library`)
Mobile nav links to `/library` but the route doesn't exist.
- **Favorites / Liked Tracks** — heart button on tracks, persisted list
- **Recently Played** — track playback history (last 50–100 items)
- **Saved Albums** — bookmark albums for quick access
- **Local storage persistence** (no auth = localStorage or IndexedDB)

### 2. Settings Page (`/settings`)
Mobile nav links to `/settings` but the route doesn't exist.
- **Default streaming quality** — persist quality preference (currently per-track)
- **Theme selection** — light/dark toggle (exists in header, needs dedicated settings home)
- **API instance selector** — pick or auto-select from `instances.json`
- **Cache management** — view cache size, clear cached data
- **About / version info**

### 3. Artist Detail Page (`/artist/[id]`)
Artist cards in search results have no destination page.
- Artist bio / image
- Top tracks
- Discography (albums list)
- "Play all" top tracks action

### 4. Playlist Detail Page (`/playlist/[id]`)
Playlist cards in search results have no destination page.
- Playlist cover, title, description
- Full track listing with play/queue actions
- "Play all" / "Shuffle" actions

### 5. Error Handling UI
No user-facing error states exist.
- **Error boundaries** — catch React render crashes, show recovery UI
- **API failure states** — show inline error with retry button when search/stream fails
- **Offline indicator** — banner when network is lost (PWA can still serve cached content)
- **Stream failure handling** — toast/notification when a track fails to load, auto-skip option

---

## P1 — Should Have (Expected by users)

### 6. Loading / Skeleton States
- Skeleton loaders for search results, album page, track lists
- Shimmer placeholders matching the brutalist grid layout
- Prevents layout shift and communicates progress

### 7. Keyboard Shortcuts (Desktop)
- `Space` — play/pause
- `←` / `→` — seek ±10s
- `↑` / `↓` — volume
- `N` / `P` — next/prev track
- `/` — focus search bar
- `Esc` — close fullscreen player

### 8. Search History / Suggestions
- Persist recent search queries (localStorage)
- Show recent searches when search bar is focused + empty
- Clear history option

### 9. Toast / Notification System
- "Added to queue" confirmation
- "Added to library" confirmation
- Stream quality change notification
- Error messages (track unavailable, rate limited, etc.)

### 10. Share Functionality
- Share track / album / playlist via native Web Share API
- Copy link fallback on desktop
- Deep link support so shared URLs open correct content

---

## P2 — Nice to Have (Polish)

### 11. Accessibility (a11y)
- ARIA labels on all interactive elements (player controls, search, queue)
- Keyboard focus management (focus trap in fullscreen player/modals)
- Screen reader announcements for track changes
- Sufficient color contrast (current white-on-black is fine, check opacity variants)
- Skip-to-content link

### 12. Desktop Sidebar / Navigation
- Currently desktop only has the top search bar
- Sidebar with Library, Queue, Now Playing for larger screens
- Persistent queue panel (collapsible)

### 13. Crossfade / Gapless Playback
- Smooth transition between tracks (even 0.5s crossfade)
- Pre-buffer next track before current ends

### 14. Audio Visualizer / Now Playing Animation
- Subtle waveform or frequency bars on the player
- Keeps the brutalist aesthetic — monochrome, geometric

### 15. Play Count / Stats
- Track how many times each song was played
- "Most played" section in Library
- Stats for nerds already exists — could expand

---

## Implementation Order (Suggested)

```
Phase 1 — Routes & Core Pages
  → Library page (favorites + recently played)
  → Settings page
  → Artist detail page
  → Playlist detail page

Phase 2 — Reliability & Feedback
  → Error boundaries + API error states
  → Toast notification system
  → Loading skeletons
  → Offline indicator

Phase 3 — UX Polish
  → Keyboard shortcuts
  → Search history
  → Share functionality
  → Desktop sidebar navigation

Phase 4 — Delight
  → Accessibility audit + fixes
  → Crossfade / gapless playback
  → Audio visualizer
  → Play stats
```

---

*Generated 2025-02-09 from codebase audit.*
