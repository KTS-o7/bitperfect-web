"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";

interface Artist {
  id: number;
  name: string;
  picture?: string;
  type?: string;
  popularity?: number;
  bio?: string;
}

interface ArtistCardProps {
  artist: Artist;
}

function ArtistCard({ artist }: ArtistCardProps) {
  const pictureUrl = artist.picture
    ? `https://resources.tidal.com/images/${artist.picture.replace(
      /-/g,
      "/"
    )}/750x750.jpg`
    : "/placeholder-artist.svg";

  return (
    <Link
      href={`/artist/${artist.id}`}
      className="group block h-full outline-none"
    >
      {/* Brutalist Minimal Artist Card */}
      <div className="h-full flex flex-col border border-foreground/10 bg-background transition-all duration-200 hover:bg-foreground/[0.02]">
        {/* Artist Picture */}
        <div className="relative w-full aspect-square overflow-hidden border-b border-foreground/10 bg-foreground/5 flex-shrink-0">
          <Image
            src={pictureUrl}
            alt={artist.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder-artist.svg";
            }}
          />
        </div>

        {/* Artist Info - Data-Focused Layout */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          {/* Type Label */}
          <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono">
            ARTIST
          </div>

          {/* Artist Name */}
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors duration-200">
            {artist.name}
          </h3>

          {/* Artist Type */}
          {artist.type && (
            <p className="text-xs text-foreground/50 uppercase tracking-wider group-hover:text-foreground/70 transition-colors duration-200">
              {artist.type}
            </p>
          )}

          {/* Artist Metadata - Structured Grid */}
          <div className="pt-3 border-t border-foreground/10 mt-auto">
            {artist.popularity !== undefined && (
              <div>
                <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-1">
                  POPULARITY
                </div>
                <div className="text-xs font-mono tabular-nums text-foreground/60">
                  {artist.popularity}%
                </div>
              </div>
            )}
            {!artist.popularity && (
              <div className="h-[34px]" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

ArtistCard.displayName = 'ArtistCard';

export default memo(ArtistCard);
