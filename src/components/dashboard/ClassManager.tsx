"use client";

import { useState } from "react";
import { Plus, Trash2, Users, ChevronRight } from "lucide-react";
import { DashboardClass } from "@/hooks/useDashboardData";

interface ClassManagerProps {
    classes: DashboardClass[];
    t: (key: string) => string;
    onCreateClass: (name: string) => void;
    onDeleteClass: (id: string) => void;
    onAddStudent: (classId: string, name: string) => Promise<unknown>;
    onRemoveStudent: (studentId: string, classId: string) => void;
}

export default function ClassManager({ classes, t, onCreateClass, onDeleteClass, onAddStudent, onRemoveStudent }: ClassManagerProps) {
    const [newClassName, setNewClassName] = useState("");
    const [selectedClass, setSelectedClass] = useState<DashboardClass | null>(null);
    const [newStudentName, setNewStudentName] = useState("");

    const handleCreateClass = () => {
        if (!newClassName.trim()) return;
        onCreateClass(newClassName.trim());
        setNewClassName("");
    };

    const handleAddStudent = async () => {
        if (!selectedClass || !newStudentName.trim()) return;
        await onAddStudent(selectedClass.id, newStudentName.trim());
        // Refresh the selected class view from the classes prop
        setNewStudentName("");
    };

    // Keep selectedClass in sync with the classes prop
    const currentClass = selectedClass ? classes.find(c => c.id === selectedClass.id) || null : null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">{t('sidebar.classes')}</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Crea grupos permanentes para tus alumnos</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="Nombre de la clase (ej. 3º B)"
                            className="flex-1 md:w-64 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-3 font-bold text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                        />
                        <button
                            onClick={handleCreateClass}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-all active:scale-95"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group relative hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer" onClick={() => setSelectedClass(cls)}>
                            <div className="space-y-3">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900">{cls.name}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls.students?.length || 0} Alumnos</p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteClass(cls.id); }}
                                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {currentClass && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 md:p-12 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{currentClass.name}</h2>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Gestión de Alumnos</p>
                                    </div>
                                    <button onClick={() => setSelectedClass(null)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                                        <ChevronRight className="w-6 h-6 rotate-180" />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newStudentName}
                                        onChange={(e) => setNewStudentName(e.target.value)}
                                        placeholder="Nombre completo del alumno"
                                        className="flex-1 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-6 py-4 font-bold"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                                    />
                                    <button
                                        onClick={handleAddStudent}
                                        className="bg-blue-600 text-white px-8 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                                    >
                                        Añadir
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                    {currentClass.students?.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay alumnos en esta clase</p>
                                        </div>
                                    ) : (
                                        currentClass.students?.map((student) => (
                                            <div key={student.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black">
                                                        {student.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-black text-slate-900">{student.name}</span>
                                                </div>
                                                <button onClick={() => onRemoveStudent(student.id!, currentClass.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
