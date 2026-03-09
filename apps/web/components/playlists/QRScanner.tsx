"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Camera, Upload } from "lucide-react";

interface QRScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        let animationId: number;
        let stream: MediaStream | null = null;

        const startScanning = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsScanning(true);
                }
            } catch (err) {
                setError("Camera access denied or not available");
                setIsScanning(false);
            }
        };

        const scanFrame = () => {
            if (!videoRef.current || !canvasRef.current) {
                animationId = requestAnimationFrame(scanFrame);
                return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
                animationId = requestAnimationFrame(scanFrame);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
            });

            if (code) {
                onScan(code.data);
                stopScanning();
                return;
            }

            animationId = requestAnimationFrame(scanFrame);
        };

        const stopScanning = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            setIsScanning(false);
        };

        startScanning();
        animationId = requestAnimationFrame(scanFrame);

        return () => {
            stopScanning();
        };
    }, [isOpen, onScan]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    onScan(code.data);
                    onClose();
                } else {
                    setError("No QR code found in image");
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-sm font-medium">Scan Playlist QR Code</h3>
                <button onClick={onClose} className="p-2">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {error ? (
                    <div className="text-center">
                        <p className="text-red-500 mb-4 text-[10px] font-mono uppercase tracking-widest">{error}</p>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                            You can also upload a QR code image
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="relative w-full max-w-sm aspect-square bg-black border-2 border-white/20 overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 border-2 border-white/50">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
                                </div>
                            </div>
                        </div>

                        <p className="mt-4 text-[10px] font-mono uppercase tracking-widest text-white/40">
                            Point camera at a playlist QR code
                        </p>
                    </>
                )}
            </div>

            <div className="p-4 border-t border-white/10">
                <label className="flex items-center justify-center gap-2 w-full py-3 
                                 border border-dashed border-white/30 rounded-none 
                                 cursor-pointer hover:border-white/50 text-[10px] 
                                 font-mono uppercase tracking-widest">
                    <Upload className="w-5 h-5" />
                    Upload QR Code Image
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
            </div>
        </div>
    );
}
