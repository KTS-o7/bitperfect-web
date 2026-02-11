export class APICache {
  private cache: Map<string, Map<string, { data: unknown; expires: number }>>;
  private maxSize: number;
  private ttl: number;

  constructor(options: { maxSize: number; ttl: number }) {
    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
  }

  async get(type: string, id: string): Promise<unknown | null> {
    if (!this.cache.has(type)) {
      return null;
    }

    const typeCache = this.cache.get(type)!;
    const entry = typeCache.get(id);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      typeCache.delete(id);
      return null;
    }

    return entry.data;
  }

  async set(type: string, id: string, data: unknown): Promise<void> {
    if (!this.cache.has(type)) {
      this.cache.set(type, new Map());
    }

    const typeCache = this.cache.get(type)!;

    if (typeCache.size >= this.maxSize) {
      const firstKey = typeCache.keys().next().value;
      if (firstKey) {
        typeCache.delete(firstKey);
      }
    }

    typeCache.set(id, {
      data,
      expires: Date.now() + this.ttl,
    });
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [type, typeCache] of this.cache.entries()) {
      for (const [id, entry] of typeCache.entries()) {
        if (now > entry.expires) {
          typeCache.delete(id);
        }
      }
      if (typeCache.size === 0) {
        this.cache.delete(type);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getCacheStats() {
    let total = 0;
    const stats: Record<string, number> = {};

    for (const [type, typeCache] of this.cache.entries()) {
      stats[type] = typeCache.size;
      total += typeCache.size;
    }

    return {
      total,
      byType: stats,
    };
  }
}
