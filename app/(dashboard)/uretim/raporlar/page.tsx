"use client";

import { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from "recharts";
import { Factory } from "lucide-react";
import { getProductionReportsAction } from '@/app/actions/productionActions';

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ProductionReportsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalProduced: 0,
        activeOrders: 0,
        efficiency: 0,
        scrapRate: 0
    });

    const [dailyProduction, setDailyProduction] = useState<any[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const data = await getProductionReportsAction();
            if (data) {
                setStats(data.stats as any);
                setDailyProduction(data.dailyProduction);
                setStatusDistribution(data.statusDistribution);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

    return (
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-[#0B1120] text-white font-sans">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Factory className="text-blue-500" /> Üretim Raporları
            </h1>

            {/* Özet Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SummaryCard title="Toplam Üretim (Adet)" value={stats.totalProduced} color="text-blue-400" />
                <SummaryCard title="Aktif İş Emri" value={stats.activeOrders} color="text-yellow-400" />
                <SummaryCard title="Band Verimliliği" value={`%${stats.efficiency}`} color="text-green-400" />
                <SummaryCard title="Fire Oranı" value={`%${stats.scrapRate}`} color="text-red-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Günlük Üretim Grafiği */}
                <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800">
                    <h3 className="text-lg font-bold mb-6">Son 7 Gün İş Emri Girişi</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyProduction}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Durum Dağılımı */}
                <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800">
                    <h3 className="text-lg font-bold mb-6">İş Emri Durum Dağılımı</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, color }: any) {
    return (
        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800">
            <p className="text-gray-500 text-sm font-bold uppercase">{title}</p>
            <p className={`text-4xl font-black mt-2 ${color}`}>{value}</p>
        </div>
    );
}