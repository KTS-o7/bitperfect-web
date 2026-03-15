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
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
      >
        Login
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-800 transition-colors"
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-medium">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
        )}
        <span className="hidden text-sm font-medium text-gray-200 md:block">
          {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-gray-700 bg-gray-900 py-2 shadow-lg">
            <div className="border-b border-gray-700 px-4 py-2">
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-gray-400">
                {isSyncing
                  ? 'Syncing...'
                  : lastSync
                  ? `Last sync: ${lastSync.toLocaleTimeString()}`
                  : 'Not synced'}
              </p>
            </div>

            <button
              onClick={() => {
                triggerSync();
                setIsOpen(false);
              }}
              disabled={isSyncing}
              className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <a
              href="/settings"
              className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
            >
              Settings
            </a>

            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
