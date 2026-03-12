"use client";

import { useState } from "react";
import { Trash2, TrendingUp, Upload } from "lucide-react";
import { DashboardStudent } from "@/hooks/useDashboardData";

// --- Tab 1: Students & Bulk Import ---
export function ClassStudentsTab({
  students,
  t,
  newStudentName,
  setNewStudentName,
  onAddStudent,
  onRemoveStudent,
  onSelectStudent,
  classId
}: {
  students: DashboardStudent[];
  t: (k: string) => string;
  newStudentName: string;
  setNewStudentName: (v: string) => void;
  onAddStudent: (classId: string, name: string) => Promise<unknown>;
  onRemoveStudent: (id: string, classId: string) => void;
  onSelectStudent: (student: DashboardStudent) => void;
  classId: string;
}) {
  const [showBulk, setShowBulk] = useState(false);
  const [bulkList, setBulkList] = useState("");

  const handleBulkImport = async () => {
    const names = bulkList.split("\n").map(n => n.trim()).filter(n => n.length > 0);
    for (const name of names) {
      await onAddStudent(classId, name);
    }
    setBulkList("");
    setShowBulk(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {showBulk ? (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <textarea
              value={bulkList}
              onChange={(e) => setBulkList(e.target.value)}
              placeholder={t('dashboard.classes.bulk_import_placeholder')}
              className="w-full h-32 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-6 py-4 font-bold text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBulkImport}
                className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
              >
                {t('dashboard.classes.bulk_import_confirm').replace('{count}', bulkList.split("\n").filter(n => n.trim()).length.toString())}
              </button>
              <button
                onClick={() => setShowBulk(false)}
                className="px-6 bg-slate-100 text-slate-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder={t('dashboard.classes.add_student_placeholder')}
              className="flex-1 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-6 py-4 font-bold"
              onKeyDown={(e) => e.key === 'Enter' && onAddStudent(classId, newStudentName)}
            />
            <button
              onClick={() => onAddStudent(classId, newStudentName)}
              className="bg-blue-600 text-white px-8 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
            >
              {t('dashboard.classes.add_student_button')}
            </button>
            <button
              onClick={() => setShowBulk(true)}
              className="bg-slate-100 text-slate-600 p-4 rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2"
              title={t('dashboard.classes.bulk_import_button')}
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {students.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{t('dashboard.classes.no_students')}</p>
          </div>
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all cursor-pointer"
              onClick={() => onSelectStudent(student)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-black text-slate-900">{student.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStudent(student);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <TrendingUp className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStudent(student.id!, classId);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
