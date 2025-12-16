"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Factory, TrendingUp, Filter, Package, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { getStockAnalysisAction, createProductionRequestAction, type StockAnalysis } from '@/app/actions/stockAnalysisActions';

export default function StockProductionPage() {
    const [products, setProducts] = useState<StockAnalysis[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'good'>('all');

    const fetchAndAnalyze = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getStockAnalysisAction();
            setProducts(data);
        } catch (e: any) {
            console.error(e);
            toast.error("Stok analizi hatası: " + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndAnalyze();
    }, [fetchAndAnalyze]);

    const handleCreateProduction = async (id: number, amount: number) => {
        const tId = toast.loading("Talep oluşturuluyor...");
        try {
            const res = await createProductionRequestAction(id, amount);
            toast.success(res.message, { id: tId });
        } catch (e: any) {
            toast.error("Hata: " + e.message, { id: tId });
        }
    };

    // Client-side filtering is fine for the analyzed 100 items for now
    const filtered = products.filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Factory className="text-green-500" /> Stok & Üretim Analizi
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Satış hızına göre stok tüketim tahmini ve üretim önerileri.</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-[#111827] border border-gray-800 rounded-lg flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">Kritik Stok</span>
                        <span className="text-xl text-red-500 font-bold">
                            {products.filter(p => p.status === 'critical').length}
                        </span>
                    </div>
                    <div className="px-4 py-2 bg-[#111827] border border-gray-800 rounded-lg flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">Planlanan Üretim</span>
                        <span className="text-xl text-yellow-500 font-bold">-</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 shrink-0">
                <input
                    type="text"
                    placeholder="Ürün ara..."
                    className="flex-1 bg-[#111827] border border-gray-700 rounded-lg py-2 px-4 text-sm text-white outline-none focus:border-green-500"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="bg-[#111827] border border-gray-700 rounded-lg py-2 px-3 text-sm text-gray-300 outline-none focus:border-green-500"
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Tüm Durumlar</option>
                    <option value="critical">Kritik (7 gün altı)</option>
                    <option value="warning">Uyarı (14 gün altı)</option>
                    <option value="good">Yeterli Stok</option>
                </select>
                <button onClick={fetchAndAnalyze} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white" title="Yenile">
                    <Filter size={18} />
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-[#111827] border border-gray-800 rounded-xl shadow-xl custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-[#1F2937] text-gray-400 text-xs uppercase font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-4">Ürün</th>
                            <th className="p-4">Stok Durumu</th>
                            <th className="p-4">Satış Hızı</th>
                            <th className="p-4">Tahmini Bitiş</th>
                            <th className="p-4 text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 animate-pulse">Analiz yapılıyor...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                        ) : (
                            filtered.map(p => (
                                <tr key={p.id} className="hover:bg-gray-800/50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-white max-w-[250px] truncate" title={p.name}>{p.name}</div>
                                        <div className="text-gray-500 text-xs mt-0.5">ID: {p.id}</div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Package size={16} className="text-gray-500" />
                                            <span className="font-bold text-white text-lg">{p.stock}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${p.status === 'critical' ? 'bg-red-900/30 text-red-500' :
                                                p.status === 'warning' ? 'bg-yellow-900/30 text-yellow-500' :
                                                    'bg-green-900/30 text-green-500'
                                                }`}>
                                                {p.status === 'critical' ? 'KRİTİK' : p.status === 'warning' ? 'AZALIYOR' : 'YETERLİ'}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <TrendingUp size={16} className="text-blue-400" />
                                            {p.dailySales > 0 ? (
                                                <span>{p.dailySales} adet / gün</span>
                                            ) : (
                                                <span className="text-gray-600 italic">Satış Yok</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        {p.dailySales > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <Timer size={16} className={p.daysLeft < 7 ? 'text-red-400' : 'text-gray-400'} />
                                                <span className={`font-mono font-bold ${p.daysLeft < 7 ? 'text-red-400' : 'text-gray-300'}`}>
                                                    {p.daysLeft} Gün Kaldı
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>

                                    <td className="p-4 text-right">
                                        {p.suggestion > 0 ? (
                                            <button
                                                onClick={() => handleCreateProduction(p.id, p.suggestion)}
                                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto shadow-lg shadow-green-900/20"
                                            >
                                                <Factory size={12} /> {p.suggestion} Adet Üret
                                            </button>
                                        ) : (
                                            <span className="text-gray-500 text-xs italic">Planlama gerekmiyor</span>
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
