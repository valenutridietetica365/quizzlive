"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface QRDisplayProps {
    value: string;
}

export default function QRDisplay({ value }: QRDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);

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

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("¡Enlace copiado al portapapeles!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 inline-block">
                <canvas ref={canvasRef} className="rounded-2xl" />
            </div>

            <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "¡COPIADO!" : "COPIAR ENLACE"}
            </button>
        </div>
    );
}
