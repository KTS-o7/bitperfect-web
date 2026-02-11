import { api } from "@/lib/api";
import { ArtistClient } from "./ArtistClient";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface ArtistPageProps {
    params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: ArtistPageProps) {
    const { id } = await params;
    const artistId = parseInt(id);

    if (isNaN(artistId)) {
        notFound();
    }

    try {
        const artistData = await api.getArtist(artistId);

        if (!artistData) {
            notFound();
        }

        return <ArtistClient artistData={artistData} />;
    } catch (error) {
        console.error("Failed to load artist:", error);
        notFound();
    }
}

export async function generateMetadata({
    params,
}: ArtistPageProps): Promise<Metadata> {
    const { id } = await params;
    const artistId = parseInt(id);

    if (isNaN(artistId)) return { title: "Artist Not Found" };

    try {
        const artistData = await api.getArtist(artistId);
        return {
            title: `${artistData.name} - Artist`,
            description: `Listen to top tracks and albums by ${artistData.name}`,
        };
    } catch {
        return {
            title: "Artist Detail",
        };
    }
}
