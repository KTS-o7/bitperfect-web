"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileSearchHeaderProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

export function MobileSearchHeader({
  onSearch,
  isLoading = false,
  initialQuery = "",
}: MobileSearchHeaderProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
        // Blur input after search on mobile
        inputRef.current?.blur();
      }
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    // Focus input after animation
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    inputRef.current?.blur();
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        handleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, handleCollapse]);

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-foreground/10 lg:hidden">
      <div className="px-4 py-3">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.form
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
              className="flex items-center gap-3"
            >
              {/* Back button */}
              <button
                type="button"
                onClick={handleCollapse}
                className="w-10 h-10 flex items-center justify-center text-foreground/70 active:bg-foreground/10 -ml-2"
                aria-label="Close search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Input container */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SEARCH MUSIC"
                  disabled={isLoading}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  className="w-full py-2 text-base font-mono uppercase tracking-wider
                           bg-transparent border-b-2 border-foreground
                           text-foreground placeholder-foreground/30
                           focus:outline-none
                           disabled:opacity-50"
                />

                {/* Clear button */}
                {query && !isLoading && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-foreground/40"
                    aria-label="Clear search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between"
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
                {/* VHS Cassette Logo */}
                <div className="flex flex-col gap-[2px]">
                  <div className="w-3 h-[2px] bg-[#FF9FCF]" />
                  <div className="w-3 h-[2px] bg-[#9AC0FF]" />
                  <div className="w-3 h-[2px] bg-[#7FEDD0]" />
                </div>

                <div>
                  <h1 className="text-sm font-medium uppercase tracking-widest text-foreground leading-tight">
                    BITPERFECT
                  </h1>
                  <p className="text-[8px] uppercase tracking-widest text-foreground/40">
                    HI-FI SEARCH
                  </p>
                </div>
              </div>

              {/* Search button */}
              <button
                onClick={handleExpand}
                className="w-10 h-10 flex items-center justify-center text-foreground/60 active:bg-foreground/10"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground/10 overflow-hidden">
            <motion.div
              className="h-full bg-foreground w-1/3"
              animate={{ x: ["-100%", "400%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
