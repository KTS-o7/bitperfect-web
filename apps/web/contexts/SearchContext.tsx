"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";

type SearchContentType = "tracks" | "albums" | "artists" | "playlists";

interface SearchContextValue {
  query: string;
  currentTab: SearchContentType;
  setQuery: (query: string) => void;
  setCurrentTab: (tab: SearchContentType) => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

const STORAGE_KEY = "search-state";

// Helper function to load initial state from localStorage
function getInitialState() {
  if (typeof window === "undefined") {
    return { query: "", currentTab: "tracks" as SearchContentType };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { query, currentTab } = JSON.parse(stored);
      return {
        query: query || "",
        currentTab: currentTab || "tracks",
      };
    }
  } catch (error) {
    console.error("Failed to load search state from localStorage:", error);
  }

  return { query: "", currentTab: "tracks" as SearchContentType };
}

export function SearchProvider({ children }: { children: ReactNode }) {
  // Lazy initialization - only runs once
  const [query, setQueryState] = useState(() => getInitialState().query);
  const [currentTab, setCurrentTabState] = useState<SearchContentType>(
    () => getInitialState().currentTab
  );

  // Debounce persistence to avoid frequent localStorage writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ query, currentTab }));
      } catch (error) {
        console.error("Failed to save search state to localStorage:", error);
      }
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [query, currentTab]);

  const setQuery = (newQuery: string) => {
    setQueryState(newQuery);
  };

  const setCurrentTab = (tab: SearchContentType) => {
    setCurrentTabState(tab);
  };

  return (
    <SearchContext.Provider
      value={{
        query,
        currentTab,
        setQuery,
        setCurrentTab,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within SearchProvider");
  }
  return context;
}
