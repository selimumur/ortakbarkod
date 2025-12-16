"use client";

import { useEffect, useState, useRef } from 'react';
import { getSystemHealthAction } from '@/app/actions/systemActions';
import { Loader2, Activity, ShieldAlert, DollarSign, Users, Terminal, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function GodModePage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        try {
            const res = await getSystemHealthAction();
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(() => {
            if (autoRefresh) load();
        }, 5000); // 5s Heartbeat

        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Auto-scroll terminal
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data?.logs]);

    if (loading && !data) return <div className="bg-black min-h-screen flex items-center justify-center text-green-500 font-mono"><Loader2 className="animate-spin mr-2" /> INITIALIZING GOD MODE...</div>;

    const stats = data?.stats || {};
    const logs = data?.logs || [];

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-6">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 border-b border-green-900 pb-4">
                <h1 className="text-3xl font-bold flex items-center gap-3 animate-pulse">
                    <Activity size={32} /> GOD MODE_
                </h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                        <span className="text-xs">SYSTEM ONLINE</span>
                    </div>
                    <button onClick={() => setAutoRefresh(!autoRefresh)} className={`p-2 border border-green-700 rounded hover:bg-green-900/50 ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`}>
                        <RefreshCw size={18} className={autoRefresh ? "animate-spin-slow" : ""} />
                    </button>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-green-900/10 border border-green-900/50 p-6 rounded-lg uppercase">
                    <div className="text-xs text-green-700 mb-2">Active Tenants</div>
                    <div className="text-4xl font-bold flex items-center gap-3">
                        <Users className="text-green-600" />
                        {stats.tenantCount}
                    </div>
                </div>
                <div className="bg-green-900/10 border border-green-900/50 p-6 rounded-lg uppercase">
                    <div className="text-xs text-green-700 mb-2">Revenue (24h)</div>
                    <div className="text-4xl font-bold flex items-center gap-3">
                        <DollarSign className="text-green-600" />
                        {stats.revenueToday}
                        <span className="text-lg">₺</span>
                    </div>
                </div>
                <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-lg uppercase text-red-500">
                    <div className="text-xs text-red-700 mb-2">Errors (24h)</div>
                    <div className="text-4xl font-bold flex items-center gap-3">
                        <ShieldAlert className="text-red-600" />
                        {stats.errorCount}
                    </div>
                </div>
                <div className="bg-blue-900/10 border border-blue-900/50 p-6 rounded-lg uppercase text-blue-500">
                    <div className="text-xs text-blue-700 mb-2">Status</div>
                    <div className="text-2xl font-bold flex items-center gap-3">
                        <Activity className="text-blue-600" />
                        {stats.status}
                    </div>
                </div>
            </div>

            {/* LOG TERMINAL */}
            <div className="bg-black border border-green-900 rounded-lg p-4 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
                <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 border-b border-gray-900 pb-2">
                    <Terminal size={14} /> SYSTEM_AUDIT_LOG_STREAM // LISTENING...
                </div>
                <div className="h-[400px] overflow-y-auto font-mono text-sm custom-scrollbar space-y-2 pr-2" ref={scrollRef}>
                    {logs.length === 0 && <div className="text-gray-600 italic">No signals detected...</div>}
                    {logs.map((log: any) => (
                        <div key={log.id} className="flex gap-4 hover:bg-green-900/10 p-1 rounded transition">
                            <span className="text-gray-600 text-xs shrink-0 w-32">{new Date(log.created_at).toLocaleTimeString('tr-TR')}</span>
                            <span className={`shrink-0 w-20 font-bold ${log.severity === 'ERROR' ? 'text-red-500' :
                                    log.severity === 'WARN' ? 'text-yellow-500' : 'text-blue-500'
                                }`}>[{log.severity}]</span>
                            <span className="shrink-0 w-24 text-gray-400">[{log.event_type}]</span>
                            <span className="text-white/80">{log.message}</span>
                            {log.tenant_id && <span className="text-xs text-gray-700 ml-auto">{log.tenant_id}</span>}
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}

// Custom css needed for .custom-scrollbar if not exists, but Tailwind defaults are mostly fine.
