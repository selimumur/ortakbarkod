"use client";

import React, { useState } from 'react';
import { Activity, Calendar, TrendingUp, TrendingDown, BarChart3, Search, Megaphone, Flag, AlertCircle } from 'lucide-react';
import { searchProductsAction, getLifecycleDataAction } from '@/app/actions/lifecycleActions';
import { toast } from 'sonner';

export default function ProductLifecyclePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false); // For API call

    // REAL DATA STATES
    // const { getToken } = useAuth(); // Removed client auth
    const [chartData, setChartData] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [correlation, setCorrelation] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);

    // Product Search
    const handleSearch = async () => {
        if (searchTerm.length < 3) return;
        setLoading(true);

        try {
            const products = await searchProductsAction(searchTerm);

            if (products && products.length > 0) {
                // Currently just picking the first one, or we could show a dropdown
                const prod = products[0];
                setSelectedProduct(prod);
                fetchLifecycleData(prod.id);
            } else {
                toast.error("Ürün bulunamadı");
            }

        } catch (e) {
            console.error(e);
            toast.error("Arama sırasında hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const fetchLifecycleData = async (productId: number) => {
        setProcessing(true);
        try {
            // Server Action Call
            const data = await getLifecycleDataAction(productId);

            if (!data) {
                toast.error("Veri çekilemedi");
                return;
            }

            setChartData(data.chartData || []);
            setSummary(data.summary);
            setCorrelation(data.correlation);

            // Generate Milestones from Data / Summary
            const newMilestones = [];

            if (data.summary?.first_listed_at) {
                newMilestones.push({
                    date: new Date(data.summary.first_listed_at).toLocaleDateString('tr-TR'),
                    label: 'İlk Satış',
                    icon: <Flag size={14} className="text-blue-500" />,
                    type: 'start'
                });
            }

            if (data.summary?.peak_sales_date) {
                newMilestones.push({
                    date: new Date(data.summary.peak_sales_date).toLocaleDateString('tr-TR'), // Fix formatting if needed
                    label: `Zirve (${data.summary.peak_sales_count} Adet)`,
                    icon: <TrendingUp size={14} className="text-purple-500" />,
                    type: 'peak'
                });
            }

            // Detect Price Drop
            const drops = (data.chartData || []).filter((d: any, i: number, arr: any[]) => {
                if (i === 0) return false;
                return d.price < arr[i - 1].price * 0.9;
            });
            if (drops.length > 0) {
                newMilestones.push({
                    date: drops[0].month,
                    label: 'Fiyat İndirimi',
                    icon: <TrendingDown size={14} className="text-orange-500" />,
                    type: 'price'
                });
            }

            setMilestones(newMilestones);

        } catch (error) {
            console.error(error);
            toast.error("Analiz verileri yüklenemedi");
        } finally {
            setProcessing(false);
        }
    };

    const maxSales = Math.max(...chartData.map(d => d.sales), 1);
    const maxAds = Math.max(...chartData.map(d => d.adSpend), 1);

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-indigo-500" /> Ürün Yaşam Döngüsü (Realtime)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Trendyol API ve veritabanı üzerinden gerçek zamanlı analiz.</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6 shrink-0 flex gap-4 items-center">
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Analiz edilecek ürünü arayın..."
                        className="w-full bg-[#0B1120] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <button onClick={handleSearch} disabled={loading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition">
                    {loading ? "Aranıyor..." : "Analiz Et"}
                </button>
            </div>

            {selectedProduct && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-auto pb-6">

                    {/* LEFT: Timeline & Product Info */}
                    <div className="space-y-6">
                        {/* Product Card */}
                        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex gap-4 items-start">
                            <div className="w-20 h-24 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-gray-700">
                                {selectedProduct.image_url ? <img src={selectedProduct.image_url} className="w-full h-full object-cover" /> : <Activity size={32} className="text-gray-400" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-white line-clamp-2">{selectedProduct.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    {summary?.lifecycle_phase ? (
                                        <span className="bg-indigo-900/30 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded text-xs font-bold">
                                            {summary.lifecycle_phase}
                                        </span>
                                    ) : (
                                        <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">Analiz Bekleniyor</span>
                                    )}
                                </div>
                                <div className="mt-2 text-sm text-gray-400">
                                    SKU: {selectedProduct.sku || selectedProduct.barcode || 'Unknown'}
                                </div>
                            </div>
                        </div>

                        {/* Milestones Timeline */}
                        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                            <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Calendar size={16} /> Yaşam Kilometre Taşları</h3>
                            {milestones.length > 0 ? (
                                <div className="relative border-l-2 border-gray-800 w-full ml-3 space-y-8 pl-6 py-2">
                                    {milestones.map((ms, i) => (
                                        <div key={i} className="relative">
                                            <div className="absolute -left-[31px] bg-[#111827] border-2 border-gray-700 w-6 h-6 rounded-full flex items-center justify-center z-10">
                                                {ms.icon}
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500 font-mono block mb-0.5">{ms.date}</span>
                                                <h4 className="text-sm font-bold text-white">{ms.label}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Henüz yeterli veri yok.</p>
                            )}
                        </div>

                        {/* AI Insight */}
                        {correlation && (
                            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden">
                                <div className="flex items-start gap-3 relative z-10">
                                    <div className="bg-indigo-500/20 p-2 rounded-lg shrink-0">
                                        <Megaphone size={20} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm mb-1">AI Korelasyon Analizi</h4>
                                        <p className="text-xs text-gray-300 leading-relaxed mb-3">{correlation.text}</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 bg-indigo-900/40 px-3 py-2 rounded-lg">
                                            <AlertCircle size={14} /> {correlation.suggestion}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Main Chart */}
                    <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <BarChart3 size={18} className="text-indigo-500" />
                                Satış, Fiyat ve Reklam İlişkisi
                            </h3>
                            <div className="flex gap-4 text-xs font-bold">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-500 rounded"></span> Satış (Adet)</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Reklam (TL)</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-green-500"></span> Fiyat</span>
                            </div>
                        </div>

                        {processing ? (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                Veriler işleniyor...
                            </div>
                        ) : chartData.length > 0 ? (
                            <div className="flex-1 relative flex items-end justify-between gap-4 px-2 pb-6 border-b border-gray-800 min-h-[300px]">
                                {/* Background Lines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 z-0">
                                    <div className="border-t border-gray-500 w-full"></div>
                                    <div className="border-t border-gray-500 w-full"></div>
                                    <div className="border-t border-gray-500 w-full"></div>
                                    <div className="border-t border-gray-500 w-full"></div>
                                </div>

                                {chartData.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end items-center relative group h-full z-10">
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none bg-gray-900 border border-gray-700 text-xs p-2 rounded shadow-xl text-white whitespace-nowrap z-50">
                                            <div className="font-bold border-b border-gray-700 pb-1 mb-1">{d.month}</div>
                                            <div>Satış: {d.sales}</div>
                                            <div>Reklam: {d.adSpend} TL</div>
                                            <div>Fiyat: {d.price} TL</div>
                                        </div>

                                        {/* Ad Spend Bar (Behind) */}
                                        <div
                                            className="w-1.5 bg-orange-500/50 rounded-full absolute bottom-0 transition-all duration-500"
                                            style={{ height: `${maxAds > 0 ? (d.adSpend / maxAds) * 40 : 0}%` }}
                                        ></div>

                                        {/* Sales Bar (Main) */}
                                        <div
                                            className="w-8 bg-gradient-to-t from-indigo-900 to-indigo-500 rounded-t-sm transition-all duration-700 relative hover:from-indigo-800 hover:to-indigo-400"
                                            style={{ height: `${maxSales > 0 ? (d.sales / maxSales) * 80 : 0}%` }}
                                        >
                                            {/* Price Indicator (Dot) */}
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full border border-black shadow-lg"
                                                style={{ bottom: `${d.price > 0 ? (d.price / 1000) * 100 + 10 : 10}px` }}
                                            ></div>
                                        </div>

                                        <span className="text-xs text-gray-400 mt-3 font-medium truncate w-full text-center">{d.month}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500 flex-col">
                                <BarChart3 size={48} className="opacity-20 mb-2" />
                                <p>Bu ürün için henüz satış grafiği oluşmadı.</p>
                                <p className="text-xs mt-2 opacity-50">Siparişler çekildikçe burası dolacaktır.</p>
                            </div>
                        )}

                        <p className="text-center text-xs text-gray-500 mt-4 italic">
                            Grafik: Mavi barlar satış adedini, turuncu ince barlar reklam harcamasını, yeşil noktalar fiyat seviyesini temsil eder.
                        </p>
                    </div>

                </div>
            )}

            {!selectedProduct && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 pb-20">
                    <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Activity size={48} className="opacity-20" />
                    </div>
                    <p className="text-lg font-medium">Başlamak için yukarıdan bir ürün arayın.</p>
                </div>
            )}

        </div>
    );
}
