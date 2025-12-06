"use client";

import { useEffect, useState } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Activity, Calendar, CreditCard, Building2, DollarSign, PieChart, 
  BarChart3, Landmark, FileText
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell, Pie, PieChart as RePieChart
} from 'recharts';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function AccountingDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,   // Toplam Kasa+Banka
    totalReceivables: 0, // Alacaklar
    totalPayables: 0,    // Borçlar
    monthlySales: 0,     // Bu Ay Satış
    monthlyPurchases: 0, // Bu Ay Alış
    netProfit: 0         // Net Kâr
  });
  
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]); // Gelir Gider Grafiği

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // 1. KASA & BANKA VARLIKLARI
      const { data: accs } = await supabase.from('financial_accounts').select('*');
      const assets = accs?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      setAccounts(accs || []);

      // 2. ALACAK & BORÇLAR (Carilerden)
      const { data: customers } = await supabase.from('customers').select('balance');
      const receivables = customers?.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0) || 0; // Pozitifler alacak

      const { data: suppliers } = await supabase.from('suppliers').select('balance');
      const payables = suppliers?.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0) || 0; // Tedarikçide pozitif borçtur (senin sistemine göre)

      // 3. BU AYIN FATURALARI & GRAFİK VERİSİ
      const { data: allInvoices } = await supabase.from('invoices').select('*').order('issue_date', { ascending: true });
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      let mSales = 0;
      let mPurchases = 0;

      // Son 6 ayın verisini hazırla
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
            name: d.toLocaleDateString('tr-TR', { month: 'short' }),
            month: d.getMonth(),
            year: d.getFullYear(),
            satis: 0,
            alis: 0
        };
      });

      allInvoices?.forEach(inv => {
          const invDate = new Date(inv.issue_date);
          const amt = Number(inv.total_amount);

          // Bu ayın özeti
          if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
              if (inv.invoice_type === 'sales') mSales += amt;
              else mPurchases += amt;
          }

          // Grafik verisi doldurma
          const monthData = last6Months.find(m => m.month === invDate.getMonth() && m.year === invDate.getFullYear());
          if (monthData) {
              if (inv.invoice_type === 'sales') monthData.satis += amt;
              else monthData.alis += amt;
          }
      });

      // 4. SON FATURALAR
      const { data: recentInv } = await supabase.from('invoices').select('*, customer:customers(name), supplier:suppliers(name)').order('created_at', { ascending: false }).limit(5);
      setRecentInvoices(recentInv || []);

      setStats({
        totalAssets: assets,
        totalReceivables: receivables,
        totalPayables: payables,
        monthlySales: mSales,
        monthlyPurchases: mPurchases,
        netProfit: mSales - mPurchases
      });
      setChartData(last6Months);

    } catch (error) {
      console.error("Dashboard verisi çekilirken hata:", error);
    } finally {
      setLoading(false);
    }
  }

  // Pasta Grafiği Verisi (Nakit Dağılımı)
  const pieData = accounts.map(acc => ({ name: acc.name, value: acc.balance }));
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="animate-pulse">Finansal veriler analiz ediliyor...</p>
      </div>
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#0B1120] text-white font-sans overflow-hidden">
      
      {/* BAŞLIK ALANI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 animate-in slide-in-from-top duration-500">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-3">
            <Activity className="text-blue-500" size={40} /> Finansal Kokpit
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Hoşgeldin Patron, işte şirketinin finansal röntgeni.</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
            <Link href="/muhasebe/fatura" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-2xl font-bold transition shadow-lg shadow-blue-900/40 flex items-center gap-2">
                <FileText size={20}/> Fatura Kes
            </Link>
            <Link href="/muhasebe/finans/islem" className="bg-[#1f2937] border border-gray-700 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl font-bold transition flex items-center gap-2">
                <Wallet size={20}/> Kasa İşlemi
            </Link>
        </div>
      </div>

      {/* 1. KPI KARTLARI (GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KART 1: TOPLAM NAKİT VARLIK */}
        <div className="bg-[#111827] border border-gray-800 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Landmark size={100} className="text-blue-500"/>
          </div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Wallet size={24} />
             </div>
             <span className="text-gray-400 font-bold text-sm tracking-wider uppercase">Toplam Varlık</span>
          </div>
          <h3 className="text-4xl font-black text-white mb-1">₺{stats.totalAssets.toLocaleString('tr-TR')}</h3>
          <p className="text-blue-400 text-xs font-bold bg-blue-500/10 inline-block px-2 py-1 rounded-lg mt-2">
             Nakit + Banka
          </p>
        </div>

        {/* KART 2: NET KÂR (BU AY) */}
        <div className="bg-[#111827] border border-gray-800 p-6 rounded-3xl relative overflow-hidden group hover:border-green-500/50 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <TrendingUp size={100} className="text-green-500"/>
          </div>
          <div className="flex items-center gap-4 mb-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.netProfit >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {stats.netProfit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
             </div>
             <span className="text-gray-400 font-bold text-sm tracking-wider uppercase">Net Kâr (Bu Ay)</span>
          </div>
          <h3 className={`text-4xl font-black mb-1 ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
             {stats.netProfit >= 0 ? '+' : ''}₺{stats.netProfit.toLocaleString('tr-TR')}
          </h3>
          <p className="text-gray-500 text-xs mt-2">
             Satışlar - Alışlar
          </p>
        </div>

        {/* KART 3: ALACAKLAR */}
        <div className="bg-[#111827] border border-gray-800 p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <ArrowDownRight size={100} className="text-purple-500"/>
          </div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <CreditCard size={24} />
             </div>
             <span className="text-gray-400 font-bold text-sm tracking-wider uppercase">Toplam Alacak</span>
          </div>
          <h3 className="text-4xl font-black text-white mb-1">₺{stats.totalReceivables.toLocaleString('tr-TR')}</h3>
          <p className="text-purple-400 text-xs font-bold bg-purple-500/10 inline-block px-2 py-1 rounded-lg mt-2">
             Piyasadan Gelecekler
          </p>
        </div>

        {/* KART 4: BORÇLAR */}
        <div className="bg-[#111827] border border-gray-800 p-6 rounded-3xl relative overflow-hidden group hover:border-orange-500/50 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <ArrowUpRight size={100} className="text-orange-500"/>
          </div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Building2 size={24} />
             </div>
             <span className="text-gray-400 font-bold text-sm tracking-wider uppercase">Toplam Borç</span>
          </div>
          <h3 className="text-4xl font-black text-white mb-1">₺{stats.totalPayables.toLocaleString('tr-TR')}</h3>
          <p className="text-orange-400 text-xs font-bold bg-orange-500/10 inline-block px-2 py-1 rounded-lg mt-2">
             Tedarikçilere Ödenecek
          </p>
        </div>

      </div>

      {/* 2. GRAFİK ALANI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* SOL: GELİR GİDER TRENDİ */}
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-blue-500"/> Gelir / Gider Trendi (Son 6 Ay)
             </h3>
             <div className="flex gap-4 text-sm font-bold">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Satışlar</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Alışlar</div>
             </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSatis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" tick={{fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#6B7280" tick={{fontSize: 12}} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `₺${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="satis" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorSatis)" name="Satış Geliri" />
                <Area type="monotone" dataKey="alis" stroke="#EF4444" strokeWidth={4} fillOpacity={1} fill="url(#colorAlis)" name="Alış Gideri" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SAĞ: VARLIK DAĞILIMI (PASTA) */}
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
             <PieChart className="text-purple-500"/> Varlık Dağılımı
          </h3>
          <div className="h-[250px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none' }} />
               </RePieChart>
             </ResponsiveContainer>
             {/* Ortadaki Toplam */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-gray-400 text-xs uppercase font-bold">Toplam</span>
                <p className="text-white font-bold text-lg">₺{stats.totalAssets.toLocaleString()}</p>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
             {accounts.map((acc, idx) => (
                <div key={acc.id} className="flex justify-between items-center p-3 rounded-xl bg-[#1f2937]/50 border border-gray-800">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                      <span className="text-sm text-gray-300">{acc.name}</span>
                   </div>
                   <span className="text-sm font-bold text-white">₺{acc.balance.toLocaleString()}</span>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* 3. ALT BÖLÜM: SON İŞLEMLER */}
      <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <FileText className="text-orange-500"/> Son Faturalar
            </h3>
            <Link href="/muhasebe/fatura" className="text-sm text-blue-400 hover:text-blue-300 font-bold">Tümünü Gör →</Link>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                     <th className="p-4 font-bold">Tarih</th>
                     <th className="p-4 font-bold">Fatura No</th>
                     <th className="p-4 font-bold">Cari / İsim</th>
                     <th className="p-4 font-bold text-center">Tür</th>
                     <th className="p-4 font-bold text-right">Tutar</th>
                     <th className="p-4 font-bold text-center">Durum</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-800 text-sm">
                  {recentInvoices.length === 0 ? (
                     <tr><td colSpan={6} className="p-6 text-center text-gray-500">Henüz fatura kaydı yok.</td></tr>
                  ) : (
                     recentInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-gray-800/30 transition group">
                           <td className="p-4 text-gray-300 font-medium">
                              {new Date(inv.issue_date).toLocaleDateString('tr-TR')}
                           </td>
                           <td className="p-4 font-mono text-xs text-gray-400 group-hover:text-white transition">
                              {inv.invoice_no}
                           </td>
                           <td className="p-4 font-bold text-white">
                              {inv.customer?.name || inv.supplier?.name || '-'}
                           </td>
                           <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                 inv.invoice_type === 'sales' 
                                 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                 : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              }`}>
                                 {inv.invoice_type === 'sales' ? 'Satış' : 'Alış'}
                              </span>
                           </td>
                           <td className={`p-4 text-right font-black text-base ${inv.invoice_type === 'sales' ? 'text-green-400' : 'text-red-400'}`}>
                              ₺{inv.total_amount.toLocaleString()}
                           </td>
                           <td className="p-4 text-center">
                              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                 {inv.status}
                              </span>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}