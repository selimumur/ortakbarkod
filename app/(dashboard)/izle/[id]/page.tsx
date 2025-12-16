"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';
import { Package, Clock, User, CheckCircle2, Box } from 'lucide-react';

export default function TrackingPage() {
    const params = useParams();
    const id = params.id as string;

    // Supabase client
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [order, setOrder] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchOrderDetails();
    }, [id]);

    async function fetchOrderDetails() {
        setLoading(true);
        // Fetch Order
        const { data: orderData } = await supabase
            .from('work_orders')
            .select('*, master_products(*), customers(*)')
            .eq('id', id)
            .single();

        if (orderData) {
            setOrder(orderData);

            // Fetch Logs
            const { data: logData } = await supabase
                .from('production_logs')
                .select('*')
                .eq('work_order_id', id)
                .order('created_at', { ascending: false });

            if (logData) setLogs(logData);
        }
        setLoading(false);
    }

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Yükleniyor...</div>;
    if (!order) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Sipariş bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-[#111827] p-6 text-center">
                        <h1 className="text-2xl font-bold text-white mb-1">{order.master_products?.name}</h1>
                        <p className="text-gray-400 font-mono tracking-wider">{order.master_products?.code}</p>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-center flex-1 border-r border-gray-100">
                                <span className="block text-gray-400 text-xs font-bold uppercase">Sipariş No</span>
                                <span className="text-lg font-bold text-gray-800">#{order.id}</span>
                            </div>
                            <div className="text-center flex-1">
                                <span className="block text-gray-400 text-xs font-bold uppercase">Durum</span>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Tamamlandı' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                                <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Box size={20} /></div>
                                <div>
                                    <span className="block text-gray-500 text-xs font-bold uppercase">Müşteri</span>
                                    <span className="font-bold text-gray-800">{order.customers?.name || "Bilinmiyor"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                                <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><CheckCircle2 size={20} /></div>
                                <div>
                                    <span className="block text-gray-500 text-xs font-bold uppercase">Üretim Adedi</span>
                                    <span className="font-bold text-gray-800">{order.completed_quantity} / {order.quantity}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline / Logs */}
                <div className="bg-white rounded-3xl shadow-xl p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Clock className="text-orange-500" /> Üretim Geçmişi
                    </h2>

                    <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pl-8 py-2">
                        {logs.map((log, i) => (
                            <div key={i} className="relative">
                                {/* Dot */}
                                <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-white border-4 border-green-500"></div>

                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">Paketleme İşlemi</h4>
                                        <p className="text-gray-500 text-xs mt-1">Paket Adedi: <strong className="text-gray-700">{log.box_count}</strong></p>
                                        <p className="text-gray-500 text-xs">{log.qr_data}</p>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded self-start">
                                        {new Date(log.created_at).toLocaleString('tr-TR')}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <User size={14} className="text-gray-400" />
                                    <span className="text-xs font-bold text-gray-600">{log.packing_staff || "Anonim"}</span>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-gray-400 text-sm italic">Henüz işlem kaydı yok.</div>}
                    </div>
                </div>

                <div className="text-center text-gray-400 text-xs mt-8">
                    &copy; 2025 Mobilya Fırsat Üretim Takip Sistemi
                </div>
            </div>
        </div>
    );
}
