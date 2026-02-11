"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const INSTALL_DISMISSED_KEY = "pwa-install-dismissed";
const INSTALL_PROMPT_DELAY = 30000; // 30 seconds
const MIN_VISITS_FOR_PROMPT = 2;
const VISIT_COUNT_KEY = "pwa-visit-count";

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkStandalone();

    // Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isInStandaloneMode = (window.navigator as any).standalone === true;
      setIsIOS(isIOSDevice && !isInStandaloneMode);
    };

    checkIOS();

    // Track visits
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount));

    // Check if user dismissed the prompt
    const isDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);

      // Show prompt after delay if conditions are met
      if (!isDismissed && visitCount >= MIN_VISITS_FOR_PROMPT) {
        setTimeout(() => {
          setShouldShowPrompt(true);
        }, INSTALL_PROMPT_DELAY);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShouldShowPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, show prompt based on visits (no beforeinstallprompt event)
    if (!isDismissed && visitCount >= MIN_VISITS_FOR_PROMPT) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isInStandaloneMode = (window.navigator as any).standalone === true;

      if (isIOSDevice && !isInStandaloneMode) {
        setTimeout(() => {
          setShouldShowPrompt(true);
        }, INSTALL_PROMPT_DELAY);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setShouldShowPrompt(false);
      }

      setInstallPrompt(null);
      return outcome === "accepted";
    } catch (error) {
      console.error("Error prompting install:", error);
      return false;
    }
  }, [installPrompt]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setShouldShowPrompt(false);
  }, []);

  const resetDismissal = useCallback(() => {
    localStorage.removeItem(INSTALL_DISMISSED_KEY);
  }, []);

  return {
    isInstallable: !!installPrompt || isIOS,
    isInstalled,
    isIOS,
    isStandalone,
    shouldShowPrompt: shouldShowPrompt && !isInstalled && !isStandalone,
    promptInstall,
    dismissPrompt,
    resetDismissal,
  };
}
