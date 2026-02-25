"use client";

import { X, Share2, Copy, Check } from "lucide-react";
import QRDisplay from "./QRDisplay";
import { useState } from "react";
import { toast } from "sonner";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    pin: string;
    joinUrl: string;
}

export default function ShareModal({ isOpen, onClose, pin, joinUrl }: ShareModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyPin = () => {
        navigator.clipboard.writeText(pin);
        setCopied(true);
        toast.success("¡PIN copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compartir Sesión</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* PIN Section */}
                    <div className="text-center space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Acceso</p>
                        <div
                            onClick={handleCopyPin}
                            className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center gap-4 cursor-pointer group hover:border-blue-200 transition-all"
                        >
                            <span className="text-5xl font-black text-slate-900 tracking-[0.2em] font-mono">{pin}</span>
                            <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </div>
                        </div>
                    </div>

                    {/* QR Section */}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escanea para unirte</p>
                        <QRDisplay value={joinUrl} />
                    </div>
                </div>

                <div className="p-8 bg-slate-50 text-center">
                    <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto">
                        Los alumnos pueden unirse escaneando el código QR superior o introduciendo el PIN manualmente en la página de acceso.
                    </p>
                </div>
            </div>
        </div>
    );
}
