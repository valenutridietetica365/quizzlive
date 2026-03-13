import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Brain, GraduationCap, Hash, FileUp, FileText } from "lucide-react";
import { Question } from "@/lib/schemas";
import { getTranslation } from "@/lib/i18n";
import { useQuizStore } from "@/lib/store";
import { extractTextFromPDF } from "@/lib/pdf-utils";

interface AIGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (questions: Question[]) => void;
}

export default function AIGeneratorModal({ isOpen, onClose, onGenerate }: AIGeneratorModalProps) {
    const { language } = useQuizStore();
    const [topic, setTopic] = useState("");
    const [grade, setGrade] = useState("");
    const [count, setCount] = useState(5);
    const [questionType, setQuestionType] = useState<"multiple_choice" | "true_false" | "fill_in_the_blank" | "matching" | "hangman" | "mixed">("multiple_choice");
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = (key: string) => getTranslation(language, key);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            toast.success("PDF cargado correctamente");
        } else if (selectedFile) {
            toast.error("Por favor, selecciona un archivo PDF");
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim() && !file) {
            toast.error(t('ai.topic_error') || "Por favor ingresa un tema o sube un PDF");
            return;
        }

        setLoading(true);
        try {
            let pdfText = "";
            if (file) {
                toast.info("Leyendo contenido del PDF...");
                pdfText = await extractTextFromPDF(file);
            }

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    topic: file ? `Content from ${file.name}` : topic, 
                    count, 
                    grade, 
                    language, 
                    questionType,
                    pdfText 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.details || data.error || "Failed to generate";
                throw new Error(errorMsg);
            }

            onGenerate(data);
            toast.success(t('ai.success'));
            onClose();
            // Reset fields
            setTopic("");
            setGrade("");
            setFile(null);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : t('ai.error');
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-900 p-8 md:p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl -mr-16 -mt-16 rounded-full" />
                    <div className="relative flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">{t('ai.modal_title')}</h2>
                            </div>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">{t('ai.generating_desc') || "Deja que la IA cree el contenido por ti en segundos."}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 md:p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* PDF Uploader */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <FileUp className="w-3 h-3" /> Generar desde PDF (Opcional)
                        </label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`group cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-2 
                                ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".pdf" 
                                className="hidden" 
                            />
                            {file ? (
                                <>
                                    <FileText className="w-8 h-8 text-emerald-500 animate-bounce" />
                                    <span className="font-bold text-slate-700 text-sm truncate max-w-full px-4">{file.name}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                                    >
                                        Cambiar archivo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <FileUp className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    <span className="font-bold text-slate-400 text-sm group-hover:text-blue-600">Sube un PDF de estudio</span>
                                    <span className="text-[10px] text-slate-300">Máximo 100MB</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="bg-white px-2">o usa un tema</span></div>
                    </div>

                    {/* Topic */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <Brain className="w-3 h-3" /> {t('ai.topic_label')}
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={!!file}
                            placeholder={file ? "Desactiva el PDF para usar tema manual" : t('ai.topic_placeholder')}
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Grade */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <GraduationCap className="w-3 h-3" /> {t('ai.grade_label')}
                            </label>
                            <input
                                type="text"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder={t('ai.grade_placeholder')}
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>

                        {/* Type Row */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Brain className="w-3 h-3" /> Tipo
                            </label>
                            <select
                                value={questionType}
                                onChange={(e) => setQuestionType(e.target.value as "multiple_choice" | "true_false" | "fill_in_the_blank" | "matching" | "hangman" | "mixed")}
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
                            >
                                <option value="multiple_choice">Opción Múltiple</option>
                                <option value="true_false">Verdadero o Falso</option>
                                <option value="fill_in_the_blank">Completar (Fill in the Blank)</option>
                                <option value="matching">Emparejar</option>
                                <option value="hangman">Ahorcado</option>
                                <option value="mixed">Mixto (Alternativas + V/F)</option>
                            </select>
                        </div>

                        {/* Count */}
                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Hash className="w-3 h-3" /> {t('ai.count_label')}
                            </label>
                            <select
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value))}
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
                            >
                                {[3, 5, 8, 10, 15, 20, 25, 30].map(v => (
                                    <option key={v} value={v}>{v} {t('common.questions')}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4">
                        <button
                            onClick={handleGenerate}
                            disabled={loading || (!topic.trim() && !file)}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>{file ? "Analizando PDF..." : t('ai.generating')}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                    <span>{t('ai.generate_button')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Decorative bottom bar */}
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            </div>
        </div>
    );
}

