"use client";

import { useState, useEffect } from 'react';
import { Save, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    getFactorySettingsAction,
    updateDefinitionAction
} from '@/app/actions/settingsActions';

export default function DefinitionsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const data = await getFactorySettingsAction();
            setSettings(data || {});
        } catch (error: any) {
            console.error(error);
            toast.error("Ayarlar yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await updateDefinitionAction({
                default_brand_id: settings.default_brand_id ? parseInt(settings.default_brand_id) : null,
                default_brand_name: settings.default_brand_name
            });

            toast.success("Tanımlamalar kaydedildi.");
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" /> Yükleniyor...</div>;

    return (
        <div className="md:p-8 p-4 min-h-screen bg-[#0B1120] text-white">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Tag className="text-pink-500" /> Tanımlamalar
            </h1>
            <p className="text-gray-400 mb-8">Ürün gönderiminde kullanılacak varsayılan değerleri buradan ayarlayabilirsiniz.</p>

            <div className="max-w-xl mx-auto bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-xl">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-pink-500">Marka</span> Ayarları
                </h2>

                <div className="space-y-4">
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl flex gap-3 mb-4">
                        <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                        <div className="text-sm text-gray-400">
                            Pazaryerine ürün gönderirken eğer ürünün özel bir markası yoksa buradaki varsayılan marka kullanılır.
                            <br /><br />
                            <strong>Trendyol için:</strong> Eğer kendi markanız yoksa genellikle "Diğer" (ID: 1791) kullanılır.
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Varsayılan Marka Adı</label>
                        <input
                            type="text"
                            value={settings.default_brand_name || ''}
                            onChange={e => setSettings({ ...settings, default_brand_name: e.target.value })}
                            className="w-full bg-[#0B1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition"
                            placeholder="Örn: MyBrand"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Varsayılan Marka ID (Trendyol)</label>
                        <input
                            type="number"
                            value={settings.default_brand_id || ''}
                            onChange={e => setSettings({ ...settings, default_brand_id: e.target.value })}
                            className="w-full bg-[#0B1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition"
                            placeholder="Örn: 1791"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-lg shadow-pink-900/20"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}
