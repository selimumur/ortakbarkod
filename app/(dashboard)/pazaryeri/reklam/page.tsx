
"use client";
import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Campaign, getAdsAction, syncAdsAction, updateAdAction } from '@/app/actions/adActions';
import { toast } from 'sonner';

export default function AdOptimizationPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await getAdsAction();
            setCampaigns(data);
        } catch (e) {
            console.error(e);
            toast.error("Kampanyalar yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await syncAdsAction();
            if (res.success) {
                toast.success("Reklam verileri Trendyol'dan güncellendi");
                loadCampaigns();
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Senkronizasyon hatası: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApplySuggestion = async (id: number, type: string) => {
        const toastId = toast.loading("AI optimizasyonu uygulanıyor...");
        try {
            let updates = {};
            if (type === 'stop') updates = { status: 'paused' };
            else if (type === 'increase') {
                // Determine new budget (mock logic or ask user?)
                // Simple logic: Increase 20%
                const camp = campaigns.find(c => c.id === id);
                if (camp) updates = { budget: Math.round(camp.budget * 1.2) };
            } else if (type === 'decrease') {
                // Maybe pause?
                updates = { status: 'paused' };
            }

            await updateAdAction(id, updates);
            toast.success("Optimizasyon uygulandı", { id: toastId });
            loadCampaigns();

        } catch (e: any) {
            toast.error("İşlem başarısız", { id: toastId });
        }
    };

    // Stats
    const totalSpend = campaigns.reduce((a, b) => a + b.spend, 0);
    const totalSales = campaigns.reduce((a, b) => a + b.sales, 0);
    const avgRoas = totalSales / totalSpend || 0;

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-yellow-500" /> Reklam Optimizasyonu
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Yapay zeka ile reklam bütçenizi en verimli şekilde yönetin.</p>
                </div>
                <button onClick={handleSync} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Yenileniyor..." : "Verileri Yenile"}
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
                <div className="bg-[#111827] border border-gray-800 p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-bold">Toplam Harcama</span>
                        <DollarSign size={18} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-white">₺{totalSpend.toLocaleString()}</div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-bold">Toplam Ciro</span>
                        <BarChart3 size={18} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-white">₺{totalSales.toLocaleString()}</div>
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-1"><ArrowUpRight size={12} /> Geçen aya göre +%12</div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-bold">Ortalama ROAS</span>
                        <PieChart size={18} className="text-purple-500" />
                    </div>
                    <div className={`text-2xl font-bold ${avgRoas > 3 ? 'text-green-400' : avgRoas > 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {avgRoas.toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Hedef: 3.50x</div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-bold">AI Önerisi</span>
                        <Zap size={18} className="text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {campaigns.filter(c => c.suggestionType === 'stop').length} <span className="text-base font-normal text-gray-500">Durdur</span>
                        <span className="mx-2 text-gray-700">|</span>
                        {campaigns.filter(c => c.suggestionType === 'increase').length} <span className="text-base font-normal text-gray-500">Artır</span>
                    </div>
                </div>
            </div>

            {/* Campaign Table */}
            <div className="flex-1 overflow-auto bg-[#111827] border border-gray-800 rounded-xl shadow-xl custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-[#1F2937] text-gray-400 text-xs uppercase font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-4">Kampanya Adı</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4 text-right">Harcama</th>
                            <th className="p-4 text-right">Ciro</th>
                            <th className="p-4 text-center">ROAS</th>
                            <th className="p-4">AI Önerisi</th>
                            <th className="p-4 text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500 animate-pulse">Veriler çekiliyor...</td></tr>
                        ) : (
                            campaigns.map(c => (
                                <tr key={c.id} className="hover:bg-gray-800/50 transition">
                                    <td className="p-4 font-medium text-white">{c.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${campaigns.length > 0 && c.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-gray-700/20 text-gray-400 border-gray-600/20'}`}>
                                            {c.status === 'active' ? 'Aktif' : 'Duraklatıldı'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">₺{c.spend.toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-white">₺{c.sales.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center justify-center font-bold px-2 py-1 rounded ${c.roas >= 4 ? 'text-green-400 bg-green-900/20' :
                                                c.roas >= 2 ? 'text-yellow-400 bg-yellow-900/20' :
                                                    'text-red-400 bg-red-900/20'
                                            }`}>
                                            {c.roas.toFixed(1)}x
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-400 text-xs flex items-center gap-2">
                                        {c.suggestionType === 'increase' && <TrendingUp size={14} className="text-green-500" />}
                                        {c.suggestionType === 'decrease' && <TrendingDown size={14} className="text-red-500" />}
                                        {c.suggestionType === 'stop' && <Zap size={14} className="text-red-500" />}
                                        {c.suggestion}
                                    </td>
                                    <td className="p-4 text-right">
                                        {c.suggestionType !== 'maintain' && (
                                            <button
                                                onClick={() => handleApplySuggestion(c.id, c.suggestionType)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg flex items-center gap-1.5 ml-auto ${c.suggestionType === 'stop' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' :
                                                        c.suggestionType === 'increase' ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' :
                                                            'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                                                    }`}
                                            >
                                                <Zap size={12} /> Uygula
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
