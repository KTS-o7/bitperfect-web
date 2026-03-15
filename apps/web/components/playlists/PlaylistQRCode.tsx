"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Playlist } from "@/lib/storage";
import { Track } from "@bitperfect/shared/api";
import { X, Download, Share2 } from "lucide-react";
import { encodePlaylistForShare } from "@/lib/shareLinks";

interface PlaylistQRCodeProps {
    playlist: Playlist;
    tracks: Track[];
    isOpen: boolean;
    onClose: () => void;
}

export function PlaylistQRCode({ playlist, tracks, isOpen, onClose }: PlaylistQRCodeProps) {
    const [showCopied, setShowCopied] = useState(false);

    const qrData = encodePlaylistForShare(playlist, tracks);
    const isLargePlaylist = tracks.length > 100;

    const handleDownload = () => {
        const svg = document.getElementById("playlist-qr-code");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = 512;
            canvas.height = 512;
            ctx?.drawImage(img, 0, 0);

            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `${playlist.name.replace(/\s+/g, "_")}_qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="w-full max-w-sm mx-4 bg-black border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-medium">Share Playlist</h3>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">
                            Scan with phone camera
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:text-white/70">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLargePlaylist && (
                    <div className="mb-4 p-3 border border-yellow-500/20 text-[10px] font-mono uppercase tracking-wider text-yellow-500/60">
                        Large playlist ({tracks.length} tracks). QR code may be dense.
                    </div>
                )}

                <div className="flex justify-center mb-6 p-4 bg-white">
                    <QRCodeSVG
                        id="playlist-qr-code"
                        value={qrData}
                        size={256}
                        level="M"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#000000"
                    />
                </div>

                <div className="text-center mb-6">
                    <h4 className="text-sm font-medium truncate">{playlist.name}</h4>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                        {tracks.length} tracks
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                                   border border-white/20 hover:border-white/40 text-[10px] 
                                   font-mono uppercase tracking-widest"
                    >
                        <Download className="w-4 h-4" />
                        Save
                    </button>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(qrData);
                            setShowCopied(true);
                            setTimeout(() => setShowCopied(false), 2000);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                                   border border-white hover:bg-white/10 text-[10px] 
                                   font-mono uppercase tracking-widest"
                    >
                        <Share2 className="w-4 h-4" />
                        {showCopied ? "Copied!" : "Copy Data"}
                    </button>
                </div>
            </div>
        </div>
    );
}
