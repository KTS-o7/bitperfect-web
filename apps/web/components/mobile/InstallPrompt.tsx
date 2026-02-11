"use client";

import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function InstallPrompt() {
  const {
    isInstallable,
    isIOS,
    shouldShowPrompt,
    promptInstall,
    dismissPrompt,
  } = usePWAInstall();

  if (!shouldShowPrompt || !isInstallable) {
    return null;
  }

  return (
    <AnimatePresence>
      {shouldShowPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-black border-b border-white/10"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="px-4 py-3">
            <div className="flex items-start gap-3">
              {/* VHS Logo */}
              <div className="flex-shrink-0 flex flex-col gap-[2px] mt-1">
                <div className="w-3 h-[2px] bg-[#FF9FCF]" />
                <div className="w-3 h-[2px] bg-[#9AC0FF]" />
                <div className="w-3 h-[2px] bg-[#7FEDD0]" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-white">
                    INSTALL BITPERFECT
                  </span>
                </div>

                {isIOS ? (
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Tap{" "}
                    <Share className="w-3 h-3 inline-block mx-0.5 -mt-0.5" />{" "}
                    then &quot;Add to Home Screen&quot; for the best experience
                  </p>
                ) : (
                  <p className="text-[11px] text-white/60">
                    Add to home screen for the best experience
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isIOS && (
                  <button
                    onClick={promptInstall}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-mono uppercase tracking-widest active:bg-white/90"
                  >
                    <Download className="w-3 h-3" />
                    INSTALL
                  </button>
                )}

                <button
                  onClick={dismissPrompt}
                  className="w-8 h-8 flex items-center justify-center text-white/40 active:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Standalone component for checking PWA status
export function PWAStatusIndicator() {
  const { isStandalone, isInstalled } = usePWAInstall();

  if (!isStandalone && !isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 px-2 py-1 bg-white/10 border border-white/20 text-[9px] font-mono uppercase tracking-wider text-white/60">
      PWA
    </div>
  );
}
