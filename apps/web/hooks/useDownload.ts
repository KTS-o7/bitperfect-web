"use client";

import { useState, useCallback } from "react";
import { Track } from "@/lib/api/types";
import { api } from "@/lib/api";
import { getTrackTitle } from "@/lib/api/utils";
import { useToast } from "@/contexts/ToastContext";

interface DownloadState {
    isDownloading: boolean;
    downloadingTrackId: number | null;
    progress: number;
}

export function useDownload() {
    const [state, setState] = useState<DownloadState>({
        isDownloading: false,
        downloadingTrackId: null,
        progress: 0,
    });

    const { success, error: showError } = useToast();

    const downloadTrack = useCallback(
        async (track: Track) => {
            if (state.isDownloading) return;

            setState({
                isDownloading: true,
                downloadingTrackId: track.id,
                progress: 0,
            });

            try {
                // Get the stream URL
                const streamUrl = await api.getStreamUrl(
                    track.id,
                    track.audioQuality || "LOSSLESS"
                );

                if (!streamUrl) {
                    showError("Failed to get download URL");
                    setState({ isDownloading: false, downloadingTrackId: null, progress: 0 });
                    return;
                }

                // Fetch the audio data
                const response = await fetch(streamUrl);

                if (!response.ok) {
                    showError("Download failed");
                    setState({ isDownloading: false, downloadingTrackId: null, progress: 0 });
                    return;
                }

                const contentLength = response.headers.get("content-length");
                const total = contentLength ? parseInt(contentLength, 10) : 0;
                const reader = response.body?.getReader();

                if (!reader) {
                    showError("Download not supported");
                    setState({ isDownloading: false, downloadingTrackId: null, progress: 0 });
                    return;
                }

                const chunks: Uint8Array[] = [];
                let received = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    received += value.length;

                    if (total > 0) {
                        setState((prev) => ({
                            ...prev,
                            progress: Math.round((received / total) * 100),
                        }));
                    }
                }

                // Combine chunks into a single blob
                const blob = new Blob(chunks as BlobPart[]);

                // Build a clean filename
                const artistName =
                    track.artist?.name ||
                    track.artists?.find((a) => a.type === "MAIN")?.name ||
                    track.artists?.[0]?.name ||
                    "Unknown Artist";
                const title = getTrackTitle(track);
                const quality = track.audioQuality || "LOSSLESS";

                // Determine extension from content-type or default to .flac
                const contentType = response.headers.get("content-type") || "";
                let ext = ".flac";
                if (contentType.includes("mp4") || contentType.includes("m4a")) {
                    ext = ".m4a";
                } else if (contentType.includes("mpeg") || contentType.includes("mp3")) {
                    ext = ".mp3";
                }

                const sanitize = (str: string) =>
                    str.replace(/[<>:"/\\|?*]/g, "").trim();
                const filename = `${sanitize(artistName)} - ${sanitize(title)} [${quality}]${ext}`;

                // Trigger browser download
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                success(`Downloaded "${title}"`);
            } catch (err) {
                console.error("Download error:", err);
                showError("Download failed — please try again");
            } finally {
                setState({ isDownloading: false, downloadingTrackId: null, progress: 0 });
            }
        },
        [state.isDownloading, success, showError]
    );

    return {
        downloadTrack,
        isDownloading: state.isDownloading,
        downloadingTrackId: state.downloadingTrackId,
        downloadProgress: state.progress,
    };
}
