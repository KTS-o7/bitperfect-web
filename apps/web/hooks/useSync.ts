// apps/web/hooks/useSync.ts
import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { performFullSync, SyncResult } from '@/lib/db/sync';

interface UseSyncReturn {
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
  triggerSync: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const { isAuthenticated } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const triggerSync = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await performFullSync();
      
      if (result.error) {
        setSyncError(result.error);
      } else {
        setLastSync(new Date());
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !lastSync) {
      triggerSync();
    }
  }, [isAuthenticated, lastSync, triggerSync]);

  return {
    isSyncing,
    lastSync,
    syncError,
    triggerSync,
  };
}
