"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, CreditCard, AlertCircle, ShoppingBag, Calendar, ArrowUpRight, ArrowDownRight, RefreshCw, MapPin, Clock, PieChart, BarChart3, Package, Filter } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<any[]>([]); // Tüm ham veriyi burada tutacağız
  const [products, setProducts] = useState<any[]>([]);
  
  // TARİH FİLTRELERİ
  const [dateFilter, setDateFilter] = useState("Son 30 Gün");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // HESAPLANAN İSTATİSTİKLER
  const [stats, setStats] = useState({
    totalRevenue: 0,
    netProfit: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    returnRate: 0,
    returnCost: 0,
    salesTrend: [] as any[],
    topProducts: [] as any[],
    topReturns: [] as any[],
    topCities: [] as any[],
    busyHours: [] as any[],
    busyDays: [] as any[]
  });

  useEffect(() => {
    // İlk açılışta varsayılan tarihleri ayarla (Son 30 Gün)
    applyDatePreset("Son 30 Gün");
    fetchBaseData();
  }, []);

  // Tarih değişince raporu yeniden hesapla
  useEffect(() => {
    if (allOrders.length > 0) {
      calculateReports();
    }
  }, [startDate, endDate, allOrders]);

  // 1. VERİTABANINDAN HAM VERİYİ ÇEK (Sadece bir kere)
  async function fetchBaseData() {
    setLoading(true);
    const { data: orders } = await supabase.from('orders').select('*').order('order_date', { ascending: true });
    const { data: prods } = await supabase.from('master_products').select('code, name, total_cost');
    
    if (orders) setAllOrders(orders);
    if (prods) setProducts(prods);
    setLoading(false);
  }

  // 2. TARİH ÖN AYARLARI (PRESETS)
  function applyDatePreset(preset: string) {
    setDateFilter(preset);
    const end = new Date();
    let start = new Date();

    if (preset === "Bugün") {
        start = new Date(); // Bugün başı
    } else if (preset === "Bu Hafta") {
        const day = end.getDay() || 7; // Pazartesiye dön
        if(day !== 1) start.setHours(-24 * (day - 1)); 
    } else if (preset === "Bu Ay") {
        start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (preset === "Bu Yıl") {
        start = new Date(end.getFullYear(), 0, 1);
    } else if (preset === "Son 30 Gün") {
        start.setDate(end.getDate() - 30);
    }

    // Tarihleri input formatına (YYYY-MM-DD) çevir
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }

  // 3. RAPORLARI HESAPLA (Filtrelenmiş Veri İle)
  function calculateReports() {
    // Seçilen tarih aralığına göre filtrele
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // Günün sonuna kadar

    const filteredOrders = allOrders.filter(o => {
        const d = new Date(o.order_date);
        return d >= start && d <= end;
    });

    if (filteredOrders.length === 0) {
        // Veri yoksa sıfırla
        setStats({ totalRevenue: 0, netProfit: 0, totalOrders: 0, avgOrderValue: 0, returnRate: 0, returnCost: 0, salesTrend: [], topProducts: [], topReturns: [], topCities: [], busyHours: [], busyDays: [] });
        return;
    }

    // --- İSTATİSTİKLERİ HESAPLA ---
    const validOrders = filteredOrders.filter(o => o.status !== 'İptal' && o.status !== 'İade');
    const returnedOrders = filteredOrders.filter(o => o.status === 'İade');
    
    const totalRev = validOrders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
    const totalCount = filteredOrders.length;
    
    // Tahmini Kar
    let estimatedProfit = 0;
    validOrders.forEach(o => {
        const prod = products?.find(p => p.code === o.product_code);
        const cost = prod?.total_cost || (o.total_price * 0.5); // Maliyet yoksa %50 varsay
        estimatedProfit += (o.total_price - cost - (o.total_price * 0.21)); 
    });

    const returnCostLoss = returnedOrders.reduce((acc, o) => acc + 50 + (Number(o.total_price) * 0.1), 0);

    // Grafik Verisi (Gün Gün)
    const trendMap = new Map();
    // Tarih aralığındaki günleri doldur (Boş günler 0 olsun)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        trendMap.set(d.toISOString().split('T')[0], 0);
    }
    validOrders.forEach(o => {
        const key = new Date(o.order_date).toISOString().split('T')[0];
        if (trendMap.has(key)) trendMap.set(key, trendMap.get(key) + o.total_price);
    });
    const salesTrend = Array.from(trendMap, ([date, value]) => ({ 
        date: new Date(date).toLocaleDateString('tr-TR', {day:'numeric', month:'short'}), 
        value 
    }));

    // Top Ürünler
    const prodMap = new Map();
    filteredOrders.forEach(o => {
        if (o.status !== 'İptal') {
            const name = o.product_name || o.first_product_name || "Bilinmeyen";
            const cur = prodMap.get(name) || { count: 0, rev: 0 };
            prodMap.set(name, { count: cur.count + (o.product_count || 1), rev: cur.rev + o.total_price });
        }
    });
    const topProducts = Array.from(prodMap, ([name, val]) => ({ name, ...val })).sort((a, b) => b.rev - a.rev).slice(0, 5);

    // Şehirler
    const cityMap = new Map();
    validOrders.forEach(o => {
        let city = o.raw_data?.shipmentAddress?.city || "Belirsiz";
        city = city.toUpperCase().trim();
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });
    const topCities = Array.from(cityMap, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

    // Zaman Analizi
    const hourMap = new Array(24).fill(0);
    const dayMap = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const dayCount = new Array(7).fill(0);
    validOrders.forEach(o => {
        const d = new Date(o.order_date);
        hourMap[d.getHours()]++;
        dayCount[d.getDay()]++;
    });
    const busyHours = hourMap.map((count, hour) => ({ hour: `${hour}:00`, count }));
    const busyDays = dayCount.map((count, i) => ({ day: dayMap[i], count }));

    setStats({
        totalRevenue: totalRev,
        netProfit: estimatedProfit,
        totalOrders: totalCount,
        avgOrderValue: totalCount > 0 ? totalRev / totalCount : 0,
        returnRate: (returnedOrders.length / totalCount) * 100,
        returnCost: returnCostLoss,
        salesTrend,
        topProducts,
        topReturns: [],
        topCities,
        busyHours,
        busyDays
    });
  }

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full">
        
        {/* ÜST BAŞLIK VE FİLTRELER */}
        <div className="px-8 py-6 border-b border-gray-800/50 bg-[#0B1120]">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="text-blue-500"/> İşletme Raporları</h2>
                <p className="text-gray-500 text-sm mt-1">Finansal veriler ve performans analizi</p>
              </div>
              
              {/* TARİH FİLTRESİ KUTUSU */}
              <div className="flex items-center gap-2 bg-[#111827] p-1.5 rounded-xl border border-gray-800">
                  {["Bugün", "Bu Hafta", "Bu Ay", "Bu Yıl", "Son 30 Gün"].map(p => (
                      <button 
                        key={p} 
                        onClick={() => applyDatePreset(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${dateFilter === p ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                      >
                        {p}
                      </button>
                  ))}
                  <div className="h-6 w-px bg-gray-700 mx-1"></div>
                  <div className="flex items-center gap-2 px-2">
                      <input type="date" className="bg-[#0f1623] border border-gray-700 rounded p-1 text-white text-xs outline-none" value={startDate} onChange={e => {setStartDate(e.target.value); setDateFilter("Özel");}} />
                      <span className="text-gray-500">-</span>
                      <input type="date" className="bg-[#0f1623] border border-gray-700 rounded p-1 text-white text-xs outline-none" value={endDate} onChange={e => {setEndDate(e.target.value); setDateFilter("Özel");}} />
                  </div>
              </div>
           </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                <RefreshCw size={48} className="animate-spin mb-4 text-blue-500"/>
                <p>Veriler analiz ediliyor...</p>
            </div>
        ) : (
        <div className="p-8 space-y-6">
          
          {/* KPI KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <KPICard title="Toplam Ciro" value={`₺${stats.totalRevenue.toLocaleString('tr-TR', {maximumFractionDigits:0})}`} icon={<TrendingUp className="text-green-500"/>} sub={`${startDate} - ${endDate}`} />
             <KPICard title="Toplam Sipariş" value={stats.totalOrders} icon={<ShoppingBag className="text-blue-500"/>} sub="Adet" />
             <KPICard title="Tahmini Net Kar" value={`₺${stats.netProfit.toLocaleString('tr-TR', {maximumFractionDigits:0})}`} icon={<CreditCard className="text-purple-500"/>} sub="Maliyet Sonrası" color="text-green-400" />
             <KPICard title="İade Oranı" value={`%${stats.returnRate.toFixed(1)}`} icon={<AlertCircle className="text-red-500"/>} sub={`Maliyet: ₺${stats.returnCost.toLocaleString()}`} color={stats.returnRate > 10 ? "text-red-500" : "text-orange-400"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* SOL: SATIŞ GRAFİĞİ */}
             <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2"><Calendar size={18} className="text-gray-400"/> Satış Trendi</h3>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Günlük Ciro Grafiği</span>
                </div>
                <div className="h-64 flex items-end justify-between gap-2 border-b border-gray-800 pb-2">
                   {stats.salesTrend.map((day, i) => {
                      const max = Math.max(...stats.salesTrend.map(s => s.value)) || 100;
                      const height = (day.value / max) * 100;
                      return (
                         <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                             <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-700 whitespace-nowrap">
                                    {day.date}: ₺{day.value.toLocaleString()}
                                </div>
                             </div>
                             <div className="w-full bg-blue-900/20 rounded-t-sm h-full flex items-end relative overflow-hidden hover:bg-blue-900/40 transition">
                                <div className="w-full bg-blue-600 hover:bg-blue-500 transition-all duration-500" style={{height: `${height}%`}}></div>
                             </div>
                             {/* Sadece belirli günlerin tarihini yaz (Kalabalık olmasın) */}
                             {i % Math.ceil(stats.salesTrend.length / 7) === 0 && <span className="text-[9px] text-gray-500 rotate-0">{day.date}</span>}
                         </div>
                      )
                   })}
                </div>
             </div>

             {/* SAĞ: EN ÇOK SATANLAR */}
             <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold mb-6">Ciro Şampiyonları</h3>
                <div className="space-y-4">
                   {stats.topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${i===0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800 text-gray-500'}`}>{i+1}</span>
                            <div className="truncate">
                               <p className="text-gray-300 text-xs font-medium truncate w-32" title={p.name}>{p.name}</p>
                               <p className="text-[10px] text-gray-500">{p.count} Adet</p>
                            </div>
                         </div>
                         <span className="text-white text-xs font-bold">₺{p.rev.toLocaleString()}</span>
                      </div>
                   ))}
                   {stats.topProducts.length === 0 && <p className="text-gray-500 text-sm">Veri yok.</p>}
                </div>
             </div>
          </div>

          {/* ALT: BÖLGE VE ZAMAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2"><MapPin size={18} className="text-purple-500"/> En Çok Satış Yapılan Şehirler</h3>
                 <div className="flex gap-2 flex-wrap">
                    {stats.topCities.map((c, i) => (
                        <div key={i} className="bg-[#0f1623] px-3 py-2 rounded-lg border border-gray-700 flex items-center gap-2">
                            <span className="text-gray-400 text-xs font-bold">{i+1}.</span>
                            <span className="text-white text-sm font-bold">{c.name}</span>
                            <span className="text-blue-500 text-xs bg-blue-500/10 px-1.5 rounded">{c.count}</span>
                        </div>
                    ))}
                 </div>
              </div>
              
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-orange-500"/> En Yoğun Saatler</h3>
                 <div className="flex items-end gap-1 h-32">
                    {stats.busyHours.map((h, i) => {
                        const max = Math.max(...stats.busyHours.map(x=>x.count)) || 10;
                        const height = (h.count / max) * 100;
                        return (
                            <div key={i} className="flex-1 bg-orange-900/10 h-full flex items-end group relative hover:bg-orange-900/20">
                                <div className="w-full bg-orange-600 transition-all" style={{height: `${height}%`}}></div>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none">{i}:00</span>
                            </div>
                        )
                    })}
                 </div>
                 <div className="flex justify-between mt-1 text-[9px] text-gray-500"><span>00:00</span><span>12:00</span><span>23:00</span></div>
              </div>
          </div>

        </div>
        )}
      </main>
    </div>
  );
}

function KPICard({ title, value, icon, sub, color = "text-white" }: any) {
    return (
        <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 shadow-sm hover:border-gray-700 transition">
            <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                <div className="p-2 bg-gray-800 rounded-lg">{icon}</div>
            </div>
            <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
            <p className="text-[10px] text-gray-500 mt-1">{sub}</p>
        </div>
    );
}