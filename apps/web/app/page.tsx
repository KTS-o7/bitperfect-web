"use client";

import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";

const HomeContent = dynamic(
  () => import("./HomeContent").then((mod) => ({ default: mod.HomeContent })),
  {
    ssr: false,
  }
);

export default function Home() {
  return (
    <AppLayout>
      <HomeContent />
    </AppLayout>
  );
}
