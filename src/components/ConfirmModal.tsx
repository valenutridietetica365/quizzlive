"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDanger = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div className={`p-4 rounded-2xl ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 pt-6 space-y-4">
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
                </div>

                <div className="p-8 bg-slate-50/50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${isDanger
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-100'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
