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

export function VirtualSearchResults({
  albums,
  height,
  width,
}: VirtualSearchResultsProps) {
  const itemsPerRow = Math.floor(width / 200); // 200px per card
  const rowCount = Math.ceil(albums.length / itemsPerRow);

  const RowComponent = ({
    index,
    style,
    itemsPerRow,
    albums,
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      "aria-posinset": number;
      "aria-setsize": number;
      role: "listitem";
    };
  } & RowProps) => {
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
  };

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
