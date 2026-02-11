import { LibraryClient } from "./LibraryClient";
import AppLayout from "@/components/layout/AppLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Library - bitperfect",
    description: "Your liked tracks and listening history",
};

export default function LibraryPage() {
    return (
        <AppLayout>
            <LibraryClient />
        </AppLayout>
    );
}
