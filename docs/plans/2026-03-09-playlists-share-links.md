# Mobile Playlists & Share Links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add playlist management and shareable links to bitperfect-web with mobile-first UX and cache-conscious architecture

**Architecture:** Store playlists in localStorage with lazy-loaded track metadata. Share links encode playlist data in URL hash fragments for stateless sharing without backend. Cache only active playlist tracks, evicting on memory pressure.

**Tech Stack:** Next.js App Router, localStorage, URL hash fragments, React Context, optimistic UI

**Key Constraint:** No cache bloat - store only playlist IDs locally, fetch track data on-demand with LRU eviction

---

## Current State Analysis

From codebase review:
- `PersistenceContext` already manages likedTracks, history, savedAlbums in localStorage
- `usePersistence()` hook provides CRUD operations
- Tracks have unique `id` field
- Mobile components exist in `components/mobile/`
- Share functionality needs to work across devices (URL-based)

---

## Phase 1: Core Playlist Data Model

### Task 1: Extend UserData Type with Playlist Support

**Files:**
- Modify: `apps/web/lib/storage.ts`
- Test: `apps/web/lib/storage.test.ts` (create if doesn't exist)

**Step 1: Add Playlist type definition**

```typescript
// In apps/web/lib/storage.ts
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: number[];
  createdAt: string;
  updatedAt: string;
  coverArt?: string; // URL to first track's album art
}

export interface UserData {
  likedTracks: Track[];
  history: Track[];
  savedAlbums: Album[];
  playlists: Playlist[];
  settings: {
    quality: "LOW" | "HIGH" | "LOSSLESS";
    theme: "light" | "dark";
  };
}

export const DEFAULT_USER_DATA: UserData = {
  likedTracks: [],
  history: [],
  savedAlbums: [],
  playlists: [],
  settings: {
    quality: "HIGH",
    theme: "dark",
  },
};
```

**Step 2: Test storage serialization**

```typescript
// apps/web/lib/storage.test.ts
import { storage, Playlist, DEFAULT_USER_DATA } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saves and loads playlists', () => {
    const playlist: Playlist = {
      id: 'playlist-1',
      name: 'Test Playlist',
      trackIds: [1, 2, 3],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const data = { ...DEFAULT_USER_DATA, playlists: [playlist] };
    storage.save(data);
    
    const loaded = storage.load();
    expect(loaded.playlists).toHaveLength(1);
    expect(loaded.playlists[0].name).toBe('Test Playlist');
  });
});
```

**Step 3: Run test**

```bash
cd apps/web && npm test -- storage.test.ts
```

**Step 4: Commit**

```bash
git add apps/web/lib/storage.ts apps/web/lib/storage.test.ts
git commit -m "feat: add Playlist type to storage model"
```

---

## Phase 2: Playlist Context & CRUD Operations

### Task 2: Extend PersistenceContext with Playlist Methods

**Files:**
- Modify: `apps/web/contexts/PersistenceContext.tsx`

**Step 1: Add playlist methods to context interface**

```typescript
// Add to PersistenceContextType interface
interface PersistenceContextType extends UserData {
  // ... existing methods
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: number) => void;
  reorderPlaylistTracks: (playlistId: string, trackIds: number[]) => void;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
  getPlaylist: (playlistId: string) => Playlist | undefined;
}
```

**Step 2: Implement createPlaylist**

```typescript
const createPlaylist = useCallback((name: string, description?: string) => {
  const newPlaylist: Playlist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    trackIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  setData((prev) => ({
    ...prev,
    playlists: [newPlaylist, ...prev.playlists],
  }));
  
  success(`Created playlist "${name}"`);
  return newPlaylist;
}, [success]);
```

**Step 3: Implement deletePlaylist**

```typescript
const deletePlaylist = useCallback((playlistId: string) => {
  setData((prev) => ({
    ...prev,
    playlists: prev.playlists.filter((p) => p.id !== playlistId),
  }));
  success('Playlist deleted');
}, [success]);
```

**Step 4: Implement addTrackToPlaylist**

```typescript
const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
  setData((prev) => {
    const playlist = prev.playlists.find((p) => p.id === playlistId);
    if (!playlist) return prev;
    
    if (playlist.trackIds.includes(track.id)) {
      toast('Track already in playlist', 'info');
      return prev;
    }
    
    const updatedPlaylists = prev.playlists.map((p) =>
      p.id === playlistId
        ? {
            ...p,
            trackIds: [...p.trackIds, track.id],
            updatedAt: new Date().toISOString(),
            coverArt: p.coverArt || track.album?.cover_xl || track.album?.cover_big,
          }
        : p
    );
    
    return { ...prev, playlists: updatedPlaylists };
  });
  
  success(`Added to playlist`);
}, [success, toast]);
```

**Step 5: Implement removeTrackFromPlaylist**

```typescript
const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: number) => {
  setData((prev) => ({
    ...prev,
    playlists: prev.playlists.map((p) =>
      p.id === playlistId
        ? {
            ...p,
            trackIds: p.trackIds.filter((id) => id !== trackId),
            updatedAt: new Date().toISOString(),
          }
        : p
    ),
  }));
}, []);
```

**Step 6: Implement reorderPlaylistTracks**

```typescript
const reorderPlaylistTracks = useCallback((playlistId: string, trackIds: number[]) => {
  setData((prev) => ({
    ...prev,
    playlists: prev.playlists.map((p) =>
      p.id === playlistId
        ? { ...p, trackIds, updatedAt: new Date().toISOString() }
        : p
    ),
  }));
}, []);
```

**Step 7: Implement updatePlaylist and getPlaylist**

```typescript
const updatePlaylist = useCallback((playlistId: string, updates: Partial<Playlist>) => {
  setData((prev) => ({
    ...prev,
    playlists: prev.playlists.map((p) =>
      p.id === playlistId
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    ),
  }));
}, []);

const getPlaylist = useCallback((playlistId: string) => {
  return data.playlists.find((p) => p.id === playlistId);
}, [data.playlists]);
```

**Step 8: Export methods in context provider**

```typescript
return (
  <PersistenceContext.Provider
    value={{
      ...data,
      // ... existing methods
      createPlaylist,
      deletePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      reorderPlaylistTracks,
      updatePlaylist,
      getPlaylist,
    }}
  >
    {children}
  </PersistenceContext.Provider>
);
```

**Step 9: Commit**

```bash
git add apps/web/contexts/PersistenceContext.tsx
git commit -m "feat: add playlist CRUD operations to PersistenceContext"
```

---

## Phase 3: Playlist Track Cache (LRU Strategy)

### Task 3: Create PlaylistTrackCache for On-Demand Track Loading

**Files:**
- Create: `apps/web/lib/playlistCache.ts`
- Test: `apps/web/lib/playlistCache.test.ts`

**Step 1: Create LRU cache implementation**

```typescript
// apps/web/lib/playlistCache.ts
import { Track } from "@bitperfect/shared/api";

interface CacheEntry {
  track: Track;
  lastAccessed: number;
}

const MAX_CACHE_SIZE = 50; // Only keep 50 tracks in memory

class PlaylistTrackCache {
  private cache = new Map<number, CacheEntry>();
  
  get(trackId: number): Track | undefined {
    const entry = this.cache.get(trackId);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.track;
    }
    return undefined;
  }
  
  set(trackId: number, track: Track): void {
    // Evict oldest if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE) {
      let oldestId: number | null = null;
      let oldestTime = Infinity;
      
      this.cache.forEach((entry, id) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestId = id;
        }
      });
      
      if (oldestId !== null) {
        this.cache.delete(oldestId);
      }
    }
    
    this.cache.set(trackId, {
      track,
      lastAccessed: Date.now(),
    });
  }
  
  getMultiple(trackIds: number[]): Track[] {
    return trackIds
      .map((id) => this.get(id))
      .filter((t): t is Track => t !== undefined);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

export const playlistTrackCache = new PlaylistTrackCache();
```

**Step 2: Write tests**

```typescript
// apps/web/lib/playlistCache.test.ts
import { playlistTrackCache } from './playlistCache';
import { Track } from '@bitperfect/shared/api';

describe('playlistTrackCache', () => {
  beforeEach(() => {
    playlistTrackCache.clear();
  });

  test('stores and retrieves tracks', () => {
    const track: Track = { id: 1, title: 'Test', duration: 180 } as Track;
    playlistTrackCache.set(1, track);
    
    expect(playlistTrackCache.get(1)).toEqual(track);
  });

  test('evicts oldest entries when full', () => {
    // Fill cache beyond limit
    for (let i = 0; i < 55; i++) {
      playlistTrackCache.set(i, { id: i, title: `Track ${i}` } as Track);
    }
    
    expect(playlistTrackCache.size).toBeLessThanOrEqual(50);
  });
});
```

**Step 3: Run tests**

```bash
npm test -- playlistCache.test.ts
```

**Step 4: Commit**

```bash
git add apps/web/lib/playlistCache.ts apps/web/lib/playlistCache.test.ts
git commit -m "feat: add LRU playlist track cache to prevent memory bloat"
```

---

## Phase 4: Playlist API Hook (Lazy Loading)

### Task 4: Create usePlaylistTracks Hook for On-Demand Loading

**Files:**
- Create: `apps/web/hooks/usePlaylistTracks.ts`

**Step 1: Create hook with lazy loading**

```typescript
// apps/web/hooks/usePlaylistTracks.ts
import { useState, useEffect, useCallback } from 'react';
import { Track } from '@bitperfect/shared/api';
import { api } from '@/lib/api';
import { playlistTrackCache } from '@/lib/playlistCache';

interface UsePlaylistTracksResult {
  tracks: Track[];
  isLoading: boolean;
  loadTracks: (trackIds: number[]) => Promise<void>;
  loadTrack: (trackId: number) => Promise<Track | null>;
}

export function usePlaylistTracks(): UsePlaylistTracksResult {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadTrack = useCallback(async (trackId: number): Promise<Track | null> => {
    // Check cache first
    const cached = playlistTrackCache.get(trackId);
    if (cached) return cached;
    
    // Fetch from API
    try {
      const track = await api.getTrack(trackId);
      if (track) {
        playlistTrackCache.set(trackId, track);
      }
      return track;
    } catch (error) {
      console.error('Failed to load track:', error);
      return null;
    }
  }, []);
  
  const loadTracks = useCallback(async (trackIds: number[]) => {
    setIsLoading(true);
    
    // Load in batches of 10 to avoid overwhelming the API
    const loadedTracks: Track[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((id) => loadTrack(id))
      );
      
      loadedTracks.push(...batchResults.filter((t): t is Track => t !== null));
      
      // Update state incrementally for better UX
      setTracks([...loadedTracks]);
    }
    
    setIsLoading(false);
  }, [loadTrack]);
  
  return { tracks, isLoading, loadTracks, loadTrack };
}
```

**Step 2: Add getTrack method to API client**

```typescript
// In apps/web/lib/api/client.ts
async getTrack(trackId: number): Promise<Track | null> {
  try {
    const response = await this.fetchFromInstance(`/track/${trackId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
```

**Step 3: Commit**

```bash
git add apps/web/hooks/usePlaylistTracks.ts apps/web/lib/api/client.ts
git commit -m "feat: add usePlaylistTracks hook with lazy loading and caching"
```

---

## Phase 5: Share Links System

### Task 5: Create Share Link Utilities

**Files:**
- Create: `apps/web/lib/shareLinks.ts`
- Test: `apps/web/lib/shareLinks.test.ts`

**Step 1: Create encode/decode functions**

```typescript
// apps/web/lib/shareLinks.ts
import { Playlist } from './storage';
import { Track } from '@bitperfect/shared/api';

export interface SharedPlaylist {
  name: string;
  description?: string;
  tracks: Array<{
    id: number;
    title: string;
    artist: string;
    album?: string;
    duration: number;
  }>;
}

/**
 * Encode playlist data for URL sharing
 * Uses base64url encoding of compressed JSON
 */
export function encodePlaylistForShare(playlist: Playlist, tracks: Track[]): string {
  const shareData: SharedPlaylist = {
    name: playlist.name,
    description: playlist.description,
    tracks: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist?.name || 'Unknown Artist',
      album: t.album?.title,
      duration: t.duration,
    })),
  };
  
  const json = JSON.stringify(shareData);
  const compressed = compress(json);
  return btoa(compressed)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode shared playlist from URL hash
 */
