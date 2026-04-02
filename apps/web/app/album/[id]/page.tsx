import { api } from "@/lib/api";
import { AlbumClient } from "./AlbumClient";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cache } from "react";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

const getAlbumCached = cache(async (albumId: number) => {
  return api.getAlbum(albumId);
});

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  const albumId = parseInt(id);

  try {
    const { album, tracks } = await getAlbumCached(albumId);

    if (!album) {
      notFound();
    }

    return <AlbumClient album={album} tracks={tracks} />;
  } catch (error) {
    console.error("Failed to load album:", error);
    notFound();
  }
}

export async function generateMetadata({
  params,
}: AlbumPageProps): Promise<Metadata> {
  const { id } = await params;
  const albumId = parseInt(id);

  try {
    const { album } = await getAlbumCached(albumId);
    const artistName =
      album.artist?.name || album.artists?.[0]?.name || "Unknown Artist";

    return {
      title: `${album.title} - ${artistName}`,
      description: `Listen to ${album.title} by ${artistName}`,
    };
  } catch {
    return {
      title: "Album Not Found",
    };
  }
}
