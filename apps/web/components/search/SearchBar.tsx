"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [],
  );

  const handleClear = useCallback(() => {
    setQuery("");
  }, []);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search
            className={`w-4 h-4 transition-colors duration-200 ${
              isFocused ? "text-foreground" : "text-foreground/40"
            }`}
          />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="SEARCH MUSIC"
          disabled={isLoading}
          className={`w-full pl-11 pr-32 py-3 text-sm font-mono uppercase tracking-wider
                     bg-transparent border-b-2 transition-colors duration-200
                     text-foreground placeholder-foreground/30
                     focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${isFocused ? "border-foreground" : "border-foreground/20"}
                     hover:border-foreground/40`}
        />

        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-24 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`absolute right-0 top-1/2 -translate-y-1/2
                     px-4 py-1.5 border
                     text-[10px] font-mono uppercase tracking-widest
                     transition-colors duration-200
                     ${
                       query.trim() && !isLoading
                         ? "bg-foreground text-background border-foreground hover:opacity-90"
                         : "bg-transparent text-foreground/30 border-foreground/20 cursor-not-allowed"
                     }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-foreground/30 border-t-foreground animate-spin" />
              SEARCHING
            </span>
          ) : (
            "SEARCH"
          )}
        </button>
      </div>
    </form>
  );
}
