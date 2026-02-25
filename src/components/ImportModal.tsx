import React, { useState } from 'react';
import { Upload, X, Download, FileText, Loader2, AlertCircle, Check } from 'lucide-react';
import { getTranslation } from '@/lib/i18n';
import { useQuizStore } from '@/lib/store';
import { parseQuizFile, downloadTemplate } from '@/lib/importer';
import { Question } from '@/lib/schemas';
import { toast } from 'sonner';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (questions: Question[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
    const { language } = useQuizStore();
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const t = (key: string, params?: any) => {
        let text = getTranslation(language, key);
        if (params) {
            Object.entries(params).forEach(([k, v]: [string, any]) => {
                text = text.replace(`{${k}}`, v.toString());
            });
        }
        return text;
    };

    if (!isOpen) return null;

    const handleFile = async (file: File) => {
        setLoading(true);
        const result = await parseQuizFile(file);
        setLoading(false);

        if (result.errors.length > 0) {
            result.errors.forEach(err => toast.error(err));
        }

        if (result.questions.length > 0) {
            onImport(result.questions);
            toast.success(t('editor.import_success', { count: result.questions.length }));
            onClose();
        } else if (result.errors.length === 0) {
            toast.error(t('editor.import_error'));
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 md:p-12 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('editor.import_title')}</h2>
                            <p className="text-slate-500 font-medium">{t('editor.import_desc')}</p>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        className={`
                            relative border-4 border-dashed rounded-[2.5rem] p-12 transition-all flex flex-col items-center justify-center gap-6 group
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-100 hover:bg-slate-50'}
                        `}
                    >
                        <div className={`
                            w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-500
                            ${isDragging ? 'bg-blue-600 text-white scale-110' : 'bg-white shadow-xl text-blue-600 group-hover:scale-110'}
                        `}>
                            {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-xl font-black text-slate-900">{t('editor.import_select_file')}</p>
                            <p className="text-sm font-medium text-slate-400">Excel (.xlsx) o CSV (.csv)</p>
                        </div>

                        <input
                            type="file"
                            accept=".xlsx, .csv"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl text-slate-600 font-black text-sm hover:bg-slate-100 transition-all active:scale-95"
                        >
                            <Download className="w-5 h-5 text-blue-500" />
                            {t('editor.import_template')}
                        </button>

                        <div className="flex items-center gap-3 p-5 bg-blue-50 rounded-2xl text-blue-700 font-black text-sm">
                            <AlertCircle className="w-5 h-5" />
                            <span className="leading-tight">Mapeo automático de columnas</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 flex items-center gap-4 text-xs font-bold text-slate-400 border-t border-slate-100">
                    <FileText className="w-4 h-4" />
                    El archivo debe incluir: Pregunta, Tipo, Opciones, Correcta, Tiempo, Puntos.
                </div>
            </div>
        </div>
    );
}