export function decodePlaylistFromShare(encoded: string): SharedPlaylist | null {
  try {
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const compressed = atob(base64);
    const json = decompress(compressed);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Generate shareable URL for playlist
 */
export function generateShareUrl(playlist: Playlist, tracks: Track[]): string {
  const encoded = encodePlaylistForShare(playlist, tracks);
  return `${window.location.origin}/playlist/shared#${encoded}`;
}

// Simple compression - replace with pako or similar if URLs get too long
function compress(str: string): string {
  // For now, just return as-is. If playlists get large,
  // we can add pako.deflate here
  return str;
}

function decompress(str: string): string {
  return str;
}
```

**Step 2: Write tests**

```typescript
// apps/web/lib/shareLinks.test.ts
import { encodePlaylistForShare, decodePlaylistFromShare, SharedPlaylist } from './shareLinks';
import { Playlist } from './storage';
import { Track } from '@bitperfect/shared/api';

describe('shareLinks', () => {
  const mockPlaylist: Playlist = {
    id: 'test-123',
    name: 'My Test Playlist',
    description: 'A test playlist',
    trackIds: [1, 2],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const mockTracks: Track[] = [
    { id: 1, title: 'Song 1', duration: 180, artist: { name: 'Artist 1' } } as Track,
    { id: 2, title: 'Song 2', duration: 200, artist: { name: 'Artist 2' } } as Track,
  ];

  test('encodes and decodes playlist', () => {
    const encoded = encodePlaylistForShare(mockPlaylist, mockTracks);
    const decoded = decodePlaylistFromShare(encoded);
    
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe('My Test Playlist');
    expect(decoded!.tracks).toHaveLength(2);
    expect(decoded!.tracks[0].title).toBe('Song 1');
  });

  test('returns null for invalid data', () => {
    const result = decodePlaylistFromShare('invalid-base64!!!');
    expect(result).toBeNull();
  });
});
```

**Step 3: Run tests**

```bash
npm test -- shareLinks.test.ts
```

**Step 4: Commit**

```bash
git add apps/web/lib/shareLinks.ts apps/web/lib/shareLinks.test.ts
git commit -m "feat: add playlist share link encoding/decoding"
```

---

## Phase 5b: QR Code Sharing (For Playlists > 10 Songs)

### Task 5b.1: Install QR Code Libraries

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install QR libraries**

```bash
cd apps/web && npm install qrcode.react jsqr
```

**Step 2: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add QR code libraries for playlist sharing"
```

---

### Task 5b.2: Create QR Code Generator Component

**Files:**
- Create: `apps/web/components/playlists/PlaylistQRCode.tsx`

**Step 1: Create QR code display component**

```tsx
// apps/web/components/playlists/PlaylistQRCode.tsx
"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Playlist } from "@/lib/storage";
import { Track } from "@bitperfect/shared/api";
import { X, Download, Share2 } from "lucide-react";
import { encodePlaylistForShare } from "@/lib/shareLinks";
import { motion, AnimatePresence } from "framer-motion";

interface PlaylistQRCodeProps {
  playlist: Playlist;
  tracks: Track[];
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistQRCode({ playlist, tracks, isOpen, onClose }: PlaylistQRCodeProps) {
  const [showCopied, setShowCopied] = useState(false);
  
  // Generate data for QR code
  const qrData = encodePlaylistForShare(playlist, tracks);
  
  // QR codes can hold ~3KB, which is roughly 100-150 tracks
  // For very large playlists, we'll warn the user
  const isLargePlaylist = tracks.length > 100;
  
  const handleDownload = () => {
    const svg = document.getElementById("playlist-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${playlist.name.replace(/\s+/g, "_")}_qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-background border border-foreground/10 p-6 max-w-sm w-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-medium">Share Playlist</h3>
                  <p className="text-xs text-foreground/50 mt-1">
                    Scan with phone camera
                  </p>
                </div>
                <button onClick={onClose} className="p-1 hover:text-foreground/70">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning for large playlists */}
              {isLargePlaylist && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-500">
                  Large playlist ({tracks.length} tracks). QR code may be dense.
                </div>
              )}

              {/* QR Code */}
              <div className="flex justify-center mb-6 p-4 bg-white rounded-lg">
                <QRCodeSVG
                  id="playlist-qr-code"
                  value={qrData}
                  size={256}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Playlist Info */}
              <div className="text-center mb-6">
                <h4 className="font-medium truncate">{playlist.name}</h4>
                <p className="text-xs text-foreground/50">
                  {tracks.length} tracks
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                           border border-foreground/20 hover:border-foreground/40 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrData);
                    setShowCopied(true);
                    setTimeout(() => setShowCopied(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                           bg-foreground text-background hover:bg-foreground/90 text-sm"
                >
                  <Share2 className="w-4 h-4" />
                  {showCopied ? "Copied!" : "Copy Data"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/playlists/PlaylistQRCode.tsx
git commit -m "feat: add PlaylistQRCode component for sharing large playlists"
```

---

### Task 5b.3: Create QR Code Scanner Component

**Files:**
- Create: `apps/web/components/playlists/QRScanner.tsx`

**Step 1: Create QR scanner component**

```tsx
// apps/web/components/playlists/QRScanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Camera, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let animationId: number;
    let stream: MediaStream | null = null;

    const startScanning = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }
      } catch (err) {
        setError("Camera access denied or not available");
        setIsScanning(false);
      }
    };

    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current) {
        animationId = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationId = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth"
      });

      if (code) {
        onScan(code.data);
        stopScanning();
        return;
      }

      animationId = requestAnimationFrame(scanFrame);
    };

    const stopScanning = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsScanning(false);
    };

    startScanning();
    animationId = requestAnimationFrame(scanFrame);

    return () => {
      stopScanning();
    };
  }, [isOpen, onScan]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          onScan(code.data);
          onClose();
        } else {
          setError("No QR code found in image");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-foreground/10">
          <h3 className="font-medium">Scan Playlist QR Code</h3>
          <button onClick={onClose} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {error ? (
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <p className="text-sm text-foreground/50">
                You can also upload a QR code image
              </p>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-sm aspect-square bg-black border-2 border-foreground/20 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-foreground/50">
                Point camera at a playlist QR code
              </p>
            </>
          )}
        </div>

        {/* Upload option */}
        <div className="p-4 border-t border-foreground/10">
          <label className="flex items-center justify-center gap-2 w-full py-3 
                           border border-dashed border-foreground/30 rounded-lg 
                           cursor-pointer hover:border-foreground/50">
            <Upload className="w-5 h-5" />
            <span className="text-sm">Upload QR Code Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/playlists/QRScanner.tsx
git commit -m "feat: add QRScanner component for importing shared playlists"
```

---

### Task 5b.4: Update Playlist Detail with Smart Share Options

**Files:**
- Modify: `apps/web/app/playlist/[id]/PlaylistClient.tsx`

**Step 1: Import QR components and update share logic**

```tsx
// Add imports
import { PlaylistQRCode } from "@/components/playlists/PlaylistQRCode";
import { QRScanner } from "@/components/playlists/QRScanner";

// Add state
const [showQRCode, setShowQRCode] = useState(false);
const [showScanner, setShowScanner] = useState(false);

// Update share button handler
const handleShare = useCallback(() => {
  if (!playlist) return;
  
  if (tracks.length > 10) {
    // Use QR code for larger playlists
    setShowQRCode(true);
  } else {
    // Use URL for smaller playlists
    const url = generateShareUrl(playlist, tracks);
    navigator.clipboard.writeText(url);
    success("Playlist link copied to clipboard!");
  }
}, [playlist, tracks, success]);

// Add QR scanner button
<button
  onClick={() => setShowScanner(true)}
  className="flex items-center gap-2 px-4 py-2 border border-foreground/20 
             hover:border-foreground/40 text-sm"
>
  <Camera className="w-4 h-4" />
  Scan QR
</button>

// Render QR components
<PlaylistQRCode
  playlist={playlist}
  tracks={tracks}
  isOpen={showQRCode}
  onClose={() => setShowQRCode(false)}
/>

<QRScanner
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={(data) => {
    // Navigate to shared playlist with decoded data
    window.location.href = `/playlist/shared#${data}`;
  }}
/>
```

**Step 2: Commit**

```bash
git add apps/web/app/playlist/[id]/PlaylistClient.tsx
git commit -m "feat: implement smart share - QR for >10 tracks, URL for smaller"
```

---

## Phase 6: UI Components

### Task 6: Create PlaylistList Component

**Files:**
- Create: `apps/web/components/playlists/PlaylistList.tsx`

**Step 1: Create playlist list component**

```tsx
// apps/web/components/playlists/PlaylistList.tsx
"use client";

import { usePersistence } from "@/contexts/PersistenceContext";
import { Playlist } from "@/lib/storage";
import { ListMusic, Plus } from "lucide-react";
import Link from "next/link";

interface PlaylistListProps {
  onCreateClick: () => void;
}

export function PlaylistList({ onCreateClick }: PlaylistListProps) {
  const { playlists } = usePersistence();

  return (
    <div className="space-y-4">
      <button
        onClick={onCreateClick}
        className="w-full flex items-center gap-3 p-4 border border-dashed border-foreground/20 
                   hover:border-foreground/40 transition-colors text-left"
      >
        <Plus className="w-5 h-5 text-foreground/40" />
        <span className="text-sm font-medium">Create New Playlist</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="group block p-4 border border-foreground/10 hover:border-foreground/30 
                 transition-all hover:bg-foreground/[0.02]"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-foreground/5 border border-foreground/10 
                        flex items-center justify-center shrink-0">
          {playlist.coverArt ? (
            <img
              src={playlist.coverArt}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <ListMusic className="w-6 h-6 text-foreground/20" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate group-hover:text-foreground/90">
            {playlist.name}
          </h3>
          <p className="text-xs text-foreground/50 mt-1">
            {playlist.trackIds.length} tracks
          </p>
          {playlist.description && (
            <p className="text-xs text-foreground/30 mt-1 truncate">
              {playlist.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/playlists/PlaylistList.tsx
git commit -m "feat: add PlaylistList component with grid layout"
```

---

### Task 7: Create CreatePlaylistModal Component

**Files:**
- Create: `apps/web/components/playlists/CreatePlaylistModal.tsx`

**Step 1: Create modal component**

```tsx
// apps/web/components/playlists/CreatePlaylistModal.tsx
"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { X } from "lucide-react";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { createPlaylist } = usePersistence();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createPlaylist(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md mx-4 bg-background border border-foreground/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium">Create Playlist</h2>
          <button onClick={onClose} className="p-1 hover:text-foreground/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider 
                              text-foreground/50 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Playlist"
              className="w-full px-3 py-2 bg-transparent border border-foreground/20 
                         focus:border-foreground outline-none text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider 
                              text-foreground/50 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 bg-transparent border border-foreground/20 
                         focus:border-foreground outline-none text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-foreground/20 
                         hover:border-foreground/40 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-foreground text-background 
                         hover:bg-foreground/90 disabled:opacity-50 text-sm"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/playlists/CreatePlaylistModal.tsx
git commit -m "feat: add CreatePlaylistModal component"
```

---

### Task 8: Create AddToPlaylistMenu Component

**Files:**
- Create: `apps/web/components/playlists/AddToPlaylistMenu.tsx`

**Step 1: Create add-to-playlist menu**

```tsx
// apps/web/components/playlists/AddToPlaylistMenu.tsx
"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Plus, Check } from "lucide-react";
import { CreatePlaylistModal } from "./CreatePlaylistModal";

interface AddToPlaylistMenuProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export function AddToPlaylistMenu({ track, isOpen, onClose }: AddToPlaylistMenuProps) {
  const { playlists, addTrackToPlaylist } = usePersistence();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!isOpen) return null;

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, track);
    onClose();
  };

  return (
    <>
      <div className="absolute right-0 top-full mt-1 w-64 bg-background border 
                      border-foreground/10 shadow-lg z-50">
        <div className="p-2 border-b border-foreground/10">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left 
                       hover:bg-foreground/[0.02] text-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Playlist
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {playlists.length === 0 ? (
            <div className="p-4 text-center text-sm text-foreground/40">
              No playlists yet
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left 
                           hover:bg-foreground/[0.02] text-sm"
              >
                <ListMusic className="w-4 h-4 text-foreground/40" />
                <span className="flex-1 truncate">{playlist.name}</span>
                {playlist.trackIds.includes(track.id) && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          onClose();
        }}
      />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/playlists/AddToPlaylistMenu.tsx
git commit -m "feat: add AddToPlaylistMenu component for adding tracks to playlists"
```

---

### Task 9: Create PlaylistDetailPage

**Files:**
- Create: `apps/web/app/playlist/[id]/page.tsx`
- Create: `apps/web/app/playlist/[id]/PlaylistClient.tsx`

**Step 1: Create page component**

```tsx
// apps/web/app/playlist/[id]/page.tsx
import { PlaylistClient } from "./PlaylistClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaylistPage({ params }: PageProps) {
  const { id } = await params;
  return <PlaylistClient playlistId={id} />;
}
```

**Step 2: Create client component**

```tsx
// apps/web/app/playlist/[id]/PlaylistClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { Header } from "@/components/layout/Header";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Play, Share2, Trash2, MoreVertical } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatTime, getTrackTitle, getTrackArtists } from "@/lib/api/utils";
import Link from "next/link";
import { generateShareUrl } from "@/lib/shareLinks";
import { useToast } from "@/contexts/ToastContext";

interface PlaylistClientProps {
  playlistId: string;
}

export function PlaylistClient({ playlistId }: PlaylistClientProps) {
  const { getPlaylist, deletePlaylist, removeTrackFromPlaylist } = usePersistence();
  const { tracks, isLoading, loadTracks } = usePlaylistTracks();
  const { setQueue } = useAudioPlayer();
  const { success } = useToast();
  const [playlist, setPlaylist] = useState(() => getPlaylist(playlistId));
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (playlist) {
      loadTracks(playlist.trackIds);
    }
  }, [playlist, loadTracks]);

  const handlePlayAll = useCallback(() => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  }, [tracks, setQueue]);

  const handleShare = useCallback(() => {
    if (playlist) {
      const url = generateShareUrl(playlist, tracks);
      navigator.clipboard.writeText(url);
      success("Playlist link copied to clipboard!");
    }
  }, [playlist, tracks, success]);

  const handleDelete = useCallback(() => {
    if (confirm("Are you sure you want to delete this playlist?")) {
      deletePlaylist(playlistId);
      window.location.href = "/library";
    }
  }, [deletePlaylist, playlistId]);

  if (!playlist) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-foreground/50">Playlist not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Playlist Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-40 h-40 bg-foreground/5 border border-foreground/10 
                          flex items-center justify-center shrink-0">
            {playlist.coverArt ? (
              <img
                src={playlist.coverArt}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <ListMusic className="w-16 h-16 text-foreground/20" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/40 mb-2">
              Playlist
            </p>
            <h1 className="text-3xl font-medium mb-2">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-sm text-foreground/60 mb-4">{playlist.description}</p>
            )}
            <p className="text-sm text-foreground/40">
              {playlist.trackIds.length} tracks
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePlayAll}
                disabled={tracks.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-foreground text-background 
                           hover:bg-foreground/90 disabled:opacity-50 text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Play All
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-foreground/20 
                           hover:border-foreground/40 text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 border border-foreground/20 hover:border-foreground/40"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {showMenu && (
              <div className="mt-2 w-48 bg-background border border-foreground/10 shadow-lg">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left 
                             hover:bg-red-500/10 text-red-500 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Playlist
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tracks List */}
        <div className="border border-foreground/10">
          <div className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px] 
                          gap-4 px-6 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              #
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              Title
            </span>
            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest 
                              text-foreground/40">
              Artists
            </span>
            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest 
                              text-foreground/40 text-right">
              Time
            </span>
            <span></span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-foreground/40">
              Loading tracks...
            </div>
          ) : tracks.length === 0 ? (
            <div className="p-8 text-center text-foreground/40">
              No tracks in this playlist
            </div>
          ) : (
            tracks.map((track, index) => (
              <PlaylistTrackRow
                key={track.id}
                track={track}
                index={index}
                onRemove={() => removeTrackFromPlaylist(playlistId, track.id)}
                onPlay={() => setQueue(tracks, index)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PlaylistTrackRow({
  track,
  index,
  onRemove,
  onPlay,
}: {
  track: Track;
  index: number;
  onRemove: () => void;
  onPlay: () => void;
}) {
  return (
    <div
      className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_200px_80px] 
                  gap-4 items-center px-6 py-3 border-b border-foreground/10 
                  last:border-0 cursor-pointer hover:bg-foreground/[0.02]"
      onClick={onPlay}
    >
      <div className="text-center font-mono text-xs text-foreground/40">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{getTrackTitle(track)}</div>
        <div className="text-xs text-foreground/50 truncate md:hidden">
          {getTrackArtists(track)}
        </div>
      </div>
      <div className="hidden lg:block text-xs text-foreground/40 truncate">
        {getTrackArtists(track)}
      </div>
      <div className="hidden lg:block text-right font-mono text-xs text-foreground/40 
                      tabular-nums">
        {formatTime(track.duration)}
      </div>
      <div className="text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 text-foreground/20 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/app/playlist/[id]/page.tsx apps/web/app/playlist/[id]/PlaylistClient.tsx
git commit -m "feat: add playlist detail page with track listing and share functionality"
```

---

## Phase 7: Shared Playlist Page

### Task 10: Create Shared Playlist Page

**Files:**
- Create: `apps/web/app/playlist/shared/page.tsx`

**Step 1: Create shared playlist page**

```tsx
// apps/web/app/playlist/shared/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodePlaylistFromShare, SharedPlaylist } from "@/lib/shareLinks";
import { Header } from "@/components/layout/Header";
import { ListMusic, Play, Plus } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Track } from "@bitperfect/shared/api";
import Link from "next/link";

export default function SharedPlaylistPage() {
  const searchParams = useSearchParams();
  const [playlist, setPlaylist] = useState<SharedPlaylist | null>(null);
  const [isValid, setIsValid] = useState(true);
  const { setQueue } = useAudioPlayer();
  const { createPlaylist, addTrackToPlaylist } = usePersistence();

  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove #
    if (hash) {
      const decoded = decodePlaylistFromShare(hash);
      if (decoded) {
        setPlaylist(decoded);
      } else {
        setIsValid(false);
      }
    } else {
      setIsValid(false);
    }
  }, []);

  const handlePlayAll = () => {
    if (playlist) {
      const tracks = playlist.tracks.map((t) => ({
        id: t.id,
        title: t.title,
        duration: t.duration,
        artist: { name: t.artist },
        album: { title: t.album },
      })) as Track[];
      setQueue(tracks, 0);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!playlist) return;
    
    const newPlaylist = createPlaylist(playlist.name, playlist.description);
    
    // Add tracks one by one (will fetch from API)
    for (const track of playlist.tracks) {
      const fullTrack: Track = {
        id: track.id,
        title: track.title,
        duration: track.duration,
        artist: { name: track.artist },
        album: { title: track.album },
      } as Track;
      
      addTrackToPlaylist(newPlaylist.id, fullTrack);
    }
    
    window.location.href = `/playlist/${newPlaylist.id}`;
  };

  if (!isValid) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <h1 className="text-2xl font-medium mb-4">Invalid Playlist Link</h1>
          <p className="text-foreground/50 mb-6">
            This playlist link appears to be invalid or expired.
          </p>
          <Link
            href="/"
            className="px-6 py-2 bg-foreground text-background hover:bg-foreground/90"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-foreground/50">Loading playlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-40 h-40 bg-foreground/5 border border-foreground/10 
                          flex items-center justify-center shrink-0">
            <ListMusic className="w-16 h-16 text-foreground/20" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/40 mb-2">
              Shared Playlist
            </p>
            <h1 className="text-3xl font-medium mb-2">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-sm text-foreground/60 mb-4">{playlist.description}</p>
            )}
            <p className="text-sm text-foreground/40">
              {playlist.tracks.length} tracks
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-6 py-2 bg-foreground text-background 
                           hover:bg-foreground/90 text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Play All
              </button>
              <button
                onClick={handleSaveToLibrary}
                className="flex items-center gap-2 px-4 py-2 border border-foreground/20 
                           hover:border-foreground/40 text-sm"
              >
                <Plus className="w-4 h-4" />
                Save to Library
              </button>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="border border-foreground/10">
          <div className="grid grid-cols-[40px_1fr_80px] lg:grid-cols-[50px_1fr_200px_80px] 
                          gap-4 px-6 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              #
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              Title
            </span>
            <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest 
                              text-foreground/40">
              Artists
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 
                            text-right">
              Time
            </span>
          </div>

          {playlist.tracks.map((track, index) => (
            <div
              key={track.id}
              className="grid grid-cols-[40px_1fr_80px] lg:grid-cols-[50px_1fr_200px_80px] 
                          gap-4 items-center px-6 py-3 border-b border-foreground/10 
                          last:border-0 hover:bg-foreground/[0.02]"
            >
              <div className="text-center font-mono text-xs text-foreground/40">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{track.title}</div>
                <div className="text-xs text-foreground/50 truncate lg:hidden">
                  {track.artist}
                </div>
              </div>
              <div className="hidden lg:block text-xs text-foreground/40 truncate">
                {track.artist}
              </div>
              <div className="text-right font-mono text-xs text-foreground/40 tabular-nums">
                {Math.floor(track.duration / 60)}:
                {String(track.duration % 60).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/playlist/shared/page.tsx
git commit -m "feat: add shared playlist page for viewing imported playlists"
```

---

## Phase 8: Update Library Page

### Task 11: Update Library Page with Playlists Tab

**Files:**
- Modify: `apps/web/app/library/LibraryClient.tsx`

**Step 1: Add playlists tab to library**

```tsx
// Add to imports
import { PlaylistList } from "@/components/playlists/PlaylistList";
import { CreatePlaylistModal } from "@/components/playlists/CreatePlaylistModal";

// Change type to include playlists
type LibraryTab = "liked" | "history" | "playlists";

// Update component
export function LibraryClient() {
  const { likedTracks, history, toggleLikeTrack, isLiked, playlists } = usePersistence();
  const [activeTab, setActiveTab] = useState<LibraryTab>("liked");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ... existing code

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-medium tracking-tight mb-8">Library</h1>

        {/* Library Tabs */}
        <div className="flex items-center gap-8 border-b border-foreground/10 mb-8">
          <button
            onClick={() => setActiveTab("liked")}
            className={`flex items-center gap-2 pb-4 text-xs font-mono uppercase tracking-widest 
                        transition-all relative ${activeTab === "liked" ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === "liked" ? "fill-current" : ""}`} />
            Liked ({likedTracks.length})
            {activeTab === "liked" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 pb-4 text-xs font-mono uppercase tracking-widest 
                        transition-all relative ${activeTab === "history" ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length})
            {activeTab === "history" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
          
          <button
            onClick={() => setActiveTab("playlists")}
            className={`flex items-center gap-2 pb-4 text-xs font-mono uppercase tracking-widest 
                        transition-all relative ${activeTab === "playlists" ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            Playlists ({playlists.length})
            {activeTab === "playlists" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
        </div>

        {/* Content */}
        {activeTab === "playlists" ? (
          <PlaylistList onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          // ... existing tracks list code
        )}
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/library/LibraryClient.tsx
git commit -m "feat: add playlists tab to library page"
```

---

## Phase 9: Add "Add to Playlist" in TrackRow

### Task 12: Update TrackRow with Add to Playlist Button

**Files:**
- Modify: `apps/web/components/search/TrackRow.tsx`

**Step 1: Add playlist menu to track row**

```tsx
// Add to imports
import { useState } from "react";
import { Plus } from "lucide-react";
import { AddToPlaylistMenu } from "@/components/playlists/AddToPlaylistMenu";

// In TrackRow component, add state
const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

// Add button next to heart icon
<button
  onClick={(e) => {
    e.stopPropagation();
    setShowPlaylistMenu(!showPlaylistMenu);
  }}
  className="p-2 transition-transform active:scale-95 relative"
  aria-label="Add to playlist"
>
  <Plus className="w-3.5 h-3.5 text-foreground/20 hover:text-foreground/40" />
  
  {showPlaylistMenu && (
    <AddToPlaylistMenu
      track={track}
      isOpen={showPlaylistMenu}
      onClose={() => setShowPlaylistMenu(false)}
    />
  )}
</button>
```

**Step 2: Commit**

```bash
git add apps/web/components/search/TrackRow.tsx
git commit -m "feat: add 'Add to Playlist' button to TrackRow"
```

---

## Phase 10: Mobile Optimizations

### Task 13: Add Mobile Bottom Sheet for Add to Playlist

**Files:**
- Create: `apps/web/components/playlists/AddToPlaylistSheet.tsx`

**Step 1: Create mobile-optimized bottom sheet**

```tsx
// apps/web/components/playlists/AddToPlaylistSheet.tsx
"use client";

import { useState } from "react";
import { usePersistence } from "@/contexts/PersistenceContext";
import { Track } from "@bitperfect/shared/api";
import { ListMusic, Plus, X, Check } from "lucide-react";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { motion, AnimatePresence } from "framer-motion";

interface AddToPlaylistSheetProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export function AddToPlaylistSheet({ track, isOpen, onClose }: AddToPlaylistSheetProps) {
  const { playlists, addTrackToPlaylist } = usePersistence();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, track);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80 z-50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-background border-t 
                         border-foreground/10 z-50 max-h-[70vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-foreground/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b 
                              border-foreground/10">
                <h3 className="font-medium">Add to Playlist</h3>
                <button onClick={onClose} className="p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create New */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center gap-3 px-4 py-4 border-b 
                           border-foreground/10 hover:bg-foreground/[0.02]"
              >
                <div className="w-10 h-10 bg-foreground/5 border border-foreground/10 
                                flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">Create New Playlist</span>
              </button>

              {/* Playlists */}
              <div>
                {playlists.length === 0 ? (
                  <div className="p-8 text-center text-foreground/40">
                    No playlists yet
                  </div>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 
                                 hover:bg-foreground/[0.02] border-b border-foreground/5"
                    >
                      <div className="w-10 h-10 bg-foreground/5 border border-foreground/10 
                                      flex items-center justify-center shrink-0">
                        {playlist.coverArt ? (
                          <img
                            src={playlist.coverArt}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ListMusic className="w-5 h-5 text-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{playlist.name}</div>
                        <div className="text-xs text-foreground/50">
                          {playlist.trackIds.length} tracks
                        </div>
                      </div>
                      {playlist.trackIds.includes(track.id) && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          onClose();
        }}
      />
    </>
  );
}
```

**Step 2: Update TrackRow to use sheet on mobile**

```tsx
// In TrackRow, detect mobile and use appropriate component
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { AddToPlaylistSheet } from "@/components/playlists/AddToPlaylistSheet";

const isMobile = useMobileDetect();

// Use AddToPlaylistSheet on mobile, AddToPlaylistMenu on desktop
{isMobile ? (
  <AddToPlaylistSheet
    track={track}
    isOpen={showPlaylistMenu}
    onClose={() => setShowPlaylistMenu(false)}
  />
) : (
  <AddToPlaylistMenu
    track={track}
    isOpen={showPlaylistMenu}
    onClose={() => setShowPlaylistMenu(false)}
  />
)}
```

**Step 3: Commit**

```bash
git add apps/web/components/playlists/AddToPlaylistSheet.tsx
git commit -m "feat: add mobile-optimized AddToPlaylistSheet with bottom sheet UI"
```

---

## Phase 11: Navigation Updates

### Task 14: Add Playlist Link to Mobile Navigation

**Files:**
- Modify: `apps/web/components/mobile/MobileNav.tsx` (if exists, or create)

**Step 1: Check if MobileNav exists**

```bash
ls -la apps/web/components/mobile/
```

**Step 2: If it exists, add playlist link**

```tsx
// Add playlist icon/link to mobile nav
import { ListMusic } from "lucide-react";

// Add to nav items
{
  href: "/library",
  label: "Playlists",
  icon: ListMusic,
  active: pathname === "/library" || pathname.startsWith("/playlist"),
}
```

**Step 3: Commit**

```bash
git add apps/web/components/mobile/MobileNav.tsx
git commit -m "feat: add playlist navigation to mobile nav"
```

---

## Phase 12: Testing & Validation

### Task 15: Run All Tests

**Step 1: Run unit tests**

```bash
cd apps/web && npm test
```

**Step 2: Run build**

```bash
npm run build
```

**Step 3: Fix any TypeScript errors**

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git commit -m "test: add tests for playlist and share link functionality"
```

---

## Summary

This implementation plan delivers:

### Features:
1. ✅ **Playlist CRUD** - Create, read, update, delete playlists
2. ✅ **Add to Playlist** - From any track row, with mobile-optimized UI
3. ✅ **Smart Share Links** - URL for small playlists (≤10 tracks), QR codes for larger ones
4. ✅ **QR Code Generation** - Generate and download playlist QR codes (holds ~100-150 tracks)
5. ✅ **QR Code Scanner** - Scan with camera or upload QR images to import playlists
6. ✅ **Shared Playlist Import** - View and save shared playlists
7. ✅ **Mobile-First Design** - Bottom sheets, touch-friendly UI

### Share Method by Size:
| Playlist Size | Share Method | Max Capacity |
|--------------|--------------|--------------|
| ≤10 tracks | URL Link | ~30 tracks (URL limit) |
| 11-100 tracks | QR Code | ~150 tracks (QR ~3KB limit) |
| 100+ tracks | QR Code (dense) | Works but harder to scan |

### Cache-Conscious Design:
1. ✅ **LRU Track Cache** - Max 50 tracks in memory, auto-eviction
2. ✅ **Lazy Loading** - Only fetch tracks when viewing playlist
3. ✅ **Batch Loading** - Load 10 tracks at a time to avoid API overload
4. ✅ **Store Only IDs** - Playlist metadata stored, track data fetched on-demand
5. ✅ **No Background Sync** - No automatic prefetching that bloats cache

### Performance Optimizations:
- Incremental track loading with UI updates
- LocalStorage only for metadata (playlists, trackIds)
- On-demand API fetching for full track data
- Smart sharing: URLs for quick copy-paste, QR for larger playlists

---

## Next Steps

1. Review this plan
2. Execute tasks in order using `superpowers:executing-plans`
3. Test on mobile devices (especially QR scanning)
4. Consider future enhancements:
   - Playlist reordering via drag-and-drop
   - Collaborative playlists with real-time sync
   - Playlist folders/categories
   - Import from Spotify/Apple Music URLs
