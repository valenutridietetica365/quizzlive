import React, { useState } from 'react';
import { Shield, Upload, Palette, X, Save, Check } from 'lucide-react';
import { DashboardUser } from '@/hooks/useDashboardData';

interface BrandingModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: DashboardUser | null;
    onSave: (branding: Partial<DashboardUser>) => Promise<void>;
    t: (key: string) => string;
}

const BrandingModal: React.FC<BrandingModalProps> = ({
    isOpen,
    onClose,
    user,
    onSave,
    t
}) => {
    const [institutionName, setInstitutionName] = useState(user?.institution_name || '');
    const [logoUrl, setLogoUrl] = useState(user?.logo_url || '');
    const [brandColor, setBrandColor] = useState(user?.brand_color || '#3b82f6');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                institution_name: institutionName,
                logo_url: logoUrl,
                brand_color: brandColor
            });
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1500);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">{t('dashboard.branding_title')}</h3>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t('dashboard.branding_subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                    {/* Institution Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Institución</label>
                        <input 
                            type="text"
                            value={institutionName}
                            onChange={(e) => setInstitutionName(e.target.value)}
                            placeholder="Ej: Colegio San Francisco"
                            className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                        />
                    </div>

                    {/* Logo URL */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('dashboard.upload_logo')}</label>
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <input 
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="URL de la imagen del logo"
                                    className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 pr-12"
                                />
                                <Upload className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            </div>
                            {logoUrl && (
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Brand Color */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('dashboard.brand_color')}</label>
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                            <input 
                                type="color"
                                value={brandColor}
                                onChange={(e) => setBrandColor(e.target.value)}
                                className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                            />
                            <div className="flex-1">
                                <p className="font-bold text-slate-900">{brandColor.toUpperCase()}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color de acento en reportes</p>
                            </div>
                            <Palette className="w-5 h-5 text-slate-300" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all"
                    >
                        {t('common.cancel') || 'Cancelar'}
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving || saved}
                        className={`px-10 py-4 rounded-[1.25rem] font-black flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                            saved 
                            ? 'bg-emerald-500 text-white shadow-emerald-200' 
                            : 'bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800'
                        }`}
                    >
                        {saving ? <Upload className="w-5 h-5 animate-bounce" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                        {saved ? 'Guardado' : t('dashboard.save_branding')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrandingModal;
