"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Settings } from "lucide-react";
import { ComponentType } from "react";

interface Tab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}

const tabs: Tab[] = [
  { id: "search", label: "SEARCH", icon: Search, href: "/" },
  { id: "library", label: "LIBRARY", icon: Library, href: "/library" },
  { id: "settings", label: "SETTINGS", icon: Settings, href: "/settings" },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-foreground/10 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                relative flex flex-col items-center justify-center
                flex-1 h-full
                transition-colors duration-200
                ${active ? "text-foreground" : "text-foreground/30"}
              `}
            >
              {/* Active indicator - top border */}
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-foreground" />
              )}

              <Icon className="w-6 h-6" />
              <span className="mt-1 text-[9px] font-mono uppercase tracking-widest">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
