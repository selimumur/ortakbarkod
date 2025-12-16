"use client";

import { useState, useEffect } from 'react';
import { Shield, Lock, Truck, Plus, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
    getCargoConnectionsAction,
    saveCargoConnectionAction
} from '@/app/actions/settingsActions';

export default function CargoSettingsPage() {
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeProvider, setActiveProvider] = useState("");

    // Form Verileri
    const [suratData, setSuratData] = useState({ username: "", password: "" });
    const [dhlData, setDhlData] = useState({ apiKey: "", secretKey: "", account: "" });

    useEffect(() => {
        loadConnections();
    }, []);

    async function loadConnections() {
        const data = await getCargoConnectionsAction();
        if (data) {
            setConnections(data);
            const surat = data.find((c: any) => c.provider === 'Surat');
            if (surat) setSuratData({ username: surat.username, password: surat.password });

            const dhl = data.find((c: any) => c.provider === 'DHL');
            if (dhl) setDhlData({ apiKey: dhl.api_key, secretKey: dhl.secret_key, account: dhl.account_number });
        }
    }

    async function handleSave(provider: string) {
        setLoading(true);
        setActiveProvider(provider);

        try {
            let payload: any = {};

            if (provider === 'Surat') {
                if (!suratData.username || !suratData.password) {
                    toast.error("Kullanıcı adı ve şifre zorunludur.");
                    setLoading(false);
                    setActiveProvider("");
                    return;
                }
                payload = { username: suratData.username, password: suratData.password };
            } else if (provider === 'DHL') {
                if (!dhlData.apiKey || !dhlData.secretKey) {
                    toast.error("API Key ve Secret Key zorunludur.");
                    setLoading(false);
                    setActiveProvider("");
                    return;
                }
                payload = { api_key: dhlData.apiKey, secret_key: dhlData.secretKey, account_number: dhlData.account };
            }

            await saveCargoConnectionAction(provider, payload);
            toast.success(`${provider} bilgileri kaydedildi.`);
            loadConnections();

        } catch (e: any) {
            toast.error("İşlem hatası: " + e.message);
        } finally {
            setLoading(false);
            setActiveProvider("");
        }
    }

    const isConnected = (provider: string) => connections.some(c => c.provider === provider);

    return (
        <div className="w-full h-full bg-[#0B1120] p-8 overflow-y-auto">
            <header className="mb-8 border-b border-gray-800 pb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Truck className="text-blue-500" /> Kargo Ayarları</h2>
                <p className="text-gray-500 text-sm mt-2">Kargo firmalarınızı bağlayın ve gönderimlerinizi otomatik yönetin.</p>
                <div className="flex gap-3 mt-4">
                    <div className="px-3 py-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-2">
                        <Truck size={12} /> {connections.length} Aktif Kargo
                    </div>
                    <div className="px-3 py-1.5 rounded bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium flex items-center gap-2">
                        <Shield size={12} /> Güvenli Depolama
                    </div>
                    <div className="px-3 py-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium flex items-center gap-2">
                        <Lock size={12} /> Şifreli Veri
                    </div>
                </div>
            </header>

            <div>
                <h3 className="text-white font-bold flex items-center gap-2 mb-4"><Plus size={18} className="text-blue-500" /> Entegrasyona Hazır Kargo Firmaları</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

                    {/* SÜRAT KARGO KARTI */}
                    <div className={`bg-[#111827] border rounded-xl p-6 relative overflow-hidden transition-colors ${isConnected('Surat') ? 'border-green-500/50' : 'border-gray-800 hover:border-gray-700'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                                <span className="text-blue-600 font-black text-xs">Sürat</span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold">Sürat Kargo</h4>
                                <p className="text-gray-500 text-xs">API Entegrasyonu</p>
                            </div>
                            {isConnected('Surat') && <span className="ml-auto text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20 flex gap-1"><CheckCircle size={12} /> Aktif</span>}
                        </div>

                        <div className="bg-[#0f1623] p-4 rounded-lg border border-gray-700/50 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">KULLANICI ADI</label>
                                    <input type="text" className="w-full bg-[#111827] border border-gray-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                        value={suratData.username} onChange={e => setSuratData({ ...suratData, username: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">ŞİFRE</label>
                                    <input type="password" className="w-full bg-[#111827] border border-gray-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                        value={suratData.password} onChange={e => setSuratData({ ...suratData, password: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave('Surat')}
                            disabled={loading}
                            className="w-full mt-4 bg-white hover:bg-gray-200 text-black text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                        >
                            {loading && activeProvider === 'Surat' ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                            {isConnected('Surat') ? "Bilgileri Güncelle" : "Bağla"}
                        </button>
                    </div>

                    {/* DHL ECOMMERCE KARTI */}
                    <div className={`bg-[#111827] border rounded-xl p-6 relative overflow-hidden transition-colors ${isConnected('DHL') ? 'border-green-500/50' : 'border-gray-800 hover:border-gray-700'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                                <span className="text-red-600 font-black text-sm">DHL</span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold">DHL eCommerce</h4>
                                <p className="text-gray-500 text-xs">Global API Entegrasyonu</p>
                            </div>
                            {isConnected('DHL') && <span className="ml-auto text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20 flex gap-1"><CheckCircle size={12} /> Aktif</span>}
                        </div>

                        <div className="bg-[#0f1623] p-4 rounded-lg border border-gray-700/50 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">API KEY</label>
                                    <input type="text" className="w-full bg-[#111827] border border-gray-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                        value={dhlData.apiKey} onChange={e => setDhlData({ ...dhlData, apiKey: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">SECRET KEY</label>
                                    <input type="password" className="w-full bg-[#111827] border border-gray-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                        value={dhlData.secretKey} onChange={e => setDhlData({ ...dhlData, secretKey: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">ACCOUNT NO</label>
                                    <input type="text" className="w-full bg-[#111827] border border-gray-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                        value={dhlData.account} onChange={e => setDhlData({ ...dhlData, account: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave('DHL')}
                            disabled={loading}
                            className="w-full mt-4 bg-white hover:bg-gray-200 text-black text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                        >
                            {loading && activeProvider === 'DHL' ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                            {isConnected('DHL') ? "Bilgileri Güncelle" : "Bağla"}
                        </button>
                    </div>

                </div>

                {/* YAKINDA GELECEK FİRMALAR */}
                <h3 className="text-white font-bold flex items-center gap-2 mb-4"><Clock size={18} className="text-orange-500" /> Yakında Gelecek Kargo Firmaları</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-blue-800 font-bold text-xs">ARAS</div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Aras Kargo</h4>
                                <p className="text-gray-500 text-[10px]">Türkiye'nin lider kargo şirketi.</p>
                            </div>
                        </div>
                        <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700 flex gap-1"><Clock size={10} /> Yakında</span>
                    </div>

                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">TEX</div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Trendyol Express</h4>
                                <p className="text-gray-500 text-[10px]">Trendyol güvencesi ile hızlı teslimat.</p>
                            </div>
                        </div>
                        <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700 flex gap-1"><Clock size={10} /> Yakında</span>
                    </div>
                </div>

            </div>
        </div>
    );
}