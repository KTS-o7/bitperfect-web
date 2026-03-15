"use client";

import { usePersistence } from "@/contexts/PersistenceContext";
import { Header } from "@/components/layout/Header";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/hooks/useSync";

function AccountSection() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isSyncing, lastSync, syncError, triggerSync } = useSync();

  if (!isAuthenticated) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-foreground/40 border-b border-foreground/10 pb-2">Account</h2>
        <div className="p-6 border border-foreground/10 bg-foreground/[0.02]">
          <p className="text-sm text-foreground/60 mb-4">
            Login to sync your playlists, favorites, and settings across all your devices.
          </p>
          <a
            href="/login"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
          >
            Login or Sign Up
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-foreground/40 border-b border-foreground/10 pb-2">Account</h2>
      <div className="p-6 border border-foreground/10 bg-foreground/[0.02]">
        <div className="flex items-center gap-3 mb-4">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg text-white font-medium">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <p className="font-medium">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-xs text-foreground/50">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={logout}
            className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5 transition-colors"
          >
            Logout
          </button>
        </div>

        {lastSync && (
          <p className="text-xs text-foreground/50">
            Last synced: {lastSync.toLocaleString()}
          </p>
        )}

        {syncError && (
          <p className="text-xs text-red-500">
            Sync error: {syncError}
          </p>
        )}
      </div>
    </section>
  );
}

export function SettingsClient() {
    const { settings, updateSettings, clearAll } = usePersistence();

    const handleClearAll = () => {
        if (confirm("Are you sure you want to clear all your data? This include liked tracks, history and settings. This action cannot be undone.")) {
            clearAll();
            window.location.href = "/";
        }
    };

    return (
        <div className="min-h-screen">
            <Header />

            <div className="max-w-6xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-medium tracking-tight mb-8">Settings</h1>

                <div className="space-y-12">
                    <AccountSection />

                    {/* Playback Settings */}
                    <section className="space-y-6">
                        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-foreground/40 border-b border-foreground/10 pb-2">Playback</h2>

                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-medium mb-1">Audio Quality</h3>
                                    <p className="text-xs text-foreground/50">Higher quality uses more data and bandwidth</p>
                                </div>
                                <div className="flex border border-foreground/10 p-1">
                                    {(["LOW", "HIGH", "LOSSLESS"] as const).map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => updateSettings({ quality: q })}
                                            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-all ${settings.quality === q
                                                ? "bg-foreground text-background"
                                                : "text-foreground/40 hover:text-foreground/70"
                                                }`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Theme Settings */}
                    <section className="space-y-6">
                        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-foreground/40 border-b border-foreground/10 pb-2">Appearance</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium mb-1">Theme</h3>
                                <p className="text-xs text-foreground/50">Toggle between light and dark modes</p>
                            </div>
                            <ThemeToggle />
                        </div>
                    </section>

                    {/* Data Management */}
                    <section className="space-y-6 pt-8">
                        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-red-500/60 border-b border-red-500/10 pb-2">Danger Zone</h2>
                        <div className="p-6 border border-red-500/20 bg-red-500/[0.02]">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex gap-4">
                                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-medium text-red-500 mb-1">Reset Local Data</h3>
                                        <p className="text-xs text-foreground/50 max-w-md">
                                            This will permanently delete all your liked tracks, listening history, and personalized settings from this device.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClearAll}
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear Everything
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-20 pt-8 border-t border-foreground/10 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-foreground/20">
                        BITPERFECT • Version 1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
}
