"use client";

import { List } from "react-window";
import AlbumCard from "./AlbumCard";
import type { Album } from "@/lib/api/types";

interface VirtualSearchResultsProps {
  albums: Album[];
  height: number;
  width: number;
}

interface RowProps {
  itemsPerRow: number;
  albums: Album[];
}

type RowComponentProps = {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
} & RowProps;

// Defined outside the parent component so its reference is stable across renders.
// This prevents react-window from remounting all rows on every parent re-render.
function RowComponent({ index, style, itemsPerRow, albums }: RowComponentProps) {
  const startIndex = index * itemsPerRow;
  const rowAlbums = albums.slice(startIndex, startIndex + itemsPerRow);

  return (
    <div style={style} className="flex gap-4 px-4">
      {rowAlbums.map((album) => (
        <div key={album.id} className="w-[180px]">
          <AlbumCard album={album} />
        </div>
      ))}
    </div>
  );
}

export function VirtualSearchResults({
  albums,
  height,
  width,
}: VirtualSearchResultsProps) {
  // Guard against division by zero when width is very small
  const itemsPerRow = Math.max(1, Math.floor(width / 200)); // 200px per card, min 1
  const rowCount = Math.ceil(albums.length / itemsPerRow);

  return (
    <List
      rowComponent={RowComponent}
      rowCount={rowCount}
      rowHeight={280}
      rowProps={{ itemsPerRow, albums }}
      overscanCount={2}
      style={{ height, width }}
    />
  );
}
