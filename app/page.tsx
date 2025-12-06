"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, Wallet, ShoppingBag, Users, Activity, 
  Target, ArrowUpRight, ArrowDownRight, Clock, 
  AlertTriangle, Package, ChevronRight, RefreshCw, 
  Store, Calendar, DollarSign, BarChart3, PieChart
} from 'lucide-react';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // --- CANLI VERİLER (STATE) ---
  const [kpi, setKpi] = useState({
    revenue: 0, 
    profit: 0, 
    orders: 0, 
    customers: 0,
    monthlyTarget: 1000000, // 1 Milyon TL Hedef
    currentProgress: 0,
    avgOrderValue: 0
  });

  const [charts, setCharts] = useState({
    weeklyTrend: [] as any[],
    platformSplit: [] as any[]
  });

  const [lists, setLists] = useState({
    recentOrders: [] as any[],
    lowStock: [] as any[],
    topProducts: [] as any[]
  });

  const [timeRange, setTimeRange] = useState("Bu Ay");

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  async function fetchDashboardData() {
    setLoading(true);
    
    // 1. SİPARİŞLERİ ÇEK (Tarih sırasına göre)
    const { data: orders } = await supabase.from('orders').select('*').order('order_date', { ascending: false });
    
    // 2. ÜRÜNLERİ ÇEK (Maliyet ve Stok analizi için)
    const { data: products } = await supabase.from('master_products').select('code, name, stock, total_cost, image_url');

    if (orders && products) {
        // --- TARİH FİLTRESİ MANTIĞI ---
        const now = new Date();
        let filterDate = new Date();
        
        if (timeRange === "Bugün") filterDate.setHours(0,0,0,0);
        else if (timeRange === "Bu Hafta") {
            const day = now.getDay() || 7; 
            if(day !== 1) filterDate.setHours(-24 * (day - 1));
            filterDate.setHours(0,0,0,0);
        }
        else if (timeRange === "Bu Ay") filterDate.setDate(1); 
        else if (timeRange === "Bu Yıl") filterDate.setMonth(0, 1);

        // Filtrelenmiş Siparişler (KPI Hesaplaması İçin)
        const filteredOrders = orders.filter(o => new Date(o.order_date) >= filterDate);

        // --- KPI HESAPLAMA MOTORU ---
        let revenue = 0;
        let totalCost = 0;
        const uniqueCustomers = new Set();

        filteredOrders.forEach(o => {
            // Ciro (total_price yoksa price kullan)
            const price = Number(o.total_price) || Number(o.price) || 0;
            revenue += price;
            
            // Maliyet Hesabı (Net Kâr için)
            // Ürün koduna göre maliyeti bul, yoksa %50 varsay
            const prod = products.find(p => p.code === o.product_code);
            const unitCost = prod?.total_cost || (price * 0.5); 
            
            // Toplam Maliyet = (Birim Maliyet * Adet) + Kargo(50) + Komisyon(%21)
            // Not: İade ve İptaller ciroya katılmaz ama maliyet oluşturabilir (İade kargo vb).
            // Burada basitlik için sadece geçerli siparişleri kâra ekliyoruz.
            if (o.status !== 'İptal' && o.status !== 'İade') {
               const itemCost = (unitCost * (o.product_count || 1)) + 50 + (price * 0.21);
               totalCost += itemCost;
            }

            // Müşteri Sayısı
            if(o.customer_name) uniqueCustomers.add(o.customer_name);
        });

        const netProfit = revenue - totalCost;
        const avgOrder = filteredOrders.length > 0 ? revenue / filteredOrders.length : 0;
        
        // Hedef İlerlemesi
        const progress = Math.min((revenue / kpi.monthlyTarget) * 100, 100);

        // --- GRAFİK 1: HAFTALIK TREND (Son 7 Gün Sabit) ---
        const trend = [];
        for(let i=6; i>=0; i--) {
           const d = new Date();
           d.setDate(d.getDate() - i);
           const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
           const dayName = d.toLocaleDateString('tr-TR', {weekday:'short'});
           
           // O güne ait siparişleri bul (Tüm zamanlardan)
           const dayOrders = orders.filter(o => o.order_date?.startsWith(key) && o.status !== 'İptal');
           const val = dayOrders.reduce((acc, o) => acc + (Number(o.total_price)||0), 0);
           
           trend.push({ day: dayName, value: val, count: dayOrders.length });
        }

        // --- GRAFİK 2: PLATFORM DAĞILIMI ---
        const pMap = new Map();
        filteredOrders.forEach(o => {
            const p = o.platform || "Diğer";
            pMap.set(p, (pMap.get(p) || 0) + (Number(o.total_price)||0));
        });
        // Toplam ciroya göre yüzde hesapla
        const platforms = Array.from(pMap, ([name, value]) => ({ 
            name, 
            value, 
            percent: revenue > 0 ? (value/revenue)*100 : 0 
        })).sort((a,b) => b.value - a.value);

        // --- LİSTE 1: SON SİPARİŞLER ---
        const recent = orders.slice(0, 6).map(o => ({
            id: o.id,
            customer: o.customer_name,
            amount: o.total_price || o.price,
            status: o.status,
            time: new Date(o.order_date).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}),
            date: new Date(o.order_date).toLocaleDateString('tr-TR', {day:'numeric', month:'short'}),
            platform: o.platform,
            product: o.product_name || o.first_product_name || "Ürün"
        }));

        // --- LİSTE 2: KRİTİK STOK ---
        const lowStock = products.filter(p => (p.stock || 0) < 10).slice(0, 5);

        // STATE GÜNCELLEME
        setKpi({
            revenue,
            profit: netProfit,
            orders: filteredOrders.length,
            customers: uniqueCustomers.size,
            monthlyTarget: 1000000,
            currentProgress: progress,
            avgOrderValue: avgOrder
        });
        setCharts({ weeklyTrend: trend, platformSplit: platforms });
        setLists({ recentOrders: recent, lowStock, topProducts: [] });
    }
    setLoading(false);
  }

  // Manuel Veri Çekme Tetikleyicisi
  async function syncData() {
    const loadingToast = toast.loading("Trendyol ile senkronize ediliyor...");
    try {
        const response = await fetch('/api/trendyol');
        const result = await response.json();
        if(result.success) {
            await supabase.from('orders').upsert(result.orders);
            fetchDashboardData();
            toast.dismiss(loadingToast);
            toast.success(`${result.orders.length} sipariş güncellendi! 🚀`);
        } else {
            throw new Error(result.details);
        }
    } catch (e: any) {
        toast.dismiss(loadingToast);
        toast.error("Bağlantı hatası: " + e.message);
    }
  }

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full p-6">
        
        {/* --- ÜST BAŞLIK VE KONTROLLER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    Kokpit <span className="text-[10px] font-normal bg-blue-600 text-white px-2 py-0.5 rounded-full border border-blue-400">PRO v2.0</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">İşletmenizin anlık finansal ve operasyonel durumu.</p>
            </div>
            
            <div className="flex bg-[#111827] p-1 rounded-xl border border-gray-800 items-center">
                {["Bugün", "Bu Hafta", "Bu Ay", "Bu Yıl"].map(t => (
                    <button 
                        key={t} 
                        onClick={() => setTimeRange(t)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition ${timeRange === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                        {t}
                    </button>
                ))}
                <div className="w-px h-6 bg-gray-700 mx-2"></div>
                <button onClick={syncData} disabled={loading} className="px-3 text-gray-400 hover:text-white transition disabled:opacity-50">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""}/>
                </button>
            </div>
        </div>

        {/* --- 1. KPI KARTLARI (Finansal Özet) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <KPICard 
                title="TOPLAM CİRO" 
                value={`₺${kpi.revenue.toLocaleString('tr-TR', {maximumFractionDigits:0})}`} 
                icon={<Wallet size={24} className="text-white"/>}
                trend={timeRange === 'Bugün' ? "Anlık" : "+12%"} trendUp={true}
                bg="bg-gradient-to-br from-blue-600 to-blue-800"
            />
            <KPICard 
                title="NET KÂR (TAHMİNİ)" 
                value={`₺${kpi.profit.toLocaleString('tr-TR', {maximumFractionDigits:0})}`} 
                icon={<TrendingUp size={24} className="text-white"/>}
                trend="+8%" trendUp={true}
                bg="bg-gradient-to-br from-emerald-600 to-emerald-800"
                sub="Maliyetler düşüldükten sonra"
            />
            <KPICard 
                title="TOPLAM SİPARİŞ" 
                value={kpi.orders} 
                icon={<ShoppingBag size={24} className="text-white"/>}
                trend={kpi.orders > 0 ? "Aktif" : "Bekleniyor"} trendUp={true}
                bg="bg-gradient-to-br from-purple-600 to-indigo-800"
            />
            <KPICard 
                title="SEPET ORTALAMASI" 
                value={`₺${kpi.avgOrderValue.toLocaleString('tr-TR', {maximumFractionDigits:0})}`} 
                icon={<Activity size={24} className="text-white"/>}
                trend="Stabil" trendUp={true}
                bg="bg-gradient-to-br from-orange-500 to-red-700"
            />
        </div>

        {/* --- 2. GRAFİKLER VE HEDEFLER --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* SOL: BÜYÜK GRAFİK (Haftalık Trend) */}
            <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-white font-bold flex items-center gap-2"><BarChart3 size={20} className="text-blue-500"/> Satış Trendi</h3>
                        <p className="text-xs text-gray-500">Son 7 günlük ciro performansı</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">HAFTALIK TOPLAM</p>
                        <p className="text-xl font-bold text-white">
                            ₺{charts.weeklyTrend.reduce((a,b)=>a+b.value,0).toLocaleString('tr-TR', {maximumFractionDigits:0})}
                        </p>
                    </div>
                </div>
                
                {/* CSS Bar Chart */}
                <div className="flex-1 flex items-end justify-between gap-3 min-h-[200px] pb-2 border-b border-gray-800">
                    {charts.weeklyTrend.map((d, i) => {
                        const max = Math.max(...charts.weeklyTrend.map(x=>x.value)) || 100;
                        const h = (d.value / max) * 100;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 shadow-xl whitespace-nowrap text-center">
                                        <p className="font-bold">₺{d.value.toLocaleString()}</p>
                                        <p className="text-gray-400 text-[10px]">{d.count} Sipariş</p>
                                    </div>
                                </div>
                                {/* Bar */}
                                <div className="w-full bg-gray-800/30 rounded-t-lg relative overflow-hidden group-hover:bg-gray-800/50 transition-colors" style={{height: '100%'}}>
                                    <div 
                                        className="absolute bottom-0 w-full bg-blue-600 hover:bg-blue-500 transition-all duration-700 rounded-t-lg" 
                                        style={{height: `${h || 2}%`}}
                                    ></div>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-3 uppercase font-bold tracking-wide">{d.day}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* SAĞ: HEDEF VE PLATFORM PASTASI */}
            <div className="flex flex-col gap-6">
                
                {/* AYLIK HEDEF */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <h3 className="text-white font-bold flex items-center gap-2"><Target size={20} className="text-red-500"/> Aylık Hedef</h3>
                        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700 font-mono">
                            {new Date().toLocaleString('tr-TR', { month: 'long' }).toUpperCase()}
                        </span>
                    </div>
                    
                    <div className="mt-6 relative pt-2">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">İlerleme</span>
                            <span className="text-white font-bold">{kpi.currentProgress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-900 h-4 rounded-full overflow-hidden shadow-inner border border-gray-800">
                            <div 
                                className="bg-gradient-to-r from-red-500 via-orange-500 to-green-500 h-full rounded-full transition-all duration-1000 relative" 
                                style={{width: `${kpi.currentProgress}%`}}
                            >
                                <div className="absolute right-0 top-0 h-full w-1 bg-white/50 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
                            <span>Başlangıç</span>
                            <span>Hedef: ₺{kpi.monthlyTarget.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* PLATFORM DAĞILIMI */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex-1 flex flex-col">
                    <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2"><PieChart size={16} className="text-purple-500"/> Kanal Dağılımı</h3>
                    <div className="space-y-4 flex-1 overflow-y-auto">
                        {charts.platformSplit.length > 0 ? charts.platformSplit.map((p, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-300 font-medium">{p.name}</span>
                                    <span className="text-white font-bold">₺{p.value.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full rounded-full" style={{width: `${p.percent}%`}}></div>
                                </div>
                            </div>
                        )) : <p className="text-gray-500 text-xs text-center mt-4">Veri bekleniyor...</p>}
                    </div>
                </div>
            </div>
        </div>

        {/* --- 3. SATIR: LİSTELER VE UYARILAR --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* SON SİPARİŞLER */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><Clock size={20} className="text-green-500"/> Son Siparişler</h3>
                    <a href="/siparisler" className="text-xs text-blue-400 hover:text-white flex items-center gap-1 transition">Tümünü Gör <ChevronRight size={12}/></a>
                </div>
                <div className="space-y-3">
                    {lists.recentOrders.map((order, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#0f1623] rounded-xl border border-gray-800 hover:border-gray-600 transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 border border-gray-700 group-hover:border-gray-500 transition">
                                    <Package size={18}/>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold truncate w-32 md:w-48" title={order.product}>{order.product}</p>
                                    <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                                        <span>#{order.id}</span>
                                        <span>•</span>
                                        <span>{order.date} {order.time}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-green-400 font-bold text-sm">₺{Number(order.amount).toLocaleString()}</p>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${order.status==='Yeni' ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-400'}`}>{order.status}</span>
                            </div>
                        </div>
                    ))}
                    {lists.recentOrders.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Henüz sipariş yok.</p>}
                </div>
            </div>

            {/* STOK UYARILARI */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><AlertTriangle size={20} className="text-red-500"/> Kritik Stoklar</h3>
                    <a href="/urunler" className="text-xs text-red-400 hover:text-white flex items-center gap-1 transition">Stok Yönetimi <ChevronRight size={12}/></a>
                </div>
                
                {lists.lowStock.length > 0 ? (
                    <div className="space-y-3">
                        {lists.lowStock.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-red-900/10 border border-red-900/30 rounded-xl hover:bg-red-900/20 transition">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle size={16} className="text-red-500"/>
                                    <div>
                                        <p className="text-red-200 text-sm font-medium truncate w-48">{item.name}</p>
                                        <p className="text-[10px] text-red-400/60 font-mono">{item.code}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-bold text-lg">{item.stock} <span className="text-xs font-normal text-gray-400">Adet</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-[200px]">
                        <div className="bg-green-900/20 p-4 rounded-full mb-2">
                            <Package size={32} className="text-green-500"/>
                        </div>
                        <p className="text-sm text-green-400 font-bold">Stoklar Güvende!</p>
                        <p className="text-xs">Kritik seviyenin altında ürün yok.</p>
                    </div>
                )}
            </div>

        </div>

      </main>
    </div>
  );
}

// KPI KART BİLEŞENİ
function KPICard({ title, value, icon, trend, trendUp, bg, sub }: any) {
    return (
        <div className={`${bg} p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition transform duration-500">
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">{title}</p>
                <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-white/90">
                    {trendUp ? <ArrowUpRight size={14} className="text-green-300"/> : <ArrowDownRight size={14} className="text-red-300"/>}
                    <span className="bg-white/10 px-1.5 py-0.5 rounded">{trend}</span>
                    {sub && <span className="opacity-70 ml-1 border-l border-white/20 pl-2">{sub}</span>}
                </div>
            </div>
        </div>
    );
}