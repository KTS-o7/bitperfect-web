"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";

interface HeaderProps {
    children?: ReactNode;
    showBack?: boolean;
}

export function Header({ children, showBack = false }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const isNavItemActive = (path: string) => {
        if (path === "/" && pathname === "/") return true;
        if (path !== "/" && pathname?.startsWith(path)) return true;
        return false;
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-foreground/10 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="flex items-center gap-8">
                    {/* Logo or Back Button */}
                    <div className="flex-shrink-0">
                        {showBack ? (
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                                <span className="text-xs font-mono uppercase tracking-widest hidden sm:inline">Back</span>
                            </button>
                        ) : (
                            <Link href="/" className="flex items-center gap-3 group">
                                <div className="flex flex-col gap-[2px]">
                                    <div className="w-3 h-[2px] bg-[#FF9FCF]" />
                                    <div className="w-3 h-[2px] bg-[#9AC0FF]" />
                                    <div className="w-3 h-[2px] bg-[#7FEDD0]" />
                                </div>
                                <div>
                                    <h1 className="text-base font-mono uppercase tracking-widest text-foreground leading-tight">
                                        BITPERFECT
                                    </h1>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Navigation - Only show when NOT showing back button to keep it simple */}
                    {!showBack && (
                        <nav className="hidden lg:flex items-center gap-8">
                            {[
                                { label: "Search", path: "/" },
                                { label: "Library", path: "/library" },
                                { label: "Settings", path: "/settings" },
                            ].map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`text-[10px] font-mono uppercase tracking-[0.2em] transition-colors ${isNavItemActive(item.path)
                                        ? "text-foreground"
                                        : "text-foreground/40 hover:text-foreground/70"
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    )}

                    {/* Middle Content (e.g., Search Bar) */}
                    <div className="flex-1 flex justify-center">
                        {children}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex-shrink-0">
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
}
