"use client";

import { ReactNode, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MiniPlayer } from "@/components/mobile/MiniPlayer";
import { InstallPrompt } from "@/components/mobile/InstallPrompt";
import { MobileNav } from "@/components/mobile/MobileNav";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useQueue } from "@/contexts/AudioPlayerContext";

// Dynamic import for desktop audio player
const AudioPlayer = dynamic(
  () =>
    import("@/components/player/AudioPlayer").then((mod) => ({
      default: mod.AudioPlayer,
    })),
  { ssr: false },
);

// Dynamic import for fullscreen player (used by MiniPlayer expand)
const FullscreenPlayer = dynamic(
  () =>
    import("@/components/player/FullscreenPlayer").then((mod) => ({
      default: mod.FullscreenPlayer,
    })),
  { ssr: false },
);

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const { currentTrack } = useQueue();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const handleExpandPlayer = () => {
    setIsFullscreenOpen(true);
  };

  const showMiniPlayer = hasHydrated && !!currentTrack;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <OfflineIndicator />
      {/* Main Content */}
      {/* Desktop: margin for sidebar + padding for audio player */}
      {/* Mobile: padding for mini player */}
      <main
        className="min-h-screen "
        style={{
          paddingBottom: showMiniPlayer
            ? "calc(64px + 64px + env(safe-area-inset-bottom))" // Mini player + Mobile Nav + safe area
            : "calc(64px + env(safe-area-inset-bottom))", // Mobile Nav + safe area
        }}
      >
        <div className="lg:pb-24">{children}</div>
      </main>

      {/* Desktop Audio Player - hidden on mobile */}
      <div className="hidden lg:block">
        <AudioPlayer />
      </div>

      {/* Mobile Mini Player - positioned above Mobile Nav */}
      {showMiniPlayer && (
        <div
          className="fixed left-0 right-0 z-40 lg:hidden transition-all duration-300"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <MiniPlayer onExpand={handleExpandPlayer} />
        </div>
      )}

      <MobileNav />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Fullscreen Player - used by both desktop and mobile */}
      <FullscreenPlayer
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </div>
  );
}
