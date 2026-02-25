"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto text-red-600 shadow-xl shadow-red-50">
                            <AlertTriangle className="w-12 h-12" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vaya, algo salió mal</h1>
                            <p className="text-slate-500 font-medium">
                                Hemos detectado un error inesperado al cargar esta parte de la aplicación. No te preocupes, tus datos están a salvo.
                            </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 px-1">Detalle técnico</p>
                            <code className="text-xs text-red-500 font-mono break-all line-clamp-2 block">
                                {this.state.error?.message || "Error desconocido"}
                            </code>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-premium w-full !bg-blue-600 !text-white flex items-center justify-center gap-2 group"
                            >
                                <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                REINTENTAR CARGA
                            </button>

                            <button
                                onClick={() => window.location.href = "/"}
                                className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                VOLVER AL INICIO
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
