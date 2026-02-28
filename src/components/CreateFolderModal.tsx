"use client";

import { useState } from "react";
import { FolderPlus, X, Palette, Loader2 } from "lucide-react";

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, color: string) => Promise<void>;
    t: (key: string) => string;
}

const COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
];

export default function CreateFolderModal({ isOpen, onClose, onSubmit, t }: CreateFolderModalProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(COLORS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name.trim(), color);
            setName("");
            setColor(COLORS[0]);
            onClose();
        } catch (error) {
            console.error("Error creating folder:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                                <FolderPlus className="w-6 h-6" style={{ color }} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">
                                {t('dashboard.new_folder') || "Nueva Carpeta"}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="folderName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                {t('dashboard.folder_name') || "Nombre de la Carpeta"}
                            </label>
                            <input
                                id="folderName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Pruebas de Biología"
                                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:ring-0 rounded-2xl px-5 py-4 text-base font-bold text-slate-700 transition-all placeholder:font-medium placeholder:text-slate-300"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                <Palette className="w-4 h-4" />
                                {t('dashboard.folder_color') || "Color Etiqueta"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-colors"
                                disabled={isSubmitting}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim() || isSubmitting}
                                className="flex-1 px-6 py-4 rounded-2xl font-black text-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center"
                                style={{ backgroundColor: color, boxShadow: `0 10px 25px -5px ${color}60` }}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (t('common.create') || "Crear")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
