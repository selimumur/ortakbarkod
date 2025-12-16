"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Search, Printer, RefreshCw, Filter, Calendar,
    CheckSquare, Square, AlertTriangle, Package, Barcode,
    ChevronLeft, ChevronRight, Hash, Loader2
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { getCargoOrdersAction, generateCargoLabelsAction } from '@/app/actions/cargoActions';

export default function CargoPage() {
    const { orgId } = useAuth();
    // --- STATE ---
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filtreler
    const [statusFilter, setStatusFilter] = useState("Yeni,Hazırlanıyor");
    const [dateRange, setDateRange] = useState("3"); // son 3 gün
    const [search, setSearch] = useState("");
    const [marketplace, setMarketplace] = useState("Tümü");
    const [printedStatus, setPrintedStatus] = useState("all");

    // Seçim
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Barkod Input
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [barcodeVal, setBarcodeVal] = useState("");

    // --- DATA FETCH ---
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            // Tarih hesapla
            const d = new Date();
            d.setDate(d.getDate() - Number(dateRange));
            const dateFrom = d.toISOString();

            const params = {
                status: statusFilter,
                date_from: dateFrom,
                marketplace: marketplace,
                search: search,
                printed: printedStatus
            };

            const res = await getCargoOrdersAction(params);
            setOrders(res.orders || []);

        } catch (e: any) {
            console.error(e);
            toast.error("Veri çekilemedi: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateRange, marketplace, search, printedStatus]);

    useEffect(() => {
        if (orgId) fetchOrders();
    }, [fetchOrders, orgId]);

    // --- BARKOD TARAMA ---
    const handleBarcodeScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeVal) return;

        // Frontend'de ara (Hızlı aksiyon) - veya API'ye sor
        // Şimdilik client-side filtreleme yapalım, listede varsa seçsin
        const found = orders.filter(o =>
            o.product_code?.toLowerCase() === barcodeVal.toLowerCase() ||
            o.master_products?.code?.toLowerCase() === barcodeVal.toLowerCase() ||
            o.order_number === barcodeVal
        );

        if (found.length > 0) {
            const ids = found.map(o => o.id);
            // Mevcut seçimlere ekle (uniq)
            setSelectedIds(prev => [...new Set([...prev, ...ids])]);
            toast.success(`${found.length} sipariş seçildi.`);
            setBarcodeVal(""); // Temizle
        } else {
            // Listede yoksa Backend'den ara? (MVP dışı şimdilik)
            toast.warning("Bu listede barkod bulunamadı.");
            setBarcodeVal("");
        }
    };

    // Auto-focus logic (Basit)
    useEffect(() => {
        const interval = setInterval(() => {
            // Modal açık değilse ve kullanıcı bir yere yazmıyorsa odakla
            if (document.activeElement?.tagName !== "INPUT" && !document.querySelector('.modal-open')) {
                barcodeInputRef.current?.focus();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);


    // --- YAZDIRMA ---
    const handlePrint = async (force = false) => {
        if (selectedIds.length === 0) return toast.warning("Seçim yapınız.");

        const loadingToast = toast.loading("Etiket hazırlanıyor...");
        try {
            const res = await generateCargoLabelsAction(selectedIds, force);

            if (!res.success) {
                if (res.warning === "ALREADY_PRINTED") {
                    if (confirm(`Bu siparişlerin ${res.printed_orders?.length} tanesi daha önce yazdırılmış.\nTekrar yazdırmak istiyor musunuz?`)) {
                        handlePrint(true); // Force call
                    }
                } else {
                    toast.error(res.error || "Bilinmeyen hata");
                }
                return;
            }

            if (res.html) {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                    printWindow.document.write(res.html);
                    printWindow.document.close();
                    printWindow.focus();
                } else {
                    toast.error("Pop-up engellendi, lütfen izin verin.");
                }

                toast.success("Yazdırma işlemi başlatıldı.");
                // Bir süre sonra listeyi yenile (Status update için)
                setTimeout(fetchOrders, 2000);
                setSelectedIds([]); // Seçimi temizle
            }

        } catch (e: any) {
            console.error(e);
            toast.error("Yazdırma hatası: " + e.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    // --- UI HELPERS ---
    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(x => x !== id));
        else setSelectedIds(prev => [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === orders.length) setSelectedIds([]);
        else setSelectedIds(orders.map(o => o.id));
    };

    return (
        <div className="p-6 max-h-screen overflow-y-auto bg-gray-900 text-gray-100 min-h-screen font-sans">

            {/* ÜST BAR: Barkod ve Özet */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="p-3 bg-blue-600 rounded-lg">
                        <Hash className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Kargo Terminali</h1>
                        <p className="text-xs text-gray-400">Hızlı İşlem Ekranı</p>
                    </div>
                </div>

                <form onSubmit={handleBarcodeScan} className="flex-1 max-w-xl w-full relative">
                    <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeVal}
                        onChange={(e) => setBarcodeVal(e.target.value)}
                        placeholder="Barkod Okutunuz..."
                        className="w-full bg-gray-900 border-2 border-blue-500/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-400 text-lg shadow-inner"
                    />
                    <div className="absolute right-3 top-3 text-gray-500 text-xs animate-pulse">AUTO-FOCUS</div>
                </form>

                <div className="flex gap-2">
                    <button onClick={() => fetchOrders()} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* FİLTRE BAR */}
            <div className="flex flex-wrap gap-4 mb-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 items-center">
                {/* 1. Statü */}
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200">
                        <option value="Yeni,Hazırlanıyor">Yeni & Hazırlanıyor</option>
                        <option value="Yeni">Sadece Yeni</option>
                        <option value="Hazırlanıyor">Sadece Hazırlanıyor</option>
                        <option value="Tümü">Tümü (Arşiv dahil)</option>
                    </select>
                </div>

                {/* 2. Tarih */}
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200">
                        <option value="1">Son 24 Saat</option>
                        <option value="3">Son 3 Gün</option>
                        <option value="7">Son 1 Hafta</option>
                        <option value="30">Son 1 Ay</option>
                    </select>
                </div>

                {/* 3. Pazaryeri (YENİ) */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase font-bold">Pazaryeri:</span>
                    <select value={marketplace} onChange={e => setMarketplace(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200">
                        <option value="Tümü">Tümü</option>
                        <option value="Trendyol">Trendyol</option>
                        <option value="Hepsiburada">Hepsiburada</option>
                        <option value="N11">N11</option>
                        <option value="Amazon">Amazon</option>
                        <option value="Woocommerce">WooCommerce</option>
                    </select>
                </div>

                {/* 4. Yazdırma Durumu (YENİ) */}
                <div className="flex items-center gap-2">
                    <Printer size={16} className="text-gray-400" />
                    <select value={printedStatus} onChange={e => setPrintedStatus(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200">
                        <option value="all">Yazdırma: Tümü</option>
                        <option value="false">Yazdırılmayanlar</option>
                        <option value="true">Yazdırılanlar</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="İsim, No Ara..."
                        className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-sm w-40 focus:w-60 transition-all text-white"
                    />
                    <button onClick={() => fetchOrders()} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm text-white">Ara</button>
                </div>
            </div>

            {/* TABLO & AKSİYONLAR */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-xl">
                {/* Toplu İşlem Barı */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-900/30 border-b border-blue-500/30 p-2 px-4 flex justify-between items-center text-blue-200 text-sm">
                        <span>{selectedIds.length} sipariş seçildi.</span>
                        <div className="flex gap-2">
                            <button onClick={() => handlePrint(false)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded font-bold shadow-lg transition transform active:scale-95">
                                <Printer size={16} /> SEÇİLİLERİ YAZDIR
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 w-10">
                                    <button onClick={toggleSelectAll}>
                                        {selectedIds.length === orders.length && orders.length > 0 ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="p-4">Sipariş No</th>
                                <th className="p-4">Ürün (Kod)</th>
                                <th className="p-4">Müşteri</th>
                                <th className="p-4 text-center">Desi/Koli</th>
                                <th className="p-4">Tarih</th>
                                <th className="p-4">Durum</th>
                                <th className="p-4">Yazdırma</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm">
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-500"><div className="flex justify-center"><Loader2 className="animate-spin" /> Yükleniyor...</div></td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Kriterlere uygun sipariş bulunamadı.</td></tr>
                            ) : (
                                orders.map(order => {
                                    const isSelected = selectedIds.includes(order.id);
                                    const rowClass = isSelected ? "bg-blue-900/20" : "hover:bg-gray-700/50";

                                    // Computed verileri
                                    const productCode = order.master_products?.code || order.product_code || "-";
                                    const productName = order.master_products?.name || order.product_name || "-";
                                    const isPrinted = order.raw_data?.is_printed;

                                    return (
                                        <tr key={order.id} className={`${rowClass} transition-colors cursor-pointer`} onClick={(e) => {
                                            // Checkbox'a tıklanmadıysa seçimi yap
                                            if (!(e.target as any).closest('button')) toggleSelect(order.id);
                                        }}>
                                            <td className="p-4">
                                                <button onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}>
                                                    {isSelected ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-gray-600" />}
                                                </button>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-blue-300">
                                                {order.order_number}
                                                <div className="text-[10px] text-gray-500 font-sans">{order.platform}</div>
                                            </td>
                                            <td className="p-4 max-w-xs">
                                                <div className="font-bold text-white truncate">{productName}</div>
                                                <span className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">{productCode}</span>
                                            </td>
                                            <td className="p-4 text-gray-300">
                                                {order.customer_name}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold">{order.computed?.parcels?.length || 1} Koli</span>
                                                    <span className="text-[10px] text-gray-500">{order.computed?.total_desi} Desi</span>
                                                    {order.computed?.is_missing_info && <span title="Eksik Desi Bilgisi"><AlertTriangle size={12} className="text-yellow-500 mt-1" /></span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-400 text-xs">
                                                {new Date(order.order_date).toLocaleDateString('tr-TR')}
                                                <div className="text-[10px]">{new Date(order.order_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${order.status.includes('Yeni') ? "border-blue-500 text-blue-400" : "border-gray-600 text-gray-400"
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {isPrinted ? (
                                                    <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-[10px] border border-green-800">Yazdırıldı</span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-600 italic">Bekliyor</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}