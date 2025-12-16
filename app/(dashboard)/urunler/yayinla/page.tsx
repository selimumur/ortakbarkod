"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Globe, CheckCircle, AlertTriangle, XCircle,
    Upload, Filter, RefreshCw, ChevronLeft, ChevronRight, Search
} from 'lucide-react';

import { getProductsToPublishAction, publishProductsAction } from '@/app/actions/publishingActions';
import { getMarketplacesAction } from '@/app/actions/marketplaceActions';

export default function ProductPublishPage() {
    // --- STATE ---
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]); // Changed to number[] based on ID type

    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 30;

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Marketplaces
    const [marketplaces, setMarketplaces] = useState<any[]>([]);
    const [targetMarketplace, setTargetMarketplace] = useState("");
    const [targetAccountId, setTargetAccountId] = useState<string>("");

    // --- DATA FETCHING ---
    useEffect(() => {
        // Fetch Marketplaces
        const fetchMarketplaces = async () => {
            try {
                const data = await getMarketplacesAction();
                if (data && data.length > 0) {
                    setMarketplaces(data);
                    setTargetMarketplace(data[0].store_name || data[0].platform);
                    setTargetAccountId(data[0].id.toString());
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchMarketplaces();
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const { products: data, total: t } = await getProductsToPublishAction(page, limit, search, statusFilter);
            setProducts(data || []);
            setTotal(t || 0);
        } catch (e) {
            toast.error("Ürünler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        const t = setTimeout(fetchProducts, 300);
        return () => clearTimeout(t);
    }, [fetchProducts]);

    // --- LOGIC ---
    const totalPages = Math.ceil(total / limit);

    const validateProduct = (p: any): { valid: boolean; missing: string[] } => {
        const missing = [];
        if (!p.name) missing.push("Ürün Adı");
        if (!p.code) missing.push("Barkod/Kod");
        // Example logic: if price is missing
        if (!p.price) missing.push("Fiyat");
        return { valid: missing.length === 0, missing };
    };

    const handlePublish = async () => {
        if (selectedIds.length === 0) return toast.warning("Ürün seçin.");

        const productsToPublish = products.filter(p => selectedIds.includes(p.id));
        const invalid = productsToPublish.filter(p => !validateProduct(p).valid);

        if (invalid.length > 0) {
            toast.error(`${invalid.length} ürünün bilgileri eksik. Kontrol edin.`);
            return;
        }

        const toastId = toast.loading(`${selectedIds.length} ürün ${targetMarketplace}'e gönderiliyor...`);
        try {
            const result = await publishProductsAction({
                products: productsToPublish,
                marketplaceId: targetAccountId,
                marketplaceName: targetMarketplace
            });

            if (result.success) {
                toast.success(result.message || "Gönderim başarılı!");
                setSelectedIds([]);
                // Refresh to show status changes if any
                fetchProducts();
            } else {
                toast.error("Gönderim başarısız.");
            }
        } catch (e: any) {
            toast.error(e.message || "Gönderim hatası.");
        } finally {
            toast.dismiss(toastId);
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(x => x !== id));
        else setSelectedIds(prev => [...prev, id]);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedIds(products.map(p => p.id));
        else setSelectedIds([]);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
            {/* TOOLBAR */}
            <div className="bg-gray-800 border-b border-gray-700 p-4 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Upload className="text-blue-500" /> Ürün Yayınla
                        </h1>
                        <p className="text-gray-400 text-xs mt-1">Sisteminizdeki ürünleri seçtiğiniz pazaryerine toplu olarak aktarın.</p>
                    </div>

                    <div className="flex gap-3 items-center bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-lg">
                        <span className="text-sm text-gray-400 font-medium px-2">Hedef Mağaza:</span>
                        {marketplaces.length > 0 ? (
                            <select
                                value={targetAccountId}
                                onChange={e => {
                                    const id = e.target.value;
                                    setTargetAccountId(id);
                                    const mp = marketplaces.find(m => m.id.toString() === id.toString());
                                    if (mp) setTargetMarketplace(mp.store_name || mp.platform);
                                }}
                                className="bg-gray-800 border-gray-600 rounded text-white px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {marketplaces.map((mp: any) => (
                                    <option key={mp.id} value={mp.id}>
                                        {mp.store_name || mp.platform} ({mp.platform})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-xs text-red-500 font-bold px-2">Mağaza Yok</span>
                        )}
                        <button
                            onClick={handlePublish}
                            disabled={marketplaces.length === 0}
                            className={`px-4 py-2 rounded font-bold flex items-center gap-2 transition-all ${marketplaces.length === 0 ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-500 text-white shadow-green-900/50 shadow-md"
                                }`}
                        >
                            <Upload size={16} /> Yayınla
                        </button>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Ürün adı, kod veya varyant ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded pl-10 pr-4 py-2 text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-sm"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="ready">Yayıma Hazır</option>
                        <option value="missing">Eksik Bilgili</option>
                        <option value="published">Zaten Yayında</option>
                    </select>
                    <button onClick={() => fetchProducts()} className="p-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>

                    <div className="ml-auto text-xs text-gray-400 font-mono">
                        Toplam {total} ürün
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden min-h-full">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900/80 text-gray-400 text-xs uppercase sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="p-4 w-12 border-b border-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={products.length > 0 && selectedIds.length === products.length}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                        className="rounded border-gray-600 bg-gray-900 w-4 h-4 text-blue-600"
                                    />
                                </th>
                                <th className="p-4 border-b border-gray-700">Ürün Detayı</th>
                                <th className="p-4 border-b border-gray-700 w-40">Stok / Fiyat</th>
                                <th className="p-4 border-b border-gray-700 w-40">Durum</th>
                                <th className="p-4 border-b border-gray-700 w-48">Validation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm">
                            {loading && products.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                products.map(p => {
                                    const validation = validateProduct(p);
                                    const isSelected = selectedIds.includes(p.id);

                                    // Mock check if already published (you would check 'matches' array in real app)
                                    const isPublished = p.matches && p.matches.length > 0;

                                    return (
                                        <tr
                                            key={p.id}
                                            className={`transition-colors ${isSelected ? "bg-blue-900/20" : "hover:bg-gray-700/30"}`}
                                            onClick={() => toggleSelect(p.id)}
                                        >
                                            <td className="p-4 w-12 text-center" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(p.id)}
                                                    className="rounded border-gray-600 bg-gray-900 w-4 h-4 text-blue-600"
                                                />
                                            </td>
                                            <td className="p-4 cursor-pointer">
                                                <div className="font-bold text-gray-200">{p.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-300">{p.code}</span>
                                                    {p.barcode && <span className="text-xs text-gray-500 font-mono">#{p.barcode}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-300 font-mono text-xs">
                                                <div>{p.stock !== undefined ? `${p.stock} Adet` : '-'}</div>
                                                <div className="text-green-400 font-bold">{p.price ? `${p.price} TL` : '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                {isPublished ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs border border-green-900">
                                                        <Globe size={12} /> Yayında
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-gray-700 text-gray-400 px-2 py-1 rounded text-xs">
                                                        Taslak
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {validation.valid ? (
                                                    <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
                                                        <CheckCircle size={14} /> Sorun Yok
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium bg-red-900/20 px-2 py-1 rounded border border-red-900/30 w-fit">
                                                        <AlertTriangle size={14} /> {validation.missing.length} Eksik Bilgi
                                                    </div>
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

            {/* PAGINATION */}
            <div className="bg-gray-800 border-t border-gray-700 p-4 flex justify-between items-center shrink-0">
                <div className="text-sm text-gray-500">
                    Sayfa <span className="text-white font-bold">{page}</span> / {totalPages || 1}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
