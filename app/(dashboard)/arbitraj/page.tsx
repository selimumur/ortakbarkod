"use client";

import { useState, useEffect } from 'react';
import {
    TrendingUp, Activity, Search, Filter, Eye, ArrowUpRight,
    DollarSign, RotateCw, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { getArbitrageOpportunitiesAction, type ArbitrageOpportunity } from '@/app/actions/arbitrageActions';

import { useAuth } from '@clerk/nextjs';

export default function ArbitragePage() {
    const { orgId } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
    const [loading, setLoading] = useState(true);

    // Metrics
    const [metrics, setMetrics] = useState({
        totalPotential: 0,
        count: 0,
        new24h: 0
    });

    useEffect(() => {
        if (orgId) {
            fetchOpportunities();
        }
    }, [orgId]);

    async function fetchOpportunities() {
        setLoading(true);
        try {
            const res = await getArbitrageOpportunitiesAction();

            if (res.success && res.data) {
                setOpportunities(res.data);

                // Calculate Metrics
                const totalProfit = res.data.reduce((acc, curr) => acc + (curr.profit_amount || 0), 0);
                const count = res.data.length;
                // Mock 24h count for now
                const newCount = res.data.filter((d) => new Date(d.created_at).getTime() > Date.now() - 86400000).length;

                setMetrics({
                    totalPotential: totalProfit,
                    count: count,
                    new24h: newCount
                });

            } else {
                toast.error(res.error || "Fırsatlar yüklenemedi");
            }
        } catch (e) {
            console.error(e);
            toast.error("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    }

    const filteredData = opportunities.filter(item =>
        (filterStatus === "all" || item.status === filterStatus) &&
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="md:p-8 p-4 min-h-full bg-[#0B1120] text-white">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                        <TrendingUp className="text-blue-500" /> Arbitraj Fırsatları
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Global pazarlardaki anlık fiyat farklarını yakalayın ve kar edin.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchOpportunities} className="px-3 py-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                        <RotateCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => toast.success("Tarama botu kuyruğa alındı.")} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20">
                        Yeni Tarama Başlat
                    </button>
                </div>
            </div>

            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Card 1 */}
                <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-500">
                        <DollarSign size={64} className="text-green-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Toplam Potansiyel Kar</p>
                    <h3 className="text-3xl font-black text-white">₺{metrics.totalPotential.toLocaleString()}</h3>
                    <div className="flex items-center gap-1 mt-2 text-green-400 text-xs font-bold bg-green-500/10 w-fit px-2 py-1 rounded">
                        <ArrowUpRight size={12} />
                        <span>Aktif Fırsatlar</span>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-500">
                        <Eye size={64} className="text-blue-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Aktif İzlenen Fırsat</p>
                    <h3 className="text-3xl font-black text-white">{metrics.count}</h3>
                    <div className="flex items-center gap-1 mt-2 text-blue-400 text-xs font-bold bg-blue-500/10 w-fit px-2 py-1 rounded">
                        <span>Veritabanı Güncel</span>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-500">
                        <Activity size={64} className="text-purple-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Son 24 Saat</p>
                    <h3 className="text-3xl font-black text-white">{metrics.new24h}</h3>
                    <div className="flex items-center gap-1 mt-2 text-purple-400 text-xs font-bold bg-purple-500/10 w-fit px-2 py-1 rounded">
                        <span>Yeni Tespit</span>
                    </div>
                </div>
            </div>

            {/* DATA TABLE SECTION */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">

                {/* Table Header / Toolbar */}
                <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h2 className="font-bold text-lg text-white">Fırsat Listesi</h2>

                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Ürün Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 w-full md:w-64"
                            />
                        </div>

                        {/* Filter */}
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="pl-3 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="Aktif">Aktif</option>
                                <option value="İnceleniyor">İnceleniyor</option>
                                <option value="Kapandı">Kapandı</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-900/50 text-xs uppercase font-bold text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Ürün Adı</th>
                                <th className="px-6 py-4">Kaynak / Hedef</th>
                                <th className="px-6 py-4">Fiyat Farkı</th>
                                <th className="px-6 py-4">Potansiyel Kar</th>
                                <th className="px-6 py-4">Güven Skoru</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4 text-right">Eylem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredData.length > 0 ? filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-800/30 transition group">
                                    <td className="px-6 py-4 font-medium text-white group-hover:text-blue-400 transition cursor-pointer">
                                        {item.product_name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <span className="text-gray-300">{item.source_market || 'Bilinmiyor'} ➔</span>
                                            <span className="font-bold text-blue-400">{item.target_market || 'Bilinmiyor'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="line-through text-gray-600 text-xs">₺{item.source_price?.toLocaleString()}</span>
                                            <span className="text-white font-bold">₺{item.target_price?.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-green-400 font-bold text-base">₺{item.profit_amount?.toLocaleString()}</span>
                                            <span className="text-green-600 text-xs">%{item.profit_margin?.toFixed(1)} Marj</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${item.risk_score > 80 ? 'bg-green-500' : item.risk_score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${item.risk_score || 50}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-mono">{item.risk_score}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Aktif' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            item.status === 'İnceleniyor' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                'bg-gray-700 text-gray-400'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Search size={32} className="mb-2 opacity-50" />
                                            <p>Henüz aktif bir fırsat yok veya arama kriterleri eşleşmedi.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
