"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRDisplayProps {
    value: string;
}

export default function QRDisplay({ value }: QRDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && value) {
            QRCode.toCanvas(
                canvasRef.current,
                value,
                {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: "#0f172a", // slate-900
                        light: "#ffffff",
                    },
                },
                (error) => {
                    if (error) console.error(error);
                }
            );
        }
    }, [value]);

    return (
        <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 inline-block">
            <canvas ref={canvasRef} className="rounded-xl" />
        </div>
    );
}
