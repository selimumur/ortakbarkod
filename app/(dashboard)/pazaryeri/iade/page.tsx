"use client";
import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertCircle, Search } from 'lucide-react';

// --- TYPES ---
import { ReturnRecord, getReturnsAction, updateReturnStatusAction } from '@/app/actions/returnActions';
import { toast } from 'sonner';

export default function ReturnAnalysisPage() {
    const [returns, setReturns] = useState<ReturnRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadReturns();
    }, []);

    const loadReturns = async () => {
        setLoading(true);
        try {
            const data = await getReturnsAction();
            setReturns(data);
        } catch (e) {
            console.error(e);
            toast.error("İade verileri alınamadı");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
        const toastId = toast.loading("Durum güncelleniyor...");
        try {
            await updateReturnStatusAction(id, status);
            // Optimistic update since we don't have real DB to refetch changed status immediately if it was mocked
            setReturns(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            toast.success(`İade ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`, { id: toastId });
        } catch (e) {
            toast.error("Hata oluştu", { id: toastId });
        }
    };

    // Derived Stats
    const totalReturns = returns.length;
    const approvedCount = returns.filter(r => r.status === 'approved').length;
    // Mock Calculation for Stats
    const totalCost = approvedCount * 150; // Avg cost
    const returnRate = 3.2; // Static for now

    // Group Reasons
    const reasonsMap: Record<string, number> = {};
    returns.forEach(r => {
        const key = r.reason.split('(')[0].trim();
        reasonsMap[key] = (reasonsMap[key] || 0) + 1;
    });

    const REASON_STATS = Object.keys(reasonsMap).map(key => ({
        name: key,
        percent: Math.round((reasonsMap[key] / totalReturns) * 100) || 0,
        color: "bg-blue-500" // dynamic colors could be added
    })).sort((a, b) => b.percent - a.percent);


    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <RefreshCcw className="text-red-500" /> İade Analizi
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">İade sebeplerini analiz edin ve operasyonel kayıpları minimize edin.</p>
                </div>
                <button onClick={loadReturns} disabled={loading} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
                    Verileri Yenile
                </button>
            </div>

            {/* AI Insight Box */}
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl mb-6 shadow-xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><AlertCircle className="text-red-400" /> AI İade Analizi</h3>
                <p className="text-gray-400 text-sm max-w-4xl">
                    Son iadelerin çoğunluğu <b>Beden</b> kaynaklı.
                    Özellikle <b>Tekstil</b> kategorisinde beden tablosu güncellemesi iadeleri azaltabilir.
                </p>
                <button className="mt-4 px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-900/40 transition">
                    Aksiyon Planı Oluştur
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left: Stats & Charts */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl">
                            <span className="text-xs text-gray-500 font-bold uppercase">İade Oranı</span>
                            <div className="text-2xl font-bold text-white mt-1">%{returnRate}</div>
                        </div>
                        <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl">
                            <span className="text-xs text-gray-500 font-bold uppercase">Tahmini Maliyet</span>
                            <div className="text-2xl font-bold text-white mt-1">₺{totalCost}</div>
                        </div>
                    </div>

                    {/* Reasons Chart */}
                    <div className="bg-[#111827] border border-gray-800 p-5 rounded-xl flex-1">
                        <h4 className="font-bold text-white mb-4 text-sm uppercase text-gray-400">İade Nedenleri</h4>
                        <div className="space-y-4">
                            {REASON_STATS.length > 0 ? REASON_STATS.map((stat, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-300">{stat.name}</span>
                                        <span className="text-gray-500 font-bold">%{stat.percent}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${stat.color}`} style={{ width: `${stat.percent}%` }}></div>
                                    </div>
                                </div>
                            )) : <div className="text-gray-500 text-sm">Veri yok</div>}
                        </div>
                    </div>
                </div>

                {/* Right: Recent Returns List */}
                <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm">Son İade Talepleri ({returns.length})</h4>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 text-gray-500" size={14} />
                            <input type="text" placeholder="Ara..." className="bg-[#0B1120] border border-gray-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-gray-500 w-48" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-[#1F2937] text-gray-400 text-xs uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="p-4">Sipariş No</th>
                                    <th className="p-4">Müşteri</th>
                                    <th className="p-4">Ürün</th>
                                    <th className="p-4">Neden</th>
                                    <th className="p-4">Durum</th>
                                    <th className="p-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                                {returns.length === 0 ? (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-500">Kayıt yok</td></tr>
                                ) : returns.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-800/50 transition">
                                        <td className="p-4 font-medium text-white">{r.orderNumber}</td>
                                        <td className="p-4">{r.customer}</td>
                                        <td className="p-4 text-gray-400">{r.productName}</td>
                                        <td className="p-4">
                                            <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">{r.reason}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${r.status === 'approved' ? 'bg-green-900/20 text-green-400 border-green-500/20' :
                                                r.status === 'rejected' ? 'bg-red-900/20 text-red-400 border-red-500/20' :
                                                    'bg-yellow-900/20 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                {r.status === 'approved' ? 'Onaylandı' : r.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-gray-500 text-xs">
                                            {r.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleUpdateStatus(r.id, 'approved')} className="text-green-500 hover:text-green-400 font-bold hover:underline">Onayla</button>
                                                    <button onClick={() => handleUpdateStatus(r.id, 'rejected')} className="text-red-500 hover:text-red-400 font-bold hover:underline">Reddet</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
