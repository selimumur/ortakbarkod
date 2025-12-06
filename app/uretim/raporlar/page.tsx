"use client";

import { useState, useEffect } from 'react';
import { 
    BarChart3, Calendar, Users, Package, ArrowLeft, 
    Trophy, Download, Filter, RefreshCw, Clock, Box 
} from 'lucide-react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProductionReportsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pendingCount, setPendingCount] = useState(0); // Devam Eden İşler
    
    // Filtreler (Varsayılan: Bugün)
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    // İstatistikler
    const [stats, setStats] = useState({
        totalBoxes: 0,
        totalItems: 0, // Toplam Ürün Adedi
        topStaff: { name: '-', count: 0 },
        staffRanking: [] as any[],
        productRanking: [] as any[] // Ürün Bazlı Rapor
    });

    useEffect(() => {
        fetchReports();
        fetchPendingWork();
    }, [startDate, endDate]);

    // 1. BEKLEYEN İŞLERİ HESAPLA (Canlı Durum)
    async function fetchPendingWork() {
        const { data } = await supabase
            .from('work_orders')
            .select('quantity, completed_quantity')
            .neq('status', 'Tamamlandı');
        
        if (data) {
            // (Toplam Hedef - Biten) = Kalan İş
            const totalRemaining = data.reduce((acc, order) => {
                const remaining = (order.quantity || 0) - (order.completed_quantity || 0);
                return acc + (remaining > 0 ? remaining : 0);
            }, 0);
            setPendingCount(totalRemaining);
        }
    }

    // 2. GEÇMİŞ RAPORLARI ÇEK
    async function fetchReports() {
        setLoading(true);
        
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('production_logs')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDateTime.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Rapor hatası.");
        } else {
            setLogs(data || []);
            analyzeData(data || []);
        }
        setLoading(false);
    }

    // --- VERİ ANALİZ MOTORU ---
    function analyzeData(data: any[]) {
        let totalBoxes = 0;
        let totalItems = 0;
        let staffPerformance: any = {};
        let productPerformance: any = {};

        data.forEach(log => {
            // Koli Sayısı
            const boxCount = log.box_count || 0;
            totalBoxes += boxCount;

            // Adet Sayısı (QR Data içinden veya koli mantığından)
            // QR Data formatımız: "Miktar: 50" şeklinde string. Onu ayıklıyoruz.
            let itemCount = 0;
            try {
                if (log.qr_data && log.qr_data.includes('Miktar:')) {
                    const parts = log.qr_data.split('Miktar:');
                    itemCount = parseInt(parts[1]) || 0;
                }
            } catch (e) { itemCount = 0; }
            
            totalItems += itemCount;

            // 1. Personel Analizi
            const staffList = log.packing_staff ? log.packing_staff.split(',') : [];
            staffList.forEach((s: string) => {
                const name = s.trim();
                if (name) {
                    if (!staffPerformance[name]) staffPerformance[name] = 0;
                    staffPerformance[name] += itemCount > 0 ? itemCount : boxCount; // Adet varsa adet, yoksa koli puanı
                }
            });

            // 2. Ürün Analizi
            const pName = log.product_name || "Bilinmeyen Ürün";
            if (!productPerformance[pName]) {
                productPerformance[pName] = { boxes: 0, items: 0 };
            }
            productPerformance[pName].boxes += boxCount;
            productPerformance[pName].items += itemCount;
        });

        // Personel Sıralaması
        const sortedStaff = Object.entries(staffPerformance)
            .map(([name, count]) => ({ name, count: Number(count) }))
            .sort((a, b) => b.count - a.count);

        // Ürün Sıralaması
        const sortedProducts = Object.entries(productPerformance)
            .map(([name, val]: any) => ({ name, boxes: val.boxes, items: val.items }))
            .sort((a, b) => b.items - a.items);

        setStats({
            totalBoxes,
            totalItems,
            topStaff: sortedStaff.length > 0 ? sortedStaff[0] : { name: '-', count: 0 },
            staffRanking: sortedStaff,
            productRanking: sortedProducts
        });
    }

    return (
        <div className="w-full h-full bg-[#0B1120] p-6 overflow-y-auto">
            {/* BAŞLIK & FİLTRE */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                    <Link href="/uretim" className="bg-gray-800 p-2 rounded-lg text-gray-400 hover:text-white transition"><ArrowLeft size={20}/></Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BarChart3 className="text-purple-500"/> Üretim Kokpiti
                        </h1>
                        <p className="text-gray-500 text-xs mt-1">Fabrika performans raporları.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-[#161f32] p-1.5 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 px-2">
                        <Calendar size={14} className="text-gray-400"/>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-transparent text-white text-xs outline-none w-24"/>
                    </div>
                    <span className="text-gray-500">-</span>
                    <div className="flex items-center gap-2 px-2">
                        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-transparent text-white text-xs outline-none w-24"/>
                    </div>
                    <button onClick={() => { fetchReports(); fetchPendingWork(); }} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition"><RefreshCw size={14}/></button>
                </div>
            </div>

            {/* --- ÖZET KARTLARI (4 Adet) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                
                {/* 1. BEKLEYEN İŞ (İstediğin Sol Taraf) */}
                <div className="bg-[#1F2937] p-5 rounded-2xl border border-orange-500/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Clock size={64} className="text-orange-500"/></div>
                    <p className="text-orange-400 text-xs font-bold uppercase mb-1">Paketlenecek (Bekleyen)</p>
                    <h3 className="text-3xl font-bold text-white">{pendingCount} <span className="text-sm font-normal text-gray-500">Adet</span></h3>
                    <p className="text-[10px] text-gray-500 mt-1">Hatta işlem gören aktif işler.</p>
                </div>

                {/* 2. TOPLAM ÜRETİM (Seçilen Tarih) */}
                <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Package size={64}/></div>
                    <p className="text-blue-400 text-xs font-bold uppercase mb-1">Tamamlanan Üretim</p>
                    <h3 className="text-3xl font-bold text-white">{stats.totalItems} <span className="text-sm font-normal text-gray-500">Adet</span></h3>
                    <p className="text-[10px] text-gray-500 mt-1">{stats.totalBoxes} Koli çıkışı yapıldı.</p>
                </div>

                {/* 3. ŞAMPİYON PERSONEL */}
                <div className="bg-gradient-to-br from-yellow-900/40 to-[#1F2937] p-5 rounded-2xl border border-yellow-700/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-yellow-500"><Trophy size={64}/></div>
                    <p className="text-yellow-500/80 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Trophy size={12}/> En Hızlı Personel</p>
                    <h3 className="text-2xl font-bold text-white truncate">{stats.topStaff.name}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{stats.topStaff.count} Adet işlem yaptı.</p>
                </div>

                {/* 4. VERİMLİLİK (Basit Oran) */}
                <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={64}/></div>
                    <p className="text-green-400 text-xs font-bold uppercase mb-1">Aktif Personel</p>
                    <h3 className="text-3xl font-bold text-white">{stats.staffRanking.length} <span className="text-sm font-normal text-gray-500">Kişi</span></h3>
                    <p className="text-[10px] text-gray-500 mt-1">Bugün çalışan sayısı.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                
                {/* --- SOL KOLON: DETAYLI TABLOLAR --- */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-full overflow-hidden">
                    
                    {/* ÜRÜN BAZLI RAPOR */}
                    <div className="bg-[#161f32] border border-gray-700 rounded-2xl flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                            <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                <Box size={16} className="text-blue-500"/> Ürün Bazlı Kapanış
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#1F2937] text-gray-400 font-bold sticky top-0">
                                    <tr><th className="p-3">Ürün</th><th className="p-3 text-right">Adet</th><th className="p-3 text-right">Koli</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 text-gray-300">
                                    {stats.productRanking.map((prod, i) => (
                                        <tr key={i} className="hover:bg-gray-800/50">
                                            <td className="p-3 font-medium truncate max-w-[150px]" title={prod.name}>{prod.name}</td>
                                            <td className="p-3 text-right font-bold text-white">{prod.items}</td>
                                            <td className="p-3 text-right text-gray-500">{prod.boxes}</td>
                                        </tr>
                                    ))}
                                    {stats.productRanking.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-600">Veri yok.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PERSONEL SIRALAMASI */}
                    <div className="bg-[#161f32] border border-gray-700 rounded-2xl flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                            <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                <Users size={16} className="text-green-500"/> Personel Performansı
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {stats.staffRanking.map((staff, idx) => {
                                const max = stats.topStaff.count || 1;
                                const percent = (staff.count / max) * 100;
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-300 font-bold flex items-center gap-2">
                                                <span className="w-4 h-4 bg-gray-700 rounded-full flex items-center justify-center text-[9px]">{idx + 1}</span>
                                                {staff.name}
                                            </span>
                                            <span className="text-white font-mono">{staff.count}</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                                            <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* --- SAĞ KOLON: AKIŞ (LOGLAR) --- */}
                <div className="lg:col-span-2 bg-[#111827] border border-gray-700 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                    <div className="p-5 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Filter size={18} className="text-blue-500"/> Paketleme Hareketleri
                        </h3>
                        <span className="text-xs text-gray-500">{logs.length} Kayıt</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-[#1F2937] text-xs uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-4">Saat</th>
                                    <th className="p-4">Ürün</th>
                                    <th className="p-4">Personel</th>
                                    <th className="p-4 text-center">Adet</th>
                                    <th className="p-4">Detay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {logs.map((log) => {
                                    // Adet bilgisini QR datadan çekme denemesi (Görsel amaçlı)
                                    let itemCount = "-";
                                    if(log.qr_data && log.qr_data.includes('Miktar:')) itemCount = log.qr_data.split('Miktar:')[1].split('-')[0].trim();

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-800/30 transition">
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="text-white font-mono text-xs">{new Date(log.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white font-medium block truncate max-w-[200px]">{log.product_name}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {log.packing_staff?.split(',').map((p:string, i:number) => (
                                                        <span key={i} className="text-[10px] bg-blue-900/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900/30">{p.trim()}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-bold text-white">
                                                {itemCount !== "-" ? itemCount : log.box_count + " Koli"}
                                            </td>
                                            <td className="p-4 text-xs text-gray-500">
                                                {log.accessory_staff ? `Aksesuar: ${log.accessory_staff}` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {logs.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500">Kayıt yok.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}