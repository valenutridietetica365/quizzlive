"use client";

import { Plus, Users, Trash2 } from "lucide-react";
import { DashboardClass } from "@/hooks/useDashboardData";

interface ClassListProps {
  classes: DashboardClass[];
  t: (key: string) => string;
  newClassName: string;
  setNewClassName: (name: string) => void;
  onCreateClass: () => void;
  onDeleteClass: (id: string) => void;
  onSelectClass: (cls: DashboardClass) => void;
}

export default function ClassList({
  classes,
  t,
  newClassName,
  setNewClassName,
  onCreateClass,
  onDeleteClass,
  onSelectClass
}: ClassListProps) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">
            {t('dashboard.classes.title')}
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {t('dashboard.classes.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder={t('dashboard.classes.name_placeholder')}
            className="flex-1 md:w-64 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-3 font-bold text-sm"
            onKeyDown={(e) => e.key === 'Enter' && onCreateClass()}
          />
          <button
            onClick={onCreateClass}
            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group relative hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer"
            onClick={() => onSelectClass(cls)}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-xl text-slate-900">{cls.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('dashboard.classes.students_count').replace('{count}', (cls.students?.length || 0).toString())}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClass(cls.id);
              }}
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
