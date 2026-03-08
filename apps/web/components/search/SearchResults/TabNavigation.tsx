"use client";

import { motion } from "motion/react";
import { LucideIcon, Music2, Disc, Users, ListMusic } from "lucide-react";

type SearchContentType = "tracks" | "albums" | "artists" | "playlists";

interface Tab {
  id: SearchContentType;
  label: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: SearchContentType;
  onTabChange: (tab: SearchContentType) => void;
  onPrefetch?: (tab: "tracks" | "albums" | "artists") => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange, onPrefetch }: TabNavigationProps) {
  return (
    <div className="sticky -top-6 z-10 pb-0 -mx-4 px-0 lg:px-4 bg-background/95 backdrop-blur-2xl border-b border-foreground/10">
      <div
        className="flex items-center gap-1 lg:gap-8 overflow-x-auto no-scrollbar py-2 lg:py-4 px-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => {
              if (tab.id !== "playlists" && onPrefetch) {
                onPrefetch(tab.id as "tracks" | "albums" | "artists");
              }
            }}
            className={`
              relative flex-shrink-0
              px-4 py-3 lg:px-0 lg:pb-3 lg:pt-0
              text-xs font-mono uppercase tracking-widest
              transition-all whitespace-nowrap outline-none
              active:bg-foreground/5 lg:active:bg-transparent
              ${activeTab === tab.id
                ? "text-foreground"
                : "text-foreground/40 hover:text-foreground/70"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <tab.icon className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
