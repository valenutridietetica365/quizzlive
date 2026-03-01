"use client";

import { ArrowLeft, Save, Loader2, FileUp, Sparkles, Users, Folder, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { ClassModel as Class } from "@/lib/schemas";

interface EditorHeaderProps {
    title: string;
    setTitle: (v: string) => void;
    tags: string[];
    setTags: (v: string[]) => void;
    newTag: string;
    setNewTag: (v: string) => void;
    selectedClassId: string | null;
    setSelectedClassId: (v: string | null) => void;
    selectedFolderId: string | null;
    setSelectedFolderId: (v: string | null) => void;
    classes: Class[];
    folders: { id: string; name: string }[];
    isNew: boolean;
    loading: boolean;
    onSave: () => void;
    onImport: () => void;
    onAI: () => void;
    t: (key: string) => string;
}

export default function EditorHeader({
    title, setTitle, tags, setTags, newTag, setNewTag,
    selectedClassId, setSelectedClassId, selectedFolderId, setSelectedFolderId,
    classes, folders, isNew, loading, onSave, onImport, onAI, t
}: EditorHeaderProps) {
    const router = useRouter();

    return (
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50">
            {/* Row 1: Title + Save */}
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
                <button
                    onClick={() => router.push("/teacher/dashboard")}
                    className="p-2 md:p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all flex-shrink-0"
                >
                    <ArrowLeft className="w-5 md:w-6 h-5 md:h-6" />
                </button>
                <div className="h-8 w-px bg-slate-100 hidden sm:block flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('editor.title')}</span>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-black text-slate-900 placeholder:text-slate-300 p-0 leading-tight h-8 md:h-10"
                        placeholder="Título del Quiz..."
                    />
                </div>
                <button
                    onClick={onSave}
                    disabled={loading}
                    className="px-5 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-[1.5rem] font-black shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                >
                    {loading ? <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin" /> : <Save className="w-5 md:w-6 h-5 md:h-6" />}
                    <span className="hidden sm:inline">{isNew ? t('editor.publish_button') : t('editor.save_button')}</span>
                </button>
            </div>
            {/* Row 2: Controls */}
            <div className="max-w-5xl mx-auto px-4 md:px-6 pb-3 flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex-shrink-0">
                    <Users className="w-4 h-4 text-slate-400" />
                    <select value={selectedClassId || ""} onChange={(e) => setSelectedClassId(e.target.value || null)} className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-600 p-0 pr-6">
                        <option value="">{t('editor.no_class')}</option>
                        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex-shrink-0">
                    <Folder className="w-4 h-4 text-slate-400" />
                    <select value={selectedFolderId || ""} onChange={(e) => setSelectedFolderId(e.target.value || null)} className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-600 p-0 pr-6">
                        <option value="">{"Sin Carpeta"}</option>
                        {folders?.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                    </select>
                </div>
                <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 max-w-xs overflow-hidden flex-shrink-0">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {tags.map(tag => (
                            <span key={tag} className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                                {tag}
                                <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-blue-200">
                                    <Plus className="w-3 h-3 rotate-45" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="+ Etiqueta"
                        className="bg-transparent border-none focus:ring-0 text-[10px] font-black w-20 p-0"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = newTag.trim();
                                if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
                                setNewTag("");
                            }
                        }}
                    />
                </div>
                <div className="flex-1" />
                <button onClick={onImport} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 border border-slate-100 flex-shrink-0 text-sm">
                    <FileUp className="w-4 h-4" /><span className="hidden md:inline">{t('editor.import_button')}</span>
                </button>
                <button onClick={onAI} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100 flex-shrink-0 text-sm">
                    <Sparkles className="w-4 h-4" /><span className="hidden md:inline">{t('editor.ai_button')}</span>
                </button>
            </div>
        </header>
    );
}
