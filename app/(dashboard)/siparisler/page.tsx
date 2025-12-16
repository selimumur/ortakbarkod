"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, Barcode, RefreshCw, Search, X, MapPin, Store, ChevronDown, Loader2, Flower2, ShoppingBag, Filter, ExternalLink, ChevronLeft, ChevronRight, Calendar, Download, CheckSquare, Square, FileText, Table, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { getOrdersAction, getAccountsAction, deleteOrderAction, getParcelsForExportAction } from '@/app/actions/orderActions';

// Platform Renk ve İkon Tanımları
const PLATFORM_CONFIG: any = {
    'Trendyol': { color: 'bg-orange-500', text: 'text-orange-500', icon: <Store size={12} /> },
    'Hepsiburada': { color: 'bg-orange-700', text: 'text-orange-700', icon: <Store size={12} /> },
    'N11': { color: 'bg-red-600', text: 'text-red-600', icon: <Store size={12} /> },
    'WooCommerce': { color: 'bg-purple-600', text: 'text-purple-600', icon: <Store size={12} /> },
    'Çiçeksepeti': { color: 'bg-blue-500', text: 'text-blue-500', icon: <Flower2 size={12} /> },
    'Shopify': { color: 'bg-green-500', text: 'text-green-500', icon: <ShoppingBag size={12} /> },
    'Manuel': { color: 'bg-gray-600', text: 'text-gray-400', icon: <FileText size={12} /> }
};

const ORDERS_PER_PAGE = 20;

