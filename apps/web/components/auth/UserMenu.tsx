// apps/web/components/auth/UserMenu.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/hooks/useSync';

export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isSyncing, lastSync, triggerSync } = useSync();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <a
        href="/login"
        className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground transition-colors"
      >
        Login
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-foreground/5 transition-colors"
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-mono uppercase">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
        )}
        <span className="hidden text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/60 md:block">
          {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-64 border border-foreground/10 bg-background py-2">
            <div className="border-b border-foreground/10 px-4 py-3">
              <p className="text-sm font-mono uppercase tracking-wider text-foreground">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mt-1">
                {isSyncing
                  ? 'Syncing...'
                  : lastSync
                  ? `Synced ${lastSync.toLocaleTimeString()}`
                  : 'Not synced'}
              </p>
            </div>

            <button
              onClick={() => {
                triggerSync();
                setIsOpen(false);
              }}
              disabled={isSyncing}
              className="block w-full px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-foreground/60 hover:text-foreground hover:bg-foreground/5 disabled:opacity-50 transition-colors"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <a
              href="/settings"
              className="block px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Settings
            </a>

            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-red-500/60 hover:text-red-500 hover:bg-foreground/5 transition-colors"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
