"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, Wallet, ShoppingBag, Users,
    Target, ArrowUpRight, ArrowDownRight, Clock,
    AlertTriangle, Package, RefreshCw,
    Store, BarChart3, PieChart,
    Zap, MapPin, Globe, LineChart, Hash, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardDataAction } from '@/app/actions/dashboardActions';
// import { syncTrendyolOrdersAction } from '@/app/actions/marketplaceActions'; // Future improvement

import { useAuth } from '@clerk/nextjs';

export default function Dashboard() {
    const { orgId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("Bu Ay");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // KPI STATE
    const [kpi, setKpi] = useState({
        revenue: 0,
        profit: 0,
        margin: 0,
        orders: 0,
        avgOrder: 0,
        customers: 0,
        growth: 0,
        roi: 0,
        returnRate: 0,
        dailyAvg: 0
    });

    // CHART DATA
    const [charts, setCharts] = useState({
        trend: [] as any[],
        hourly: [] as any[],
        platforms: [] as any[],
        topCities: [] as any[]
    });

    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [alerts, setAlerts] = useState({ lowStock: [] as any[] });
    const [debugInfo, setDebugInfo] = useState<any>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const data = await getDashboardDataAction(timeRange);
            if (data) {
                setKpi(data.kpi);
                setCharts(data.charts);
                setRecentOrders(data.recentOrders);
                setAlerts(data.alerts);
                setDebugInfo(data.debug);
            }
        } catch (error) {
            console.error("Dashboard Veri Hatası:", error);
            // toast.error("Veriler alınırken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [timeRange, orgId]);

    useEffect(() => {
        if (orgId) {
            fetchDashboardData();
        }
    }, [fetchDashboardData, orgId]);

    // SYNC ACTION
    async function syncData() {
        setIsRefreshing(true);
        const toastId = toast.loading("Trendyol ile senkronize ediliyor...", { description: "Son 3 ay taranıyor..." });
        try {
            // Keeping the API route for now as it handles complex long-running sync
            // Ideally should be moved to Server Action or Background Job
            const response = await fetch('/api/trendyol');
            const result = await response.json();

            if (result.success) {
                toast.success("Senkronizasyon Başarılı", { id: toastId, description: `${result.count || 0} sipariş güncellendi.` });
                fetchDashboardData();
            } else {
                throw new Error(result.error || "Bilinmeyen hata");
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Hata: " + e.message, { id: toastId });
        } finally {
            setIsRefreshing(false);
        }
    }

    return (
        <div className="w-full h-full bg-[#020617] text-white overflow-y-auto custom-scrollbar">
            {/* BOSS HEADER */}
            <div className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        EXECUTIVE DASHBOARD
                        <span className="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full tracking-widest border border-blue-400/30">LIVE</span>
                    </h1>
                    <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide flex items-center gap-2">
                        <Globe size={12} /> Global Operasyon Merkezi • {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-[#0F172A] p-1 rounded-xl border border-white/5">
                        {["Bugün", "Bu Hafta", "Bu Ay", "Bu Yıl", "Tümü"].map(t => (
                            <button key={t} onClick={() => setTimeRange(t)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${timeRange === t ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>{t}</button>
                        ))}
                    </div>
                    <button onClick={syncData} disabled={isRefreshing} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-900/20">
                        <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                        {isRefreshing ? "GÜNCELLENİYOR..." : "VERİLERİ ÇEK"}
                    </button>
                </div>
            </div>

            <div className="p-8 max-w-[1920px] mx-auto space-y-8">

                {/* 1. HERO METRICS (Primary KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* REVENUE */}
                    <div className="bg-[#0F172A] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-30 invert grayscale transition group-hover:opacity-50 group-hover:scale-110 duration-700 pointer-events-none">
                            <div className="w-32 h-32 bg-blue-500 rounded-full blur-[60px] animate-pulse"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20"><Wallet size={24} /></div>
                                <MetricBadge val={kpi.growth} />
                            </div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Toplam Ciro</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter">₺{kpi.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</h2>
                            <p className="text-xs text-blue-400 mt-2 font-medium">Günlük Ort: ₺{(kpi.dailyAvg).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>

                    {/* PROFIT & MARGIN */}
                    <div className="bg-[#0F172A] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-30 invert grayscale transition group-hover:opacity-50 group-hover:scale-110 duration-700 pointer-events-none">
                            <div className="w-32 h-32 bg-emerald-500 rounded-full blur-[60px] animate-pulse"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20"><Target size={24} /></div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">ROI: %{kpi.roi.toFixed(0)}</span>
                            </div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Net Kâr Analizi</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter">₺{kpi.profit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</h2>
                            <div className="mt-3 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, kpi.margin))}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-emerald-400">%{kpi.margin.toFixed(0)} Marj</span>
                            </div>
                        </div>
                    </div>

                    {/* ORDERS & RETURN RATE */}
                    <div className="bg-[#0F172A] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-30 invert grayscale transition group-hover:opacity-50 group-hover:scale-110 duration-700 pointer-events-none">
                            <div className="w-32 h-32 bg-purple-500 rounded-full blur-[60px] animate-pulse"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20"><Package size={24} /></div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${kpi.returnRate < 5 ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                                    İade: %{kpi.returnRate.toFixed(1)}
                                </span>
                            </div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Sipariş Hacmi</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter">{kpi.orders} <span className="text-lg font-medium text-gray-600">Adet</span></h2>
                            <p className="text-xs text-purple-400 mt-2 font-medium">Sepet Ort: ₺{kpi.avgOrder.toFixed(0)}</p>
                        </div>
                    </div>

                    {/* CUSTOMERS & REGIONS */}
                    <div className="bg-[#0F172A] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-30 invert grayscale transition group-hover:opacity-50 group-hover:scale-110 duration-700 pointer-events-none">
                            <div className="w-32 h-32 bg-orange-500 rounded-full blur-[60px] animate-pulse"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400 border border-orange-500/20"><Users size={24} /></div>
                                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">Aktif</span>
                            </div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Müşteri Portföyü</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter">{kpi.customers} <span className="text-lg font-medium text-gray-600">Kişi</span></h2>
                            <div className="flex -space-x-2 mt-3 pl-2">
                                {[1, 2, 3, 4].map(i => <div key={i} className="w-6 h-6 rounded-full bg-gray-800 border border-black flex items-center justify-center text-[8px] text-gray-400">?</div>)}
                                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] font-bold z-10 text-center border border-black">+</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. ADVANCED CHARTS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[500px]">

                    {/* A. REVENUE TREND (Gradient Area) */}
                    <div className="lg:col-span-2 bg-[#0F172A] border border-white/5 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 z-10">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> Finansal İvme</h3>
                                <p className="text-xs text-gray-500">Günlük ciro performansı ve trend analizi.</p>
                            </div>
                        </div>
                        {/* SVG Chart */}
                        <div className="flex-1 w-full relative z-10 flex items-end gap-2 group">
                            {charts.trend.length > 0 ? charts.trend.map((d, i) => {
                                const max = Math.max(...charts.trend.map(x => x.revenue)) || 100;
                                const h = (d.revenue / max) * 100;
                                return (
                                    <div key={i} className="flex-1 h-full flex flex-col justify-end group/bar relative">
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition shadow-xl pointer-events-none z-50 whitespace-nowrap">
                                            ₺{d.revenue.toLocaleString()}
                                            <div className="text-[8px] font-normal text-gray-500">{d.date}</div>
                                        </div>
                                        <div className="w-full bg-gradient-to-t from-blue-600/20 to-blue-500/50 rounded-t-sm hover:from-blue-500 hover:to-blue-400 transition-all duration-300 relative" style={{ height: `${h}%` }}>
                                            <div className="absolute top-0 w-full h-[2px] bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                        </div>
                                        <span className="text-[9px] text-gray-600 mt-2 text-center font-mono">{d.date.split('-')[2]}</span>
                                    </div>
                                )
                            }) : <div className="text-center w-full text-gray-500 mt-20">Veri yok</div>}
                        </div>
                    </div>

                    {/* B. HOURLY HEATMAP & INSIGHTS */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-0 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-gray-900/50 backdrop-blur">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Clock size={18} className="text-orange-500" /> Sipariş Yoğunluğu</h3>
                        </div>

                        <div className="flex-1 p-6 relative">
                            {/* Circular or Bar Heatmap representation */}
                            <div className="flex items-end gap-1 h-32 mb-6">
                                {charts.hourly.map((h, i) => (
                                    <div key={i} className="flex-1 bg-gray-800 rounded-full relative group" style={{ height: `${(h.count / (Math.max(...charts.hourly.map(x => x.count)) || 1)) * 100}%` }}>
                                        <div className={`absolute inset-0 rounded-full ${h.count > 0 ? 'bg-orange-500' : 'bg-gray-800'} opacity-80 group-hover:bg-white transition`}></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 font-mono uppercase">
                                <span>00:00</span>
                                <span>12:00</span>
                                <span>23:00</span>
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400"><MapPin size={18} /></div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">En Aktif Bölge</p>
                                        <p className="text-white font-bold text-sm">İstanbul, Türkiye (%45)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400"><Store size={18} /></div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Lider Kanal</p>
                                        <p className="text-white font-bold text-sm">Trendyol (%{Math.max(...charts.platforms.map(p => p.percent), 0).toFixed(0)})</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* 3. LISTS (Recent & Alerts) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* RECENT ORDERS */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-0 flex flex-col">
                        <div className="p-6 flex justify-between items-center border-b border-white/5">
                            <h3 className="font-bold text-white">Canlı Sipariş Akışı</h3>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">LIVE</span>
                            </div>
                        </div>
                        <div className="flex-1 p-4 space-y-2">
                            {recentOrders.map((o, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white border border-gray-700 shadow-inner group-hover:scale-105 transition">
                                            <Package size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition">{o.first_product_name}</p>
                                            <p className="text-[10px] text-gray-500">{o.customer_name} • {new Date(o.order_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-mono font-bold">₺{Number(o.total_price).toLocaleString()}</p>
                                        <span className="text-[9px] text-gray-500">{o.platform}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ALERTS & CRITICAL */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><AlertTriangle size={120} className="text-red-500" /></div>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><div className="w-2 h-6 bg-red-500 rounded-full"></div> Kritik Bildirimler</h3>

                        <div className="space-y-4 relative z-10">
                            {alerts.lowStock.length > 0 ? alerts.lowStock.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-red-500/20 p-2 rounded-lg text-red-400"><Hash size={16} /></div>
                                        <div>
                                            <p className="text-red-200 font-bold text-sm">{p.name}</p>
                                            <p className="text-[10px] text-red-300/60 font-mono">{p.code}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-white">{p.stock}</p>
                                        <p className="text-[9px] text-red-300 font-bold uppercase">Stok</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="h-40 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-2xl">
                                    <Award size={32} className="text-green-500 mb-2" />
                                    <p className="text-sm font-bold text-white">Her şey yolunda!</p>
                                    <p className="text-xs">Kritik bir durum yok.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}

function MetricBadge({ val }: { val: number }) {
    const isPos = val >= 0;
    return (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1 ${isPos ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
            {isPos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(val).toFixed(1)}%
        </span>
    )
}
