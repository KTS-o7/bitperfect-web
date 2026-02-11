import { SettingsClient } from "./SettingsClient";
import AppLayout from "@/components/layout/AppLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Settings - bitperfect",
    description: "Manage your playback settings and theme",
};

export default function SettingsPage() {
    return (
        <AppLayout>
            <SettingsClient />
        </AppLayout>
    );
}
