# Music Player Design — Miniplayer & Fullscreen Player

**Date:** 2026-02-10
**Status:** Approved

## Decisions

| Decision | Choice |
|----------|--------|
| Audio engine | `react-native-track-player` |
| State management | Zustand (`usePlayerStore`) |
| Transition pattern | Swipe-up animated sheet (Apple Music style) |
| Player features | Core controls + synced lyrics |
| Queue behavior | Play tapped track + surrounding context as queue |
| Miniplayer controls | Play/pause + skip next only |

## Architecture

### Audio Engine

`react-native-track-player` handles all playback, background audio, lock screen controls, and queue management. A playback service file registers with RNTP to handle remote events (play, pause, next, prev from lock screen/notification).

### State Layer

Zustand store (`usePlayerStore`) as single source of truth:
- `currentTrack` — active Track object
- `queue` — ordered list of tracks
- `isPlaying`, `isBuffering` — playback state flags
- `repeatMode`, `shuffled` — future-ready, not wired in v1
- `showLyrics` — toggle between album art and lyrics view
- Actions: `playTrack(track, context[])`, `togglePlayback()`, `skipNext()`, `skipPrev()`, `seekTo()`

### Playback Flow

1. User taps TrackRow → `playTrack(tappedTrack, surroundingTracks)`
2. Store calls `TrackPlayer.reset()`, loads queue via `TrackPlayer.add()`
3. Skips to tapped track index, starts playback
4. Store listens to RNTP events to keep state in sync

### Stream URL Resolution

Before adding a track to RNTP, resolve stream URL via `api.getStreamUrl(trackId, quality)`. Resolve current track immediately, prefetch next track's URL in background.

## File Structure

```
apps/mobile/
├── services/playback-service.ts    # RNTP remote event handler
├── stores/player-store.ts          # Zustand store
├── components/
│   ├── mini-player.tsx             # Persistent bottom bar
│   ├── fullscreen-player.tsx       # Expanded player view
│   ├── player-controls.tsx         # Play/pause/skip buttons
│   ├── seek-bar.tsx                # Progress/seek slider
│   └── lyrics-view.tsx             # Synced lyrics display
```

## Miniplayer

- Height: ~64px content + 2px progress bar
- Album art: 48x48, square, no border-radius
- Track title: single line, bold, white, truncated
- Artist name: single line, white/50, truncated
- Controls: play/pause toggle + skip next
- Progress bar: 2px thin bar at bottom edge, no thumb
- Background: solid black/90 or blur
- Tap anywhere (except controls) → expand to fullscreen
- Swipe up → expand to fullscreen
- Renders in root `_layout.tsx`, above tab bar, only when currentTrack exists
- Haptic feedback on control taps

## Fullscreen Player

### Album Art View (default)

- Drag handle: white/30 pill at top (5px x 36px)
- Album art: square, large (~300px), centered, border white/10
- Track title: bold, white, ~18px
- Artist name: white/50, ~14px
- Quality badge: monospace style
- Seek bar: custom slider, white thumb, time labels in monospace white/50
- Controls: previous / play-pause (large) / next, white, with haptics
- Lyrics button at bottom to toggle view
- Background: solid black
- Swipe down → dismiss to miniplayer

### Lyrics View (toggle)

- Album art shrinks to 48px thumbnail top-left
- Track info alongside thumbnail
- Synced lyrics fill main area, auto-scrolling
- Current line: white, bold, larger
- Surrounding lines: white/30, smaller
- Tap lyrics button to return to album art

## Animation & Gestures

### Mini → Fullscreen Transition

- Single `animationProgress` shared value (0 = mini, 1 = full)
- Driven by reanimated + gesture handler
- Tap: spring animation ~300ms, damping 20
- Swipe: gesture drives progress directly, snaps on threshold

### Animated Properties

- Container height: 64px → screen height
- Album art: 48px → ~300px, left-aligned → centered
- Track info: reposition and resize
- Controls: miniplayer controls fade out, fullscreen fade in
- Progress bar: 2px → full seek bar with thumb
- Tab bar: fade out + translate down

### Lyrics Toggle

- Album art crossfade + scale to 48px
- Lyrics fade in from below with spring
- Reversible

### Performance

- All animations on UI thread via reanimated worklets
- `useAnimatedStyle` for interpolated properties
- expo-image with priority caching for artwork

## Integration Points

- `TrackRow.onPress` → `playerStore.playTrack(track, contextTracks)`
- Root `_layout.tsx`: RNTP setup + miniplayer/fullscreen render outside tabs
- `playTrack()` resolves stream URL via `api.getStreamUrl()`
- Lyrics view calls `api.fetchLyrics()` on track change
- `addRecentlyPlayed()` fires on new track start

## Implementation Order

1. Install `react-native-track-player`, set up playback service
2. Build Zustand player store with RNTP event sync
3. Build fullscreen player (static layout first, no animation)
4. Build miniplayer (static layout)
5. Wire up TrackRow → playback
6. Add animated transition between mini/fullscreen
7. Add seek bar with gesture handling
8. Add synced lyrics view
9. Add lock screen / notification controls

## Notes

- Requires native build (no Expo Go) — use `npx expo run:ios` or EAS dev client
- Shuffle/repeat toggles, queue view, AirPlay deferred to v2
