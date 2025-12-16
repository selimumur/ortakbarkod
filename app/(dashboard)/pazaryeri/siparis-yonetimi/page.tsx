"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Package, Search, Printer, Filter, ShoppingBag, Truck, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import TrendyolExpressLabel from '@/app/components/TrendyolExpressLabel';
import { getOrdersAction } from '@/app/actions/orderActions';

// --- TYPES ---
type Order = {
    id: number;
    order_number: string;
    customer_name: string;
    status: string;
    total_price: number;
    platform: string;
    cargo_tracking_number?: string;
    delivery_address?: string;
    order_date: string;
};

export default function OrderManagementPage() {
    // State
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("Tümü");
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    // Print Logic
    const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        // @ts-ignore
        content: () => printRef.current,
        onAfterPrint: () => {
            toast.success("Etiket yazdırma kuyruğuna gönderildi.");
            setSelectedOrderForPrint(null);
        }
    });

    useEffect(() => {
        if (selectedOrderForPrint) {
            handlePrint();
        }
    }, [selectedOrderForPrint, handlePrint]);

    // Data Fetching
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getOrdersAction(page, pageSize, "Tümü", filterStatus, searchTerm);
            setOrders(result.orders || []);
            setTotalCount(result.totalCount || 0);
        } catch (e: any) {
            toast.error("Siparişler yüklenirken hata oluştu.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, filterStatus, searchTerm]);

    // Construct debounce for search
    useEffect(() => {
        const t = setTimeout(() => {
            fetchOrders();
        }, 300);
        return () => clearTimeout(t);
    }, [fetchOrders]);


    const getStatusBadge = (status: string) => {
        // Statuses are stored as localized strings based on sync scripts
        switch (status) {
            case 'Hazırlanıyor':
            case 'Processing':
                return <span className="flex items-center gap-1 text-orange-400 bg-orange-900/20 px-2 py-1 rounded text-xs font-bold"><Clock size={12} /> Hazırlanıyor</span>;
            case 'Kargoda':
            case 'Shipped':
                return <span className="flex items-center gap-1 text-purple-400 bg-purple-900/20 px-2 py-1 rounded text-xs font-bold"><Truck size={12} /> Kargoda</span>;
            case 'Teslim Edildi':
            case 'Completed':
                return <span className="flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold"><CheckCircle2 size={12} /> Teslim Edildi</span>;
            case 'İptal':
            case 'Cancelled':
            case 'İade':
                return <span className="flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs font-bold"><XCircle size={12} /> İptal/İade</span>;
            default: return <span className="text-gray-400 bg-gray-800 px-2 py-1 rounded text-xs">{status}</span>;
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">
            {/* Hidden Print Component */}
            <div className="hidden">
                <div ref={printRef}>
                    {selectedOrderForPrint && (
                        <TrendyolExpressLabel
                            orderNumber={selectedOrderForPrint.order_number}
                            customerName={selectedOrderForPrint.customer_name}
                            customerAddress={selectedOrderForPrint.delivery_address || "Adres bilgisi yok"}
                            trackingNumber={selectedOrderForPrint.cargo_tracking_number || "TAKIP-YOK"}
                        />
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Package className="text-blue-500" /> Sipariş Yönetimi
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Tüm pazaryeri siparişlerinizi tek ekrandan yönetin.</p>
                </div>
                <button onClick={() => fetchOrders()} className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-gray-400">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Filters */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Sipariş No, Müşteri Adı..."
                        className="w-full bg-[#0B1120] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    />
                </div>

                <div className="flex gap-2">
                    {["Tümü", "Hazırlanıyor", "Kargoda", "Teslim Edildi", "İptal"].map(status => (
                        <button
                            key={status}
                            onClick={() => { setFilterStatus(status); setPage(0); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Order List */}
            <div className="flex-1 bg-[#111827] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-[#1F2937] text-gray-400 text-xs uppercase font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Sipariş No</th>
                                <th className="p-4">Platform</th>
                                <th className="p-4">Müşteri</th>
                                <th className="p-4">Tutar</th>
                                <th className="p-4">Tarih</th>
                                <th className="p-4">Durum</th>
                                <th className="p-4 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                            {loading && orders.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Sipariş bulunamadı.</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-800/50 transition group">
                                        <td className="p-4 font-mono font-medium text-white">#{order.order_number}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.platform === 'Trendyol' ? 'bg-orange-900/20 text-orange-500' : 'bg-blue-900/20 text-blue-500'}`}>
                                                {order.platform || 'Pazaryeri'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium">{order.customer_name}</td>
                                        <td className="p-4 font-bold text-white">₺{order.total_price?.toLocaleString('tr-TR')}</td>
                                        <td className="p-4 text-xs text-gray-500">{new Date(order.order_date).toLocaleDateString('tr-TR')}</td>
                                        <td className="p-4">{getStatusBadge(order.status)}</td>
                                        <td className="p-4 text-right">
                                            {order.platform === 'Trendyol' && (
                                                <button
                                                    onClick={() => setSelectedOrderForPrint(order)}
                                                    className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-orange-900/20"
                                                >
                                                    <Printer size={14} /> Etiket
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="bg-[#1F2937] border-t border-gray-800 p-4 flex justify-between items-center text-xs text-gray-400">
                    <div>
                        Toplam {totalCount} sipariş (Sayfa {page + 1} / {totalPages || 1})
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="p-1 px-3 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1 px-3 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