export default function OrderManagement() {
    const { userId, orgId } = useAuth();

    // --- STATE YÖNETİMİ ---
    const [orders, setOrders] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // UI Kontrolleri
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);

    // Filtreler ve Sayfalama
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("Yeni");
    const [selectedStoreId, setSelectedStoreId] = useState("Tümü");
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

    // Raporlama State
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);

    const toggleSelectOrder = (id: string) => {
        setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.length === orders.length) setSelectedOrderIds([]);
        else setSelectedOrderIds(orders.map(o => o.id));
    };

    // --- DATA HAZIRLAMA (EXPORT & REPORT İÇİN) ---
    const prepareExportData = async () => {
        if (selectedOrderIds.length === 0) return [];
        const toastId = toast.loading("Sipariş verileri ve koli bilgileri hazırlanıyor...");

        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

        // 1. Seçili siparişlerdeki tüm benzersiz ürün kodlarını topla
        const productCodes = new Set<string>();
        selectedOrders.forEach(o => {
            const raw = o.raw_data || {};
            const lines = raw.lines || raw.items || raw.line_items || [];
            if (lines.length > 0) {
                lines.forEach((l: any) => {
                    const code = l.merchantSku || l.sku || l.barcode || o.product_code;
                    if (code) productCodes.add(code);
                });
            } else {
                if (o.product_code) productCodes.add(o.product_code);
            }
        });

        // 2. Bu kodlara ait koli tanımlarını Server Action ile çek
        let parcelMap: Record<string, any[]> = {};
        if (productCodes.size > 0) {
            try {
                parcelMap = await getParcelsForExportAction(Array.from(productCodes));
            } catch (e) {
                console.error("Parcel fetch error:", e);
            }
        }

        // 3. Satırları oluştur (Mantık aynı)
        const exportRows = selectedOrders.flatMap(o => {
            const raw = o.raw_data || {};
            let phone = "", city = "", district = "", address = "";

            // Teslimat Bilgileri
            if (o.platform === 'Trendyol') {
                phone = raw.shipmentAddress?.phone || "";
                city = raw.shipmentAddress?.city || "";
                district = raw.shipmentAddress?.district || "";
                address = raw.shipmentAddress?.fullAddress || "";
            } else if (o.platform === 'WooCommerce') {
                phone = raw.billing?.phone || raw.shipping?.phone || "";
                city = raw.shipping?.city || raw.billing?.city || "";
                district = raw.shipping?.state || "";
                address = raw.shipping?.address_1 ? `${raw.shipping.address_1} ${raw.shipping.address_2 || ''}` : "";
            }

            // Sipariş Satırlarını (Ürünleri) Bul
            const lines = raw.lines || raw.items || raw.line_items || [{
                productName: o.product_name,
                merchantSku: o.product_code,
                quantity: o.product_count,
                desi: 1
            }];

            return lines.flatMap((line: any) => {
                const code = line.merchantSku || line.sku || line.barcode || o.product_code;
                const parcels = parcelMap[code];
                const quantity = Number(line.quantity || 1);
                const unitPrice = Number(line.price || line.amount || (o.total_price / (o.product_count || 1)) || 0).toFixed(2);

                if (parcels && parcels.length > 0) {
                    const expandedRows: any[] = [];
                    for (let i = 0; i < quantity; i++) {
                        parcels.forEach((parcel: any, pIdx: number) => {
                            expandedRows.push({
                                "Barkod": o.cargo_tracking_number || o.order_number,
                                "Sipariş No": o.order_number,
                                "Platform": o.platform,
                                "Durum": o.status,
                                "Alıcı Adı": o.customer_name,
                                "Alıcı Telefon": phone,
                                "Alıcı İl": city,
                                "Alıcı İlçe": district,
                                "Alıcı Adres": address,
                                "Ürün Adı": `${line.productName || line.name || o.product_name} - Parça ${pIdx + 1}/${parcels.length}`,
                                "Ürün Kodu": code,
                                "Birim": "Adet",
                                "Miktar": 1,
                                "Desi": Number(parcel.desi || 0).toFixed(2),
                                "En (cm)": parcel.width,
                                "Boy (cm)": parcel.height,
                                "Derinlik (cm)": parcel.depth,
                                "Ağırlık (kg)": parcel.weight,
                                "Birim Fiyat": unitPrice
                            });
                        });
                    }
                    return expandedRows;
                } else {
                    const desi = line.desi || o.desi || 1;
                    return [{
                        "Barkod": o.cargo_tracking_number || o.order_number,
                        "Sipariş No": o.order_number,
                        "Platform": o.platform,
                        "Durum": o.status,
                        "Alıcı Adı": o.customer_name,
                        "Alıcı Telefon": phone,
                        "Alıcı İl": city,
                        "Alıcı İlçe": district,
                        "Alıcı Adres": address,
                        "Ürün Adı": line.productName || line.name || o.product_name,
                        "Ürün Kodu": code,
                        "Birim": "Adet",
                        "Miktar": quantity,
                        "Desi": Number(desi),
                        "En (cm)": "", "Boy (cm)": "", "Derinlik (cm)": "", "Ağırlık (kg)": "",
                        "Birim Fiyat": unitPrice
                    }];
                }
            });
        });

        toast.dismiss(toastId);
        return exportRows;
    };

    const handleExportExcel = async () => {
        const data = await prepareExportData();
        if (data.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sipariş Listesi");

        XLSX.writeFile(wb, `Siparis_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`${data.length} satır veri dışa aktarıldı.`);
    };

    const handleOpenReport = async () => {
        const data = await prepareExportData();
        if (data.length === 0) return;
        setReportData(data);
        setIsReportOpen(true);
    };

    const handleDeleteManualOrder = async (orderId: number) => {
        if (!confirm("Bu siparişi kalıcı olarak silmek istediğinize emin misiniz?")) return;

        try {
            await deleteOrderAction(orderId);
            toast.success("Sipariş silindi.");
            setOrders(prev => prev.filter(o => o.id !== orderId));
            setIsPanelOpen(false);
            setSelectedOrder(null);
        } catch (e: any) {
            toast.error("Silme hatası: " + e.message);
        }
    };

    const tabs = ["Tümü", "Yeni", "Hazırlanıyor", "Kargoda", "Teslim Edildi", "İptal/İade"];

    // --- VERİ ÇEKME ---

    // 1. Mağazaları Çek
    useEffect(() => {
        if (!orgId) return; // Strict Multi-Tenancy: Wait for Org
        async function fetchAccounts() {
            try {
                const data = await getAccountsAction();
                if (data) {
                    // Add virtual "Manual" store option
                    const allAccounts = [...data, {
                        id: 'MANUAL',
                        store_name: 'Manuel Siparişler',
                        platform: 'Manuel'
                    }];
                    setAccounts(allAccounts as any[]);
                }
            } catch (e) { console.error(e); }
        }
        fetchAccounts();
    }, [orgId]);

    // 2. Siparişleri Çek
    const fetchOrders = useCallback(async () => {
        setDataLoading(true);
        try {
            const { orders, totalCount } = await getOrdersAction(page, ORDERS_PER_PAGE, selectedStoreId, activeTab, searchTerm);
            setOrders(orders);
            setTotalCount(totalCount || 0);
        } catch (e: any) {
            console.error("Sipariş çekme hatası:", e);
            toast.error("Veriler alınamadı: " + e.message);
        } finally {
            setDataLoading(false);
        }
    }, [selectedStoreId, activeTab, searchTerm, page, orgId]);

    useEffect(() => {
        if (orgId) fetchOrders();
    }, [fetchOrders, orgId]);

    useEffect(() => {
        setPage(0);
    }, [selectedStoreId, activeTab, searchTerm]);


    // --- SENKRONİZASYON ---
    async function syncAllMarketplaces() {
        setLoading(true);
        setIsSyncMenuOpen(false);

        if (accounts.length === 0) {
            toast.error("Hiç mağaza bağlı değil.");
            setLoading(false);
            return;
        }

        const loadingToast = toast.loading(`${accounts.length} mağaza taranıyor...`);
        let totalNew = 0;

        for (const acc of accounts) {
            try {
                const res = await fetch(`/api/marketplace/sync`, {
                    method: 'POST',
                    body: JSON.stringify({ accountId: acc.id })
                }).then(r => r.json());

                if (res.success) {
                    totalNew += res.count || 0;
                }
            } catch (e) {
                console.error(`${acc.store_name} Hata: `, e);
            }
        }

        toast.dismiss(loadingToast);

        if (totalNew > 0) {
            toast.success(`${totalNew} adet sipariş güncellendi!`);
            fetchOrders();
        } else {
            toast.info("Yeni sipariş bulunamadı.");
        }
        setLoading(false);
    }

    async function syncSingleStore(acc: any) {
        setLoading(true);
        setIsSyncMenuOpen(false);
        const loadingToast = toast.loading(`${acc.store_name} taranıyor...`);

        try {
            const res = await fetch(`/api/marketplace/sync`, {
                method: 'POST',
                body: JSON.stringify({ accountId: acc.id })
            }).then(r => r.json());

            if (res.success) {
                toast.success(`${acc.store_name}: ${res.count} sipariş çekildi`);
                fetchOrders();
            } else {
                toast.warning(`${acc.store_name}: ${res.error} `);
            }
        } catch (e: any) {
            toast.error(`Hata: ${e.message} `);
        } finally {
            toast.dismiss(loadingToast);
            setLoading(false);
        }
    }

    // --- YARDIMCI FONKSİYONLAR ---
    const getStatusColor = (s: string) => {
        if (["Yeni", "Created"].includes(s)) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (["Hazırlanıyor", "Picking", "Invoiced", "Repackaged"].includes(s)) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        if (["Kargoda", "Shipped"].includes(s)) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        if (["Teslim Edildi", "Delivered"].includes(s)) return 'bg-green-500/20 text-green-400 border-green-500/30';
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    };

    const getPlatformBadge = (platformName: string, storeId?: string) => {
        const config = PLATFORM_CONFIG[platformName] || { color: 'bg-gray-700', text: 'text-gray-300', icon: <Store size={10} /> };
        const storeName = accounts.find(a => a.id === storeId)?.store_name;

        return (
            <div className="flex flex-col items-start">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit ${config.color} text-white`}>
                    {config.icon} {platformName}
                </span>
                {storeName && <span className="text-[9px] text-gray-400 mt-0.5 ml-1 truncate max-w-[100px]">{storeName}</span>}
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return dateString; }
    };

    const calculateRemainingTime = (order: any) => {
        // 1. Hedef Tarihi Bul - Kapsamlı Arama
        let deadlineStr =
            order.shipment_deadline ||
            order.raw_data?.shipment_deadline ||
            order.raw_data?.package_deadline ||
            order.raw_data?.shipmentPackageStatus?.plannedShipmentDate ||
            order.raw_data?.agreedDeliveryDate ||
            order.raw_data?.lines?.[0]?.agreedDeliveryDate ||
            order.raw_data?.estimatedDeliveryStartDate ||
            order.raw_data?.estimatedDeliveryEndDate;

        if (!deadlineStr) return {
            text: "Tarih Yok",
            color: "text-gray-500 italic"
        };

        const deadline = new Date(deadlineStr);
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();

        if (diffMs <= 0) return { text: "Süre Doldu", color: "text-red-500 font-bold" };

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let text = "";
        if (diffDays > 0) text += `${diffDays} gün `;
        if (diffHours > 0) text += `${diffHours} sa `;
        text += `${diffMinutes} dk`;

        // Renklendirme mantığı
        let color = "text-green-400";
        if (diffDays < 1) color = "text-red-500 font-bold animate-pulse";
        else if (diffDays < 3) color = "text-orange-400 font-bold";

        return { text, color };
    };

    return (
        <div className="w-full h-full bg-[#0B1120]">
            <main className="flex-1 overflow-y-auto h-full relative">
                <header className="px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/50 bg-[#0B1120]">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Sipariş Yönetimi</h2>
                        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 max-w-[800px] scrollbar-hide">
                            <button
                                onClick={() => setSelectedStoreId("Tümü")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex-shrink-0 border ${selectedStoreId === 'Tümü' ? 'bg-white text-black border-white' : 'bg-[#111827] text-gray-400 border-gray-700 hover:border-gray-500'}`}
                            >
                                Tüm Mağazalar
                            </button>
                            {accounts.map(acc => {
                                const config = PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG['Trendyol'];
                                const isActive = selectedStoreId === acc.id;
                                return (
                                    <button key={acc.id} onClick={() => setSelectedStoreId(acc.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex-shrink-0 flex items-center gap-2 border ${isActive ? `${config.color} text-white border-transparent` : 'bg-[#111827] text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                                        {config.icon} {acc.store_name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={selectedOrderIds.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition ${selectedOrderIds.length > 0 ? 'bg-green-600 hover:bg-green-500 text-white animate-in zoom-in' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                        >
                            <Download size={16} /> Excel ({selectedOrderIds.length})
                        </button>
                        <button
                            onClick={handleOpenReport}
                            disabled={selectedOrderIds.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition ${selectedOrderIds.length > 0 ? 'bg-purple-600 hover:bg-purple-500 text-white animate-in zoom-in' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                        >
                            <FileText size={16} /> Raporla
                        </button>

                        <div className="flex items-center shadow-lg rounded-lg overflow-hidden border border-blue-700">
                            <button onClick={syncAllMarketplaces} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                {loading ? "İşleniyor..." : "Tümünü Çek"}
                            </button>
                            <div className="w-[1px] h-full bg-blue-700"></div>
                            <button onClick={() => setIsSyncMenuOpen(!isSyncMenuOpen)} className="px-2 py-2 bg-blue-600 hover:bg-blue-500 text-white transition">
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {isSyncMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-[#111827] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                                <div className="p-2 space-y-1">
                                    <p className="text-gray-500 text-[10px] uppercase font-bold px-2 pt-1 mb-1 border-b border-gray-800 pb-1">Mağaza Bazlı Yenile</p>
                                    {accounts.length > 0 ? accounts.map(acc => {
                                        const config = PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG['Trendyol'];
                                        return (
                                            <button key={acc.id} onClick={() => syncSingleStore(acc)} className="w-full text-left px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg flex items-center gap-2 transition">
                                                <span className={`w-2 h-2 rounded-full ${config.text.replace('text', 'bg')}`}></span>
                                                <span className="font-medium truncate">{acc.store_name}</span>
                                            </button>
                                        );
                                    }) : (
                                        <div className="text-xs text-gray-500 px-3 py-2 text-center">Mağaza bulunamadı.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="p-8">
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 mb-6">
                        <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-800 pb-4">
                            {tabs.map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-[#0f1623] border border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <div className="relative w-full max-w-lg">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Sipariş No veya Müşteri Adı (Min 3 karakter)..."
                                    className="w-full bg-[#0f1623] border border-gray-700 rounded-lg pl-9 py-2.5 text-sm focus:border-blue-500 outline-none text-white transition focus:bg-[#0f1623]"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
                                <span>Toplam {totalCount} Kayıt</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden shadow-xl min-h-[400px]">
                        {dataLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 size={32} className="animate-spin text-blue-500" />
                                <span className="text-sm text-gray-500">Siparişler yükleniyor...</span>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className=" bg-[#0f1623] text-gray-300 uppercase text-[10px] font-bold tracking-wider border-b border-gray-800">
                                            <tr>
                                                <th className="px-4 py-4 w-10 text-center">
                                                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                                                        {orders.length > 0 && selectedOrderIds.length === orders.length ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                </th>
                                                <th className="px-6 py-4">Sipariş No</th>
                                                <th className="px-6 py-4">Pazaryeri</th>
                                                <th className="px-6 py-4">Ürün (Özet)</th>
                                                <th className="px-6 py-4">Müşteri</th>
                                                <th className="px-6 py-4 text-center">Adet</th>
                                                <th className="px-6 py-4">Tutar</th>
                                                <th className="px-6 py-4">Durum</th>
                                                <th className="px-6 py-4 text-right">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/50">
                                            {orders.map((order: any) => (
                                                <tr key={order.id} className={`transition duration-150 group ${selectedOrderIds.includes(order.id) ? 'bg-blue-900/10 hover:bg-blue-900/20' : 'hover:bg-[#1F2937]/40'}`}>
                                                    <td className="px-4 py-4 text-center">
                                                        <button onClick={() => toggleSelectOrder(order.id)} className={`${selectedOrderIds.includes(order.id) ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                                            {selectedOrderIds.includes(order.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-mono text-white">#{order.order_number || order.id}</span>
                                                            <span className="text-[10px] text-gray-600 mt-0.5">{formatDate(order.order_date)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">{getPlatformBadge(order.platform || "Trendyol", order.store_id)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="max-w-[200px]">
                                                            <div className="text-white text-xs font-medium truncate" title={order.first_product_name}>{order.first_product_name || order.product_name}</div>
                                                            <div className="text-[10px] text-blue-400 font-mono mt-1 bg-blue-900/20 px-1 rounded w-fit">{order.first_product_code || order.product_code || "-"}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-300">{order.customer_name}</td>
                                                    <td className="px-6 py-4 text-center"><span className="bg-gray-800 px-2 py-1 rounded text-white font-bold text-xs">{order.product_count || order.total_quantity || 1}</span></td>
                                                    <td className="px-6 py-4 text-white font-medium">₺{(order.total_price || order.price || 0).toLocaleString('tr-TR')}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border w-fit ${getStatusColor(order.status)}`}>{order.status}</span>
                                                            {(() => {
                                                                const remaining = calculateRemainingTime(order);
                                                                if (remaining) {
                                                                    return (
                                                                        <span className={`text-[10px] flex items-center gap-1 ${remaining.color}`}>
                                                                            <Clock size={10} /> {remaining.text}
                                                                        </span>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => { setSelectedOrder(order); setIsPanelOpen(true); }} className="text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-xs font-bold transition shadow-lg shadow-blue-900/20">DETAY</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {orders.length === 0 && (
                                        <div className="text-center py-24 text-gray-500 flex flex-col items-center gap-4">
                                            <div className="p-4 bg-gray-800/50 rounded-full">
                                                <Filter size={32} className="opacity-40" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-gray-400">Görüntülenecek sipariş bulunamadı.</p>
                                                <p className="text-xs">Filtreleri değiştirmeyi veya "Tümünü Çek" butonunu kullanmayı deneyin.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {totalCount > 0 && (
                                    <div className="border-t border-gray-800 px-6 py-4 flex items-center justify-between bg-[#0f1623]">
                                        <span className="text-xs text-gray-500">
                                            {page * ORDERS_PER_PAGE + 1} - {Math.min((page + 1) * ORDERS_PER_PAGE, totalCount)} / {totalCount} Sipariş
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={page === 0}
                                                onClick={() => setPage(p => p - 1)}
                                                className="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                disabled={(page + 1) * ORDERS_PER_PAGE >= totalCount}
                                                onClick={() => setPage(p => p + 1)}
                                                className="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {isPanelOpen && selectedOrder && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsPanelOpen(false)}></div>
                    <div className="relative w-full max-w-2xl bg-[#111827] border-l border-gray-700 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 bg-[#111827]/95 backdrop-blur border-b border-gray-700 p-6 flex justify-between items-center z-10">
                            <div>
                                <h2 className="text-xl font-bold text-white">Sipariş Detayı</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-500 font-mono">#{selectedOrder.order_number || selectedOrder.id}</span>
                                    {getPlatformBadge(selectedOrder.platform || "Trendyol", selectedOrder.store_id)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedOrder.is_manual && (
                                    <>
                                        <Link
                                            href={`/siparisler/manuel-giris?id=${selectedOrder.id}`}
                                            className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition"
                                            title="Düzenle"
                                        >
                                            <FileText size={20} />
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteManualOrder(selectedOrder.id)}
                                            className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg transition"
                                            title="Sil"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setIsPanelOpen(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white transition"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col justify-between">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Sipariş Durumu</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`w - 3 h - 3 rounded - full ${selectedOrder.status === 'İptal' ? 'bg-red-500' : 'bg-green-500'} `}></span>
                                        <p className="text-lg font-bold text-white">{selectedOrder.status}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">{formatDate(selectedOrder.order_date)}</p>
                                </div>
                                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 text-right flex flex-col justify-between">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Toplam Tutar</p>
                                    <p className="text-3xl font-bold text-green-400">₺{(selectedOrder.total_price || selectedOrder.price || 0).toLocaleString('tr-TR')}</p>
                                    <p className="text-[10px] text-gray-500">KDV Dahil</p>
                                </div>
                            </div>

                            <div className="bg-[#1F2937] p-5 rounded-xl border border-gray-700">
                                <h3 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-400" /> Teslimat & Kargo</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-500">Alıcı Adı:</span>
                                        <span className="text-white font-medium">{selectedOrder.customer_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-500">Kargo Firması:</span>
                                        <span className="text-white">{selectedOrder.cargo_provider_name || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                        <span className="text-gray-500">Takip Numarası:</span>
                                        {selectedOrder.cargo_tracking_number ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-orange-400 font-mono bg-orange-400/10 px-2 py-0.5 rounded">{selectedOrder.cargo_tracking_number}</span>
                                                {selectedOrder.cargo_tracking_link && (
                                                    <a href={selectedOrder.cargo_tracking_link} target="_blank" className="text-blue-500 hover:text-white"><ExternalLink size={14} /></a>
                                                )}
                                            </div>
                                        ) : <span className="text-gray-500 italic">Bekleniyor</span>}
                                    </div>
                                    <div className="pt-1">
                                        <span className="text-gray-500 block text-xs mb-1">Teslimat Adresi:</span>
                                        <p className="text-gray-300 text-xs bg-gray-900/50 p-3 rounded border border-gray-700 leading-relaxed">
                                            {selectedOrder.raw_data?.shipmentAddress?.fullAddress || selectedOrder.delivery_address || "Adres bilgisi alınamadı"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1F2937] p-5 rounded-xl border border-gray-700">
                                <h3 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2"><ShoppingCart size={16} className="text-purple-400" /> Sipariş İçeriği</h3>
                                <div className="space-y-3">
                                    {(selectedOrder.raw_data?.lines || selectedOrder.raw_data?.items || selectedOrder.raw_data?.line_items || []).map((line: any, i: number) => (
                                        <div key={i} className="flex gap-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition">
                                            <div className="w-12 h-12 bg-white rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                                {line.productImage || line.imageUrl || line.image?.src ? (
                                                    <img src={line.productImage || line.imageUrl || line.image?.src} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100"><Package className="text-gray-400" size={20} /></div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate" title={line.productName || line.name}>{line.productName || line.name}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-blue-300 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">
                                                            {line.merchantSku || line.sku || line.barcode}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">Varyant: {line.variantName || "-"}</span>
                                                    </div>
                                                    <span className="text-white font-bold text-xs bg-gray-700 px-2 py-1 rounded">x{line.quantity}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <a
                                href={`/etiket?id=${selectedOrder.id}&platform=${selectedOrder.platform}&kod=${selectedOrder.cargo_tracking_number || ""}`}
                                target="_blank"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20 mt-4"
                            >
                                <Barcode size={24} /> KARGO BARKODU YAZDIR
                            </a>

                            <div className="text-center">
                                <p className="text-[10px] text-gray-600">Sipariş ID: {selectedOrder.id} • Paket ID: {selectedOrder.packet_id || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rapor Modal */}
            {isReportOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsReportOpen(false)}></div>
                    <div className="relative w-full max-w-6xl max-h-[90vh] bg-[#111827] border border-gray-700 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-[#1f2937]/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Table className="text-purple-400" /> Sipariş Raporu Önizleme
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">Seçili {selectedOrderIds.length} sipariş için {reportData.length} kalem ürün listeleniyor.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition">
                                    <Download size={16} /> Excel Olarak İndir
                                </button>
                                <button onClick={() => setIsReportOpen(false)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            <table className="w-full text-left text-xs text-gray-400 border-collapse">
                                <thead className="bg-[#1f2937] text-gray-200 sticky top-0 z-10 font-bold uppercase tracking-wider">
                                    <tr>
                                        {reportData.length > 0 && Object.keys(reportData[0]).map((key) => (
                                            <th key={key} className="px-4 py-3 border-b border-gray-700 whitespace-nowrap">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {reportData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-800/50 transition">
                                            {Object.values(row).map((val: any, i) => (
                                                <td key={i} className="px-4 py-3 border-b border-gray-800/50 whitespace-nowrap max-w-[300px] truncate" title={val}>
                                                    {val}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}