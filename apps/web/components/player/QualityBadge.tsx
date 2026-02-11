"use client";

import { motion } from "motion/react";
import React from "react";

interface QualityBadgeProps {
  quality: string;
  onClick?: (e?: React.MouseEvent) => void;
  minimal?: boolean;
}

export const QualityBadge = React.memo(({ quality, onClick, minimal = false }: QualityBadgeProps) => {
  // Determine if quality is premium (LOSSLESS or HI_RES variants)
  const isPremium = ["LOSSLESS", "HI_RES_LOSSLESS", "HI_RES"].includes(quality);

  // Get bitrate based on quality
  let bitrate = "";
  if (!minimal) {
    if (quality === "HI_RES_LOSSLESS" || quality === "HI_RES" || quality === "LOSSLESS") {
      bitrate = "1411";
    } else if (quality === "HIGH") {
      bitrate = "320";
    } else if (quality === "LOW") {
      bitrate = "96";
    }
  }

  // Format display text
  const qualityText =
    quality === "HI_RES_LOSSLESS" || quality === "HI_RES"
      ? "HI-RES"
      : quality;

  // Color scheme: gray for standard, accent for premium
  const colorClasses = isPremium
    ? "bg-foreground/20 text-foreground"
    : "bg-gray-500/20 text-gray-400";

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider transition-all cursor-pointer hover:brightness-110 ${colorClasses} border border-foreground/10 inline-flex`}
      aria-label={`Audio quality: ${quality}${bitrate ? ` at ${bitrate}kbps` : ""}. Click to view details.`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="flex items-center gap-1 uppercase font-mono">
        <span>{qualityText}</span>
        {bitrate && (
          <>
            <span className="opacity-50">·</span>
            <span>{bitrate}K</span>
          </>
        )}
      </span>
    </motion.div>
  );
});

QualityBadge.displayName = "QualityBadge";
