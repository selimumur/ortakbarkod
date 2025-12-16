"use client";

import { useState, useEffect } from "react";
import {
    Plus, Search, ArrowUpRight, ArrowDownLeft,
    MoreHorizontal, Clock, CheckCircle, Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getInvoicesAction } from "@/app/actions/invoiceActions";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterType, setFilterType] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    // İstatistikler
    const [stats, setStats] = useState({
        totalSales: 0,
        totalPurchases: 0,
        pendingAmount: 0
    });

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        setLoading(true);
        try {
            const data = await getInvoicesAction();
            setInvoices(data || []);
            calculateStats(data || []);
        } catch (error: any) {
            console.error("Faturalar yüklenirken hata:", error);
            toast.error("Faturalar yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    function calculateStats(data: any[]) {
        let sales = 0;
        let purchases = 0;
        let pending = 0;

        data.forEach(inv => {
            const amount = Number(inv.total_amount) || 0;

            if (inv.invoice_type === 'SALES') {
                sales += amount;
            } else if (inv.invoice_type === 'PURCHASE') {
                purchases += amount;
            }

            if (inv.payment_status === 'UNPAID' || inv.payment_status === 'PARTIAL') {
                pending += amount;
            }
        });

        setStats({ totalSales: sales, totalPurchases: purchases, pendingAmount: pending });
    }

    // Filtreleme
    const filteredInvoices = invoices.filter(inv => {
        const matchStatus = filterStatus === "ALL" || inv.status === filterStatus;
        const matchType = filterType === "ALL" || inv.invoice_type === filterType;
        const matchSearch = searchTerm === "" ||
            inv.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.description?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchStatus && matchType && matchSearch;
    });

    return (
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-[#0f1115] text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Faturalar
                    </h1>
                    <p className="text-gray-400 mt-1">Alış, Satış ve İade faturaları yönetimi</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/muhasebe/fatura/yeni"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border border-blue-500/30 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} /> Yeni Fatura
                    </Link>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1a1d24] p-6 rounded-2xl border border-gray-800 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                            <ArrowUpRight className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Toplam Satış</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(stats.totalSales)}
                    </h3>
                </div>

                <div className="bg-[#1a1d24] p-6 rounded-2xl border border-gray-800 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-500/10 rounded-lg">
                            <ArrowDownLeft className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Toplam Alış</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(stats.totalPurchases)}
                    </h3>
                </div>

                <div className="bg-[#1a1d24] p-6 rounded-2xl border border-gray-800 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-lg">
                            <Clock className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Bekleyen Ödemeler</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(stats.pendingAmount)}
                    </h3>
                </div>
            </div>

            {/* Filtreler ve Arama */}
            <div className="flex flex-col md:flex-row gap-4 bg-[#1a1d24] p-4 rounded-xl border border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Fatura No veya Açıklama ara..."
                        className="w-full bg-[#111318] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="ALL">Tüm Tipler</option>
                    <option value="SALES">Satış Faturası</option>
                    <option value="PURCHASE">Alış Faturası</option>
                    <option value="RETURN_SALES">Satış İade</option>
                    <option value="PROFORMA">Proforma</option>
                </select>

                <select
                    className="bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="ALL">Tüm Durumlar</option>
                    <option value="DRAFT">Taslak</option>
                    <option value="SENT">Onaylı</option>
                    <option value="CANCELLED">İptal</option>
                </select>
            </div>

            {/* Tablo */}
            <div className="bg-[#1a1d24] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 text-sm">
                                <th className="p-4 font-medium">Tarih</th>
                                <th className="p-4 font-medium">Fatura No</th>
                                <th className="p-4 font-medium">Tip</th>
                                <th className="p-4 font-medium">Cari ID</th>
                                <th className="p-4 font-medium text-right">Tutar</th>
                                <th className="p-4 font-medium">Durum</th>
                                <th className="p-4 font-medium">Ödeme</th>
                                <th className="p-4 font-medium text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center">
                                            <Loader2 className="animate-spin mr-2" /> Yükleniyor...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-800/50 transition cursor-pointer group">
                                        <td className="p-4 text-gray-300">
                                            {new Date(inv.issue_date).toLocaleDateString("tr-TR")}
                                        </td>
                                        <td className="p-4 font-medium text-white">{inv.invoice_no}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inv.invoice_type === 'SALES' ? 'bg-emerald-500/10 text-emerald-400' :
                                                inv.invoice_type === 'PURCHASE' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {inv.invoice_type === 'SALES' ? 'Satış' :
                                                    inv.invoice_type === 'PURCHASE' ? 'Alış' : inv.invoice_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            #{inv.contact_id}
                                        </td>
                                        <td className="p-4 text-right font-bold text-white">
                                            {new Intl.NumberFormat("tr-TR", { style: "currency", currency: inv.currency || "TRY" }).format(inv.total_amount)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`flex items-center gap-1.5 text-sm ${inv.status === 'SENT' ? 'text-emerald-400' :
                                                inv.status === 'DRAFT' ? 'text-amber-400' : 'text-gray-400'
                                                }`}>
                                                {inv.status === 'SENT' && <CheckCircle size={14} />}
                                                {inv.status === 'DRAFT' && <Clock size={14} />}
                                                {inv.status === 'SENT' ? 'Onaylı' :
                                                    inv.status === 'DRAFT' ? 'Taslak' : 'İptal'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-xs border ${inv.payment_status === 'PAID' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                                                inv.payment_status === 'PARTIAL' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                                                    'border-gray-700 text-gray-500'
                                                }`}>
                                                {inv.payment_status === 'PAID' ? 'Ödendi' :
                                                    inv.payment_status === 'PARTIAL' ? 'Kısmi' : 'Bekliyor'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link href={`/muhasebe/fatura/${inv.id}`} className="p-2 hover:bg-gray-700 rounded-lg inline-block text-gray-400 hover:text-white transition">
                                                <MoreHorizontal size={18} />
                                            </Link>
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