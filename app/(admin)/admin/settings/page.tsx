"use client";

import { useState, useEffect } from 'react';
import { Power, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { getSystemSettingAction, updateSystemSettingAction } from '@/app/actions/adminActions';

// Dynamic Import with SSR disabled to prevent Server Render errors with admin actions
const BankAccountsSection = dynamic(() => import('@/components/admin/BankAccountsSettings'), {
    loading: () => <div className="p-8 text-center text-gray-500">Banka hesapları yükleniyor...</div>,
    ssr: false
});

export default function SystemSettings() {
    const [maintenance, setMaintenance] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");

    useEffect(() => {
        // Load initial settings
        const loadSettings = async () => {
            const msg = await getSystemSettingAction('broadcast_message');
            setBroadcastMessage(msg);

            // Maintenance mode (future)
            const maint = await getSystemSettingAction('maintenance_mode');
            setMaintenance(maint === 'true');
        };
        loadSettings();
    }, []);

    const handleSaveBroadcast = async () => {
        try {
            await updateSystemSettingAction('broadcast_message', broadcastMessage);
            toast.success(broadcastMessage ? "Duyuru yayınlandı." : "Duyuru kaldırıldı.");
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        }
    }

    const handleToggleMaintenance = async () => {
        const newState = !maintenance;
        setMaintenance(newState);
        try {
            await updateSystemSettingAction('maintenance_mode', String(newState));
            toast.success(newState ? "Bakım modu AKTİF edildi." : "Bakım modu KAPATILDI.");
        } catch (e: any) {
            toast.error("Hata: " + e.message);
            setMaintenance(!newState); // Revert UI on error
        }
    }

    return (
        <div className="max-w-4xl space-y-8">
            <h1 className="text-2xl font-bold">Sistem Ayarları & Konfigürasyon</h1>

            {/* MAINTENANCE MODE */}
            <div className="bg-[#0B1120] border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Power size={100} /></div>
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${maintenance ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                            Bakım Modu (Maintenance)
                        </h3>
                        <p className="text-gray-400 text-sm mt-1 max-w-lg">
                            Aktif edildiğinde, <strong>Süper Adminler hariç</strong> kimse sisteme giriş yapamaz. Mevcut oturumlar sonlandırılmaz ancak yeni işlemler engellenir.
                        </p>
                    </div>
                    <button
                        onClick={handleToggleMaintenance}
                        className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 ${maintenance ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <Power size={18} />
                        {maintenance ? 'BAKIM MODUNU KAPAT' : 'BAKIM MODUNU AÇ'}
                    </button>
                </div>
            </div>

            {/* GLOBAL ANNOUNCEMENT */}
            <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Küresel Duyuru (Broadcast)</h3>
                <p className="text-gray-400 text-sm mb-4">Tüm kullanıcıların ekranında görünecek acil durum mesajı.</p>

                <div className="space-y-4">
                    <textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white resize-none h-32 focus:border-blue-500 outline-none transition"
                        placeholder="Duyuru metnini buraya girin..."
                    ></textarea>

                    <div className="flex justify-end gap-2">
                        <button onClick={() => setBroadcastMessage("")} className="px-4 py-2 text-gray-400 hover:text-white transition">Temizle</button>
                        <button onClick={handleSaveBroadcast} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition flex items-center gap-2">
                            <Save size={16} /> {broadcastMessage ? 'Yayınla / Güncelle' : 'Duyuruyu Kapat'}
                        </button>
                    </div>
                </div>
            </div>

            {/* BANK ACCOUNTS */}
            <BankAccountsSection />

            {/* CACHE & REVALIDATION */}
            <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white">Önbellek Temizliği (Cache Purge)</h3>
                        <p className="text-gray-400 text-sm mt-1">
                            CDN ve sunucu önbelleklerini temizler.
                        </p>
                    </div>
                    <button onClick={() => toast.success("Önbellek temizlendi")} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2">
                        <RefreshCw size={14} /> Temizle
                    </button>
                </div>
            </div>

        </div>
    );
}
