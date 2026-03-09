import { Track } from "@bitperfect/shared/api";

interface CacheEntry {
    track: Track;
    lastAccessed: number;
}

const MAX_CACHE_SIZE = 50;

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
