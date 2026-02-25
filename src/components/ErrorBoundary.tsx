"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl border border-red-50 text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto">
                            <AlertCircle className="w-12 h-12" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ups, algo salió mal</h1>
                            <p className="text-slate-500 font-medium">
                                Hemos detectado un error inesperado. No te preocupes, puedes intentar lo siguiente:
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center justify-center gap-3 w-full p-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                            >
                                <RefreshCcw className="w-5 h-5" /> REINTENTAR CARGAR
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-3 w-full p-5 bg-white text-slate-400 rounded-2xl font-black border border-slate-100 hover:bg-slate-50 transition-all"
                            >
                                <Home className="w-5 h-5" /> IR AL INICIO
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-8 p-4 bg-slate-50 rounded-xl text-left overflow-auto max-h-32">
                                <p className="text-[10px] font-mono text-slate-400 break-all">
                                    {this.state.error?.toString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
