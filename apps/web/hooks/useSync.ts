// apps/web/hooks/useSync.ts
import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePersistence } from '@/contexts/PersistenceContext';
import { performSync } from '@/lib/db/sync';

const LAST_SYNC_KEY = 'bitperfect-last-sync';

interface UseSyncReturn {
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
  triggerSync: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const { isAuthenticated } = useAuth();
  const { reloadFromStorage } = usePersistence();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? new Date(stored) : null;
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  const markSyncComplete = useCallback(() => {
    const now = new Date();
    setLastSync(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await performSync();
      
      if (!result.success) {
        setSyncError(result.message);
      } else {
        markSyncComplete();
        reloadFromStorage();
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, markSyncComplete, reloadFromStorage]);

  const triggerSyncRef = useRef(triggerSync);
  useEffect(() => {
    triggerSyncRef.current = triggerSync;
  }, [triggerSync]);

  useEffect(() => {
    if (isAuthenticated && !lastSync) {
      triggerSyncRef.current();
    }
  }, [isAuthenticated, lastSync]);

  return {
    isSyncing,
    lastSync,
    syncError,
    triggerSync,
  };
}
