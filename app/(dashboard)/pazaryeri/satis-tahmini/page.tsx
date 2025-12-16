"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, ArrowUpRight, BrainCircuit } from 'lucide-react';
import { ForecastData, getSalesForecastAction } from '@/app/actions/salesForecastActions';

export default function SalesForecastPage() {
    const [data, setData] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getSalesForecastAction();
                setData(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B1120] text-gray-400">Yükleniyor...</div>;
    if (!data) return <div className="flex h-screen items-center justify-center bg-[#0B1120] text-gray-400">Veri bulunamadı.</div>;

    const { chartData, nextMonthForecast, growthRate, topCategories } = data;
    const maxSales = Math.max(...chartData.map(d => d.sales));

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-teal-500" /> Satış Tahminleri (AI)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Geçmiş verileri analiz ederek gelecek ayların satışlarını öngörün.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-[#111827] border border-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm font-bold text-white">Gelecek 3 Ay</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left: Main Chart & Insights */}
                <div className="lg:col-span-2 flex flex-col space-y-6">
                    {/* Chart Container */}
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 flex-1 flex flex-col">
                        <h3 className="font-bold text-white mb-6 flex justify-between">
                            <span>Satış Trendi ve Projeksiyon</span>
                            <div className="flex gap-4 text-xs font-normal">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Gerçekleşen</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 border border-teal-500 border-dashed"></span> Tahmini</span>
                            </div>
                        </h3>

                        <div className="flex items-end justify-between flex-1 gap-2 border-b border-gray-800 pb-2 relative">
                            {/* Grid Lines mockup */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                                <div className="border-t border-gray-400 w-full"></div>
                                <div className="border-t border-gray-400 w-full"></div>
                                <div className="border-t border-gray-400 w-full"></div>
                                <div className="border-t border-gray-400 w-full"></div>
                            </div>

                            {chartData.map((d, i) => (
                                <div key={i} className="flex flex-col items-center flex-1 group relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition bg-gray-900 border border-gray-700 text-xs px-2 py-1 rounded text-white z-10 whitespace-nowrap">
                                        ₺{d.sales.toLocaleString()}
                                    </div>

                                    <div
                                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${d.type === 'actual' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-teal-500/50 border-2 border-dashed border-teal-500 hover:bg-teal-500/70'}`}
                                        style={{ height: `${(d.sales / maxSales) * 85}%` }}
                                    ></div>
                                    <span className={`text-xs mt-3 font-medium ${d.type === 'forecast' ? 'text-teal-400' : 'text-gray-400'}`}>{d.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Insight */}
                    <div className="bg-[#111827] border border-teal-900/40 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><BrainCircuit size={18} className="text-teal-400" /> AI Trend Analizi</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Mevcut satış verilerine dayanarak önümüzdeki dönemde <strong>%{growthRate}</strong> oranında bir artış bekleniyor.
                            Stok seviyelerinizi bu artışa göre optimize etmeniz önerilir.
                        </p>
                    </div>
                </div>

                {/* Right: Summary Metrics */}
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col">
                    <h3 className="font-bold text-white mb-6">Tahmin Özeti</h3>

                    <div className="space-y-6">
                        <div className="p-4 bg-[#0B1120] rounded-xl border border-gray-800">
                            <span className="text-xs text-gray-500 uppercase font-bold">Gelecek Ay Tahmini</span>
                            <div className="text-3xl font-bold text-white mt-1">₺{nextMonthForecast.toLocaleString()}</div>
                            <div className="flex items-center gap-1 text-green-400 text-xs mt-1 font-bold">
                                <TrendingUp size={12} /> +{growthRate}% (Trend)
                            </div>
                        </div>

                        <div className="p-4 bg-[#0B1120] rounded-xl border border-gray-800">
                            <span className="text-xs text-gray-500 uppercase font-bold">Beklenen Büyüme (Q3)</span>
                            <div className="text-3xl font-bold text-teal-400 mt-1">%{growthRate}</div>
                            <p className="text-xxs text-gray-500 mt-1">Geçen yıl aynı döneme göre</p>
                        </div>

                        <div>
                            <h4 className="font-bold text-white text-sm mb-4 border-b border-gray-800 pb-2">Kategori Bazlı Büyüme</h4>
                            <div className="space-y-3">
                                {topCategories.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm">{c.name}</span>
                                        <div className={`flex items-center gap-1 font-bold text-sm ${c.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                                            {c.growth} <ArrowUpRight size={14} className={c.trend === 'down' ? 'rotate-180' : ''} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button className="mt-auto w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-teal-900/20">
                        Detaylı Raporu İndir
                    </button>
                </div>

            </div>
        </div>
    );
}
