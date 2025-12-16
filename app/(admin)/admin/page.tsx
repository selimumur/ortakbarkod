"use client";

import { useEffect, useState } from 'react';
import {
    Users, TrendingUp, AlertTriangle, Activity,
    ArrowUpRight, ArrowDownRight, Globe, Shield, RefreshCw, MessageSquare
} from 'lucide-react';
import { getAdminStatsAction } from '@/app/actions/adminActions';
import { getRecentUnansweredTicketsAction } from '@/app/actions/supportActions';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [statsData, ticketsData] = await Promise.all([
                getAdminStatsAction(),
                getRecentUnansweredTicketsAction()
            ]);
            setStats({ ...statsData, unansweredTickets: ticketsData });
        } catch (error) {
            console.error(error);
            toast.error("Veriler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    if (loading) return <div className="text-white flex items-center gap-2"><RefreshCw className="animate-spin" /> Yükleniyor...</div>;
    if (!stats) return <div className="text-red-400">Veri yok.</div>;

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Platform Genel Bakış
                        <span className="text-xs bg-red-600 px-2 py-1 rounded text-white font-bold ml-2 animate-pulse">CANLI</span>
                    </h2>
                    <p className="text-gray-400 mt-2">Süper Admin Paneli - Cloud Native Yönetim</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadStats} className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition">
                        <RefreshCw size={16} />
                    </button>
                    <div className="bg-green-900/20 border border-green-500/20 px-4 py-2 rounded-lg flex items-center gap-2">
                        <Activity size={16} className="text-green-500" />
                        <span className="text-sm font-bold text-green-400">Sistem: %{stats.systemHealth} Sağlık</span>
                    </div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard
                    title="Toplam Ciro"
                    value={`₺${stats.totalRevenue.toLocaleString()}`}
                    trend={0}
                    icon={<TrendingUp size={24} className="text-emerald-400" />}
                    color="emerald"
                />
                <KpiCard
                    title="Aktif Kiracı (Tenant)"
                    value={stats.activeTenants}
                    trend={0}
                    icon={<Globe size={24} className="text-blue-400" />}
                    color="blue"
                />
                <KpiCard
                    title="Toplam Kullanıcı"
                    value={stats.totalUsers} // Placeholder for now
                    trend={0}
                    icon={<Users size={24} className="text-purple-400" />}
                    color="purple"
                />
                <KpiCard
                    title="Aktif Abonelikler"
                    value={stats.activeTenants}
                    trend={0}
                    icon={<Shield size={24} className="text-orange-400" />}
                    color="orange"
                />
            </div>

            {/* SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* RECENT SIGNUPS */}
                <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-white">Son Abonelikler</h3>
                    </div>
                    <div className="space-y-4">
                        {stats.recentSignups.length === 0 ? <p className="text-gray-500 text-sm">Henüz kayıt yok.</p> : stats.recentSignups.map((s: any, i: number) => {
                            const startDate = new Date(s.start_date);
                            const endDate = s.current_period_end ? new Date(s.current_period_end) : null;
                            const diffDays = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                            const durationLabel = diffDays > 360 ? `${Math.round(diffDays / 365)} Yıl` : `${diffDays} Gün`;

                            return (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white border border-gray-700 font-bold text-xs">
                                            {(s.company_name?.substring(0, 2) || s.tenant_id?.substring(0, 2) || "??").toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white max-w-[150px] truncate" title={s.company_name}>{s.company_name !== 'Bilinmiyor' ? s.company_name : 'Firma Adı Girilmemiş'}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{s.tenant_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded uppercase border border-blue-500/20 mb-1">{s.plan_id}</span>
                                        <span className="text-[10px] text-gray-400">{durationLabel}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* UNANSWERED TICKETS */}
                <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><MessageSquare size={100} /></div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-white">Bekleyen Destek Talepleri</h3>
                        <Link href="/admin/support" className="text-xs text-blue-400 hover:text-blue-300">Tümünü Gör →</Link>
                    </div>
                    <div className="space-y-3 relative z-10">
                        {stats.unansweredTickets?.length === 0 ? (
                            <div className="text-gray-500 text-sm">Bekleyen talep yok. Harika! 🎉</div>
                        ) : (
                            stats.unansweredTickets?.map((t: any) => (
                                <Link href={`/admin/support/${t.id}`} key={t.id} className="block bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition">{t.subject}</h4>
                                            <p className="text-xs text-gray-400 mt-1">{t.company_name} • <span className="text-gray-500">{new Date(t.created_at).toLocaleDateString()}</span></p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {t.priority}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function KpiCard({ title, value, trend, icon, color, inverse = false }: any) {
    const isPositive = trend >= 0;
    const isGood = inverse ? !isPositive : isPositive;
    const colorClass = {
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    }[color as string] || 'bg-gray-800';

    return (
        <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl border ${colorClass}`}>{icon}</div>
            </div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{title}</p>
            <h3 className="text-2xl font-black text-white mt-1 group-hover:scale-105 transition origin-left">{value}</h3>
        </div>
    )
}
