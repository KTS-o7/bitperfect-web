"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white py-2 px-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] font-bold"
                >
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline Mode — Local library only
                </motion.div>
            )}
            {showReconnected && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] font-bold"
                >
                    <Wifi className="w-3.5 h-3.5" />
                    Connection Restored
                </motion.div>
            )}
        </AnimatePresence>
    );
}
