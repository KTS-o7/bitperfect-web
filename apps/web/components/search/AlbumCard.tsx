"use client";

import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Album } from "@/lib/api/types";

interface AlbumCardProps {
  album: Album;
}

function AlbumCard({ album }: AlbumCardProps) {
  const coverUrl = album.cover
    ? `https://resources.tidal.com/images/${album.cover.replace(
        /-/g,
        "/"
      )}/750x750.jpg`
    : "/placeholder-album.png";

  const artistName =
    album.artist?.name || album.artists?.[0]?.name || "Unknown Artist";
  const year = album.releaseDate
    ? new Date(album.releaseDate).getFullYear()
    : null;

  return (
    <Link href={`/album/${album.id}`} className="group block h-full">
      {/* Brutalist Minimal Album Card */}
      <div className="h-full flex flex-col border border-foreground/10 bg-background transition-all duration-200 hover:bg-foreground/[0.02]">
        {/* Album Cover */}
        <div className="relative w-full aspect-square overflow-hidden border-b border-foreground/10 bg-foreground/5 flex-shrink-0">
          <Image
            src={coverUrl}
            alt={album.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder-album.png";
            }}
          />
        </div>

        {/* Album Info - Data-Focused Layout */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          {/* Type Label */}
          <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono">
            ALBUM
          </div>

          {/* Album Title */}
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors duration-200">
            {album.title}
          </h3>

          {/* Artist Name */}
          <p className="text-xs text-foreground/50 line-clamp-1 group-hover:text-foreground/70 transition-colors duration-200">
            {artistName}
          </p>

          {/* Album Metadata - Structured Grid */}
          <div className="flex items-center gap-4 pt-3 border-t border-foreground/10 mt-auto">
            {year && (
              <div className="flex-1">
                <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-1">
                  YEAR
                </div>
                <div className="text-xs font-mono tabular-nums text-foreground/60">
                  {year}
                </div>
              </div>
            )}
            {album.numberOfTracks && (
              <div className="flex-1">
                <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-1">
                  TRACKS
                </div>
                <div className="text-xs font-mono tabular-nums text-foreground/60">
                  {album.numberOfTracks}
                </div>
              </div>
            )}
            {!year && !album.numberOfTracks && (
              <div className="h-[34px]" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

AlbumCard.displayName = 'AlbumCard';

export default memo(AlbumCard);
