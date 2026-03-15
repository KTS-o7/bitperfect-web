"use client";

import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { PersistenceProvider } from "@/contexts/PersistenceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AddToPlaylistProvider, useAddToPlaylist } from "@/contexts/AddToPlaylistContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { AddToPlaylistSheet } from "@/components/playlists/AddToPlaylistSheet";

function AddToPlaylistWrapper() {
    const { isOpen, track, close } = useAddToPlaylist();
    return <AddToPlaylistSheet track={track} isOpen={isOpen} onClose={close} />;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <QueryProvider>
        <ToastProvider>
          <PersistenceProvider>
            <AddToPlaylistProvider>
              <SearchProvider>
                <ThemeProvider>
                  <ErrorBoundary>
                    <AuthProvider>
                      <AudioPlayerProvider>
                        {children}
                        <AddToPlaylistWrapper />
                      </AudioPlayerProvider>
                    </AuthProvider>
                  </ErrorBoundary>
                </ThemeProvider>
              </SearchProvider>
            </AddToPlaylistProvider>
          </PersistenceProvider>
        </ToastProvider>
      </QueryProvider>
    </MotionConfig>
  );
}
