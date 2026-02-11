import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { PersistenceProvider } from "@/contexts/PersistenceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReactNode } from "react";
import { MotionConfig } from "motion/react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <QueryProvider>
        <ToastProvider>
          <PersistenceProvider>
            <SearchProvider>
              <ThemeProvider>
                <ErrorBoundary>
                  <AudioPlayerProvider>{children}</AudioPlayerProvider>
                </ErrorBoundary>
              </ThemeProvider>
            </SearchProvider>
          </PersistenceProvider>
        </ToastProvider>
      </QueryProvider>
    </MotionConfig>
  );
}
