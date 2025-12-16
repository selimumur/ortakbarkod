"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Filter, ArrowUpRight, ArrowDownRight,
    AlertTriangle, CheckCircle, XCircle, Package,
    Globe, Loader2, Link as LinkIcon, FileSpreadsheet,
    LayoutDashboard, CheckSquare, Square, AlertCircle, CheckCircle2, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "@clerk/nextjs";
import { getMarketplacesAction, getMarketplaceProductsAction } from "@/app/actions/marketplaceActions";

// --- Types ---
type Marketplace = {
    id: number;
    platform: string;
    store_name: string;
};

type ProductMarketplace = {
    id?: number;
    product_id: number;
    marketplace_id: number;
    current_sale_price?: number;
    remote_product_id?: string;
    barcode?: string;
    stock_quantity?: number;
    status: string; // Active, Passive
    marketplaces?: Marketplace;
    last_error_message?: string;
};

type ProductRow = {
    id: number;
    name: string;
    code: string;
    stock: number; // Local stock
    price: number; // Local base price
    cost_price: number;
    image_url?: string;
    integrations: ProductMarketplace[];
};

export default function UnifiedMarketplacePage() {
    const { userId } = useAuth(); // Just for basic client checking if needed

    // --- State ---
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 30;
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [stockFilter, setStockFilter] = useState("all"); // all, critical, out
    const [visibleMarkets, setVisibleMarkets] = useState<number[]>([]);

    // Stats
    const [stats, setStats] = useState({ total: 0, critical: 0, active: 0, passive: 0, error: 0 });

    // Selection
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    // --- Init ---
    useEffect(() => {
        fetchInitialData();
    }, [page]); // Re-fetch on page change

    async function fetchInitialData() {
        setLoading(true);
        try {
            // 1. Get Marketplaces (Once or check if empty)
            let markets = marketplaces;
            if (markets.length === 0) {
                const data = await getMarketplacesAction();
                if (data) {
                    setMarketplaces(data);
                    setVisibleMarkets(data.map(m => m.id));
                    markets = data;
                }
            }

            // 2. Get Products (Server Action)
            const result = await getMarketplaceProductsAction(page, PAGE_SIZE, search, stockFilter);

            const rows: ProductRow[] = (result.products || []).map((p: any) => ({
                ...p,
                integrations: (p.product_marketplaces || []).map((int: any) => ({
                    ...int,
                    marketplaces: markets.find(m => m.id === int.marketplace_id)
                }))
            }));

            setProducts(rows);
            setTotalCount(result.totalCount);

            // Calculate Stats (Client-side estimation based on current view/total logic)
            // For true global stats we might need another action, but let's approximate or reuse info
            const cryptoStats = {
                total: result.totalCount || 0,
                critical: rows.filter(r => r.stock < 5).length, // Only current page
                active: rows.reduce((acc, r) => acc + r.integrations.filter(i => i.status === 'Active').length, 0),
                passive: rows.reduce((acc, r) => acc + r.integrations.filter(i => i.status !== 'Active').length, 0),
                error: rows.reduce((acc, r) => acc + r.integrations.filter(i => i.last_error_message).length, 0)
            };
            setStats(prev => ({ ...prev, ...cryptoStats, total: result.totalCount }));

        } catch (e: any) {
            console.error(e);
            toast.error("Veri yüklenirken hata oluştu: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    // --- Actions ---

    // 1. Fetch Prices Logic
    const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
    const [selectedFetchMarkets, setSelectedFetchMarkets] = useState<number[]>([]);
    const [fetchProgress, setFetchProgress] = useState({ active: false, currentMarket: '', importedCount: 0, status: '' });

    async function handleFetchPrices() {
        if (!isFetchModalOpen) {
            setIsFetchModalOpen(true);
            return;
        }
        if (selectedFetchMarkets.length === 0) return toast.error("Lütfen en az bir pazaryeri seçiniz.");

        setFetchProgress({ active: true, currentMarket: 'Başlatılıyor...', importedCount: 0, status: 'Hazırlanıyor...' });
        let totalImportedGlobal = 0;

        try {
            for (const marketId of selectedFetchMarkets) {
                const marketName = marketplaces.find(m => m.id === marketId)?.store_name || "Bilinmeyen Mağaza";
                let page = 1;
                let hasMore = true;
                let marketImportCount = 0;

                while (hasMore) {
                    setFetchProgress({
                        active: true,
                        currentMarket: marketName,
                        importedCount: totalImportedGlobal,
                        status: `Sayfa ${page} işleniyor... (${marketImportCount} ürün)`
                    });

                    // API call uses Session Cookie automatically
                    const res = await fetch('/api/marketplace/pricing/fetch', {
                        method: 'POST',
                        body: JSON.stringify({ marketplaceId: marketId, page: page })
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        toast.error(`${marketName} hatası: ${errData.error || res.statusText}`);
                        break;
                    }

                    const data = await res.json();

                    if (data.updated) {
                        marketImportCount += data.updated;
                        totalImportedGlobal += data.updated;
                    }

                    if (!data.hasMore) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            }

            toast.success(`İşlem tamamlandı! Toplam ${totalImportedGlobal} ürün güncellendi.`);
            fetchInitialData();

        } catch (e: any) {
            toast.error("Hata: " + e.message);
        } finally {
            setFetchProgress({ active: false, currentMarket: '', importedCount: 0, status: '' });
            setIsFetchModalOpen(false);
        }
    }

    // 2. Update Price Logic
    async function handleUpdatePrice(product: ProductRow, marketId: number, newPrice: number) {
        if (!newPrice || newPrice <= 0) return toast.error("Geçersiz fiyat!");
        if (newPrice < product.cost_price * 1.05) {
            if (!window.confirm("Bu fiyat maliyetin altında. Devam edilsin mi?")) return;
        }

        const tId = toast.loading("Fiyat güncelleniyor...");
        try {
            const res = await fetch('/api/marketplace/pricing/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id, marketplaceId: marketId, newPrice })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            toast.dismiss(tId);
            toast.success("Fiyat güncellendi.");
            // Optimistic Update
            setProducts(prev => prev.map(p => {
                if (p.id !== product.id) return p;
                return {
                    ...p,
                    integrations: p.integrations.map(i => i.marketplace_id === marketId ? { ...i, current_sale_price: newPrice } : i)
                };
            }));
        } catch (e: any) {
            toast.dismiss(tId);
            toast.error("Hata: " + e.message);
        }
    }

    // 3. Bulk Logic
    const toggleSelectAll = () => {
        if (selectedProductIds.length === products.length) setSelectedProductIds([]);
        else setSelectedProductIds(products.map(p => p.id));
    };

    const toggleSelect = (id: number) => {
        if (selectedProductIds.includes(id)) setSelectedProductIds(prev => prev.filter(i => i !== id));
        else setSelectedProductIds(prev => [...prev, id]);
    };

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkConfig, setBulkConfig] = useState({
        sourceMarketId: 'base_price',
        targetMarketId: '',
        operation: 'copy',
        value: 0
    });
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, active: false });

    async function handleBulkProcess() {
        if (!bulkConfig.targetMarketId) return toast.error("Hedef pazaryeri seçiniz!");
        if (bulkConfig.sourceMarketId === bulkConfig.targetMarketId) return toast.error("Kaynak ve hedef aynı olamaz!");

        const targetMarketId = Number(bulkConfig.targetMarketId);
        const productsToProcess = selectedProductIds.length > 0
            ? products.filter(p => selectedProductIds.includes(p.id))
            : products;

        const targetProducts = productsToProcess.filter(p => p.integrations.some(i => i.marketplace_id === targetMarketId));

        if (targetProducts.length === 0) return toast.error("İşlenecek uygun ürün bulunamadı.");

        setBulkProgress({ current: 0, total: targetProducts.length, active: true });

        for (let i = 0; i < targetProducts.length; i++) {
            const product = targetProducts[i];
            const targetInt = product.integrations.find(int => int.marketplace_id === targetMarketId)!;

            let basePrice = 0;
            if (bulkConfig.sourceMarketId === 'base_price') {
                basePrice = product.price;
            } else {
                const sourceInt = product.integrations.find(int => int.marketplace_id === Number(bulkConfig.sourceMarketId));
                basePrice = sourceInt?.current_sale_price || 0;
            }

            if (basePrice > 0) {
                let newPrice = basePrice;
                if (bulkConfig.operation === 'inc_percent') newPrice *= (1 + (bulkConfig.value / 100));
                else if (bulkConfig.operation === 'dec_percent') newPrice *= (1 - (bulkConfig.value / 100));

                newPrice = Math.round(newPrice * 100) / 100;

                try {
                    await fetch('/api/marketplace/pricing/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            productId: product.id,
                            marketplaceId: targetMarketId,
                            newPrice
                        })
                    });
                    setProducts(prev => prev.map(p => {
                        if (p.id !== product.id) return p;
                        return {
                            ...p,
                            integrations: p.integrations.map(int => int.marketplace_id === targetMarketId ? { ...int, current_sale_price: newPrice } : int)
                        };
                    }));
                } catch (e) { }
            }
            setBulkProgress(prev => ({ ...prev, current: i + 1 }));
        }

        toast.success("Toplu işlem tamamlandı!");
        setBulkProgress({ current: 0, total: 0, active: false });
        setIsBulkModalOpen(false);
        setSelectedProductIds([]);
    }

    // 4. Manual Link Logic
    const [linkConfig, setLinkConfig] = useState<{ isOpen: boolean, product?: ProductRow, market?: Marketplace } | null>(null);
    const [remoteIdInput, setRemoteIdInput] = useState("");
    const [remotePriceInput, setRemotePriceInput] = useState("");

    async function handleManualLink() {
        if (!linkConfig?.product || !linkConfig?.market || !remoteIdInput) return;
        const tId = toast.loading("Eşleştiriliyor...");
        try {
            const res = await fetch('/api/marketplace/pricing/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: linkConfig.product.id,
                    marketplaceId: linkConfig.market.id,
                    remoteId: remoteIdInput,
                    remoteInitialPrice: parseFloat(remotePriceInput) || 0
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            toast.dismiss(tId);
            toast.success("Eşleştirme başarılı!");
            setLinkConfig(null);
            fetchInitialData();
        } catch (e: any) {
            toast.dismiss(tId);
            toast.error(e.message);
        }
    }

    // 5. Excel Import Logic
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [selectedImportMarkets, setSelectedImportMarkets] = useState<number[]>([]);

    async function handleImport() {
        if (!importFile) return toast.error("Dosya seçiniz!");
        if (selectedImportMarkets.length === 0) return toast.error("En az bir pazaryeri seçiniz!");

        const tId = toast.loading("Excel yükleniyor ve işleniyor...");
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('marketplaceIds', JSON.stringify(selectedImportMarkets));

            const res = await fetch('/api/marketplace/pricing/import', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            toast.dismiss(tId);
            toast.success(data.message);
            setIsImportModalOpen(false);
            fetchInitialData();
        } catch (e: any) {
            toast.dismiss(tId);
            toast.error("İçe aktarım hatası: " + e.message);
        }
    }

    // --- Render ---
    const filteredProducts = products.filter(p => {
        const s = search.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(s);
        const matchesCode = p.code?.toLowerCase().includes(s);
        const matchesRemote = p.integrations.some(i => i.remote_product_id?.toLowerCase().includes(s) || i.barcode?.toLowerCase().includes(s));

        if (search && !matchesName && !matchesCode && !matchesRemote) return false;
        // Server-side filtered stockFilter already, but filtering again just in case of pagination edge cases or Optimistic UI
        if (stockFilter === 'critical' && p.stock >= 5) return false;
        if (stockFilter === 'out' && p.stock > 0) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 overflow-hidden relative">

            {/* 1. TOP DASHBOARD STATS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 pb-2 shrink-0">
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-900/30 text-blue-400 rounded-lg"><Package size={20} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Toplam Ürün</p><p className="text-xl font-bold text-white">{stats.total}</p></div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-red-900/30 text-red-400 rounded-lg"><AlertTriangle size={20} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Kritik Stok</p><p className="text-xl font-bold text-white">{stats.critical}</p></div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-green-900/30 text-green-400 rounded-lg"><CheckCircle2 size={20} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Aktif Bağlantı</p><p className="text-xl font-bold text-white">{stats.active}</p></div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-yellow-900/30 text-yellow-400 rounded-lg"><AlertCircle size={20} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Pasif/Bekleyen</p><p className="text-xl font-bold text-white">{stats.passive}</p></div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-rose-900/30 text-rose-400 rounded-lg"><X size={20} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Hatalar</p><p className="text-xl font-bold text-white">{stats.error}</p></div>
                </div>
            </div>

            {/* 2. HEADER & TOOLBAR */}
            <div className="px-6 py-4 border-b border-gray-800 bg-[#111827] flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="text-purple-500" /> Pazaryeri Yönetim Merkezi
                    </h1>
                    <p className="text-gray-500 text-sm">Ürünleri eşleyin, fiyatları yönetin ve entegrasyonları tek ekranda takip edin.</p>
                </div>
                <div className="flex gap-3">
                    {/* Bulk Selection Action */}
                    {selectedProductIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-500/30 px-3 py-1.5 rounded-lg animate-in slide-in-from-left-2 mr-2">
                            <span className="text-xs font-bold text-purple-300">{selectedProductIds.length} ürün seçildi</span>
                            <button onClick={() => setIsBulkModalOpen(true)} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded">
                                Toplu Düzenle
                            </button>
                            <button onClick={() => setSelectedProductIds([])} className="ml-1 text-gray-400 hover:text-white"><X size={14} /></button>
                        </div>
                    )}

                    <button onClick={() => setIsImportModalOpen(true)} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-green-900/20">
                        <FileSpreadsheet size={16} /> Excel İşlemleri
                    </button>
                    <button onClick={handleFetchPrices} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-gray-700">
                        <RefreshCw size={16} /> Fiyat/Stok Çek
                    </button>
                    <button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/20">
                        <ArrowUpRight size={16} /> Toplu İşlem
                    </button>
                </div>
            </div>

            {/* 3. FILTERS */}
            <div className="p-4 bg-[#1F2937] border-b border-gray-800 flex flex-wrap items-center gap-4 shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    <input
                        type="text" placeholder="Ürün Ara (Ad, Barkod, ID)..."
                        className="w-full bg-[#111827] border border-gray-700 rounded-lg py-2 pl-10 text-white focus:border-blue-500 outline-none"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        onKeyDown={e => e.key === 'Enter' && fetchInitialData()}
                    />
                </div>

                <select className="bg-[#111827] border border-gray-700 rounded-lg p-2 text-sm text-gray-300 outline-none"
                    value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}>
                    <option value="all">Filtre: Tüm Stok</option>
                    <option value="critical">Kritik Stok (&lt;5)</option>
                    <option value="out">Tükenenler (0)</option>
                </select>

                <div className="relative group">
                    <button className="bg-[#111827] border border-gray-700 rounded-lg p-2 text-sm text-gray-300 flex items-center gap-2">
                        <Filter size={14} /> Görünüm
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1F2937] border border-gray-700 rounded-lg shadow-xl p-2 hidden group-hover:block z-50">
                        {marketplaces.map(m => (
                            <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={visibleMarkets.includes(m.id)}
                                    onChange={e => {
                                        if (e.target.checked) setVisibleMarkets([...visibleMarkets, m.id]);
                                        else setVisibleMarkets(visibleMarkets.filter(id => id !== m.id));
                                    }}
                                />
                                <span className="text-xs text-white">{m.store_name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. DATA GRID (Main) */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111827] text-gray-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-md">
                        <tr>
                            <th className="p-4 w-10 text-center">
                                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                                    {selectedProductIds.length === products.length && products.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                            </th>
                            <th className="p-4 w-[350px]">Ürün Bilgisi</th>
                            <th className="p-4 w-[120px]">Yerel Stok</th>
                            <th className="p-4 w-[120px]">Maliyet</th>
                            <th className="p-4 w-[120px] border-r border-gray-800">Yerel Fiyat</th>
                            {/* Dynamic Marketplace Columns */}
                            {marketplaces.filter(m => visibleMarkets.includes(m.id)).map(m => (
                                <th key={m.id} className="p-4 min-w-[200px] border-r border-gray-800 bg-[#1F2937]">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} /> {m.store_name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">{m.platform}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-800 bg-[#111827]">
                        {loading ? (
                            <tr><td colSpan={10} className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" /> Yükleniyor...</td></tr>
                        ) : filteredProducts.map(product => (
                            <tr key={product.id} className={`hover:bg-gray-800/50 group ${selectedProductIds.includes(product.id) ? 'bg-purple-900/10' : ''}`}>
                                <td className="p-3 text-center">
                                    <button onClick={() => toggleSelect(product.id)} className={`${selectedProductIds.includes(product.id) ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                        {selectedProductIds.includes(product.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                </td>

                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        {product.image_url ?
                                            <img src={product.image_url} className="w-10 h-10 rounded object-cover bg-white" /> :
                                            <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-gray-600"><Package size={16} /></div>
                                        }
                                        <div>
                                            <div className="text-white font-medium max-w-[200px] truncate" title={product.name}>{product.name}</div>
                                            <div className="text-xs text-blue-400 font-mono">{product.code}</div>
                                        </div>
                                    </div>
                                </td>

                                <td className="p-3">
                                    <span className={`font-bold ${product.stock < 5 ? 'text-red-500' : 'text-green-500'}`}>
                                        {product.stock} Adet
                                    </span>
                                </td>
                                <td className="p-3 text-orange-400 font-mono">₺{product.cost_price?.toFixed(2) || '0.00'}</td>
                                <td className="p-3 font-bold text-white border-r border-gray-800">₺{product.price?.toFixed(2) || '0.00'}</td>

                                {/* Marketplace Cells */}
                                {marketplaces.filter(m => visibleMarkets.includes(m.id)).map(market => {
                                    const integration = product.integrations.find(i => i.marketplace_id === market.id);

                                    if (!integration) return (
                                        <td key={market.id} className="p-3 border-r border-gray-800 text-center opacity-30 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setLinkConfig({ isOpen: true, product: product, market: market })}
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 border border-dashed border-gray-600 rounded px-2 py-1 mx-auto hover:border-blue-500"
                                            >
                                                <LinkIcon size={12} /> Eşle
                                            </button>
                                        </td>
                                    );

                                    return (
                                        <td key={market.id} className="p-3 border-r border-gray-800 bg-gray-900/30">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-500 text-xs">₺</span>
                                                    <input
                                                        type="number"
                                                        defaultValue={integration.current_sale_price}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (val !== integration.current_sale_price) {
                                                                handleUpdatePrice(product, market.id, val);
                                                            }
                                                        }}
                                                        className="w-20 bg-black/40 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:border-blue-500 outline-none font-bold"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center text-[10px]">
                                                    {integration.last_error_message ? (
                                                        <span className="text-red-400 flex items-center gap-1 cursor-help" title={integration.last_error_message}>
                                                            <AlertTriangle size={10} /> HATA
                                                        </span>
                                                    ) : (
                                                        <span className={`${integration.status === 'Active' ? 'text-green-500' : 'text-gray-500'} flex items-center gap-1`}>
                                                            {integration.status === 'Active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                            {integration.status || 'Pasif'}
                                                        </span>
                                                    )}
                                                    <span className="text-gray-500">Stok: {integration.stock_quantity ?? '?'}</span>
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 5. FOOTER */}
            <div className="p-4 bg-[#1F2937] border-t border-gray-800 flex items-center justify-between shrink-0">
                <div className="text-sm text-gray-400">
                    Toplam <span className="text-white font-bold">{totalCount}</span> ürün,
                    <span className="text-white font-bold"> {Math.ceil(totalCount / PAGE_SIZE)}</span> sayfa
                </div>
                <div className="flex bg-[#111827] rounded-lg border border-gray-700 overflow-hidden">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-gray-300 hover:bg-gray-800 border-r border-gray-700 disabled:opacity-50">&larr; Önceki</button>
                    <div className="px-4 py-2 text-gray-300 font-mono text-sm bg-gray-900 border-r border-gray-700">Sayfa {page}</div>
                    <button onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= totalCount} className="px-4 py-2 text-gray-300 hover:bg-gray-800 disabled:opacity-50">Sonraki &rarr;</button>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* ... Kept existing modal JSX structure with updated binding ... */}

            {/* BULK UPDATE */}
            {isBulkModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button onClick={() => setIsBulkModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><XCircle /></button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><ArrowUpRight className="text-blue-500" /> Toplu Fiyat Güncelleme</h2>

                        {bulkProgress.active ? (
                            <div className="py-10 text-center">
                                <div className="text-4xl font-bold text-blue-500 mb-2">{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</div>
                                <p className="text-gray-400">İşleniyor...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">HEDEF PAZARYERİ</label>
                                    <select className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white outline-none"
                                        value={bulkConfig.targetMarketId} onChange={e => setBulkConfig({ ...bulkConfig, targetMarketId: e.target.value })}>
                                        <option value="">Seçiniz...</option>
                                        {marketplaces.map(m => (<option key={m.id} value={m.id}>{m.store_name} ({m.platform})</option>))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">İŞLEM</label>
                                        <select className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white outline-none"
                                            value={bulkConfig.operation} onChange={e => setBulkConfig({ ...bulkConfig, operation: e.target.value })}>
                                            <option value="copy">Birebir Kopyala</option>
                                            <option value="inc_percent">Yüzde Artır</option>
                                            <option value="dec_percent">Yüzde Azalt</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">DEĞER (%)</label>
                                        <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white"
                                            value={bulkConfig.value} onChange={e => setBulkConfig({ ...bulkConfig, value: Number(e.target.value) })}
                                            disabled={bulkConfig.operation === 'copy'} />
                                    </div>
                                </div>
                                <button onClick={handleBulkProcess} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg mt-4">İşlemi Başlat</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FETCH MODAL */}
            {isFetchModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-lg w-full max-w-sm p-6 shadow-2xl relative">
                        {fetchProgress.active ? (
                            <div className="text-center py-8">
                                <Loader2 className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">{fetchProgress.currentMarket}</h3>
                                <p className="text-blue-400 font-mono text-sm mb-6">{fetchProgress.status}</p>
                                <div className="bg-gray-800 rounded p-4 border border-gray-700">
                                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Toplam Güncellenen</div>
                                    <div className="text-2xl font-bold text-green-500 flex items-center justify-center gap-2">
                                        <CheckCircle2 size={24} /> {fetchProgress.importedCount}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsFetchModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><XCircle /></button>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><RefreshCw className="text-blue-500" /> Fiyat/Stok Çek</h3>
                                <p className="text-sm text-gray-400 mb-4">Hangi pazaryerlerinden güncel verileri çekmek istiyorsunuz?</p>
                                <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar border border-gray-700 rounded p-2 bg-[#111827]">
                                    {marketplaces.map(m => (
                                        <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                                                checked={selectedFetchMarkets.includes(m.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedFetchMarkets([...selectedFetchMarkets, m.id]);
                                                    else setSelectedFetchMarkets(selectedFetchMarkets.filter(id => id !== m.id));
                                                }} />
                                            <span className="text-white text-sm font-medium">{m.store_name} <span className="text-xs text-gray-500">({m.platform})</span></span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setSelectedFetchMarkets(marketplaces.map(m => m.id))} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 rounded">Tümünü Seç</button>
                                    <button onClick={() => setSelectedFetchMarkets([])} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 rounded">Temizle</button>
                                </div>
                                <button onClick={handleFetchPrices} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded mt-4 shadow-lg">İşlemi Başlat ({selectedFetchMarkets.length})</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* IMPORT MODAL */}
            {isImportModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-lg w-full max-w-md p-6 shadow-2xl relative">
                        <button onClick={() => setIsImportModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><XCircle /></button>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileSpreadsheet className="text-green-500" /> Excel ile Toplu Eşleştir</h3>
                        <p className="text-sm text-gray-400 mb-4">Lütfen işlemi uygulamak istediğiniz pazaryerlerini seçin.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">PAZARYERİ SEÇİN (Çoklu)</label>
                                <div className="space-y-2 max-h-[200px] overflow-auto custom-scrollbar border border-gray-700 rounded p-2 bg-[#111827]">
                                    {marketplaces.map(m => (
                                        <label key={m.id} className="flex items-center gap-3 p-1.5 hover:bg-gray-800 rounded cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-600"
                                                checked={selectedImportMarkets.includes(m.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedImportMarkets([...selectedImportMarkets, m.id]);
                                                    else setSelectedImportMarkets(selectedImportMarkets.filter(id => id !== m.id));
                                                }} />
                                            <span className="text-white text-sm">{m.store_name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">EXCEL DOSYASI (.xlsx)</label>
                                <input type="file" accept=".xlsx, .xls" className="w-full bg-black/40 border border-gray-600 rounded p-2 text-white text-sm"
                                    onChange={e => setImportFile(e.target.files ? e.target.files[0] : null)} />
                            </div>
                            <button onClick={handleImport} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded mt-2 shadow-lg">Yükle ve Başlat ({selectedImportMarkets.length})</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANUAL LINK MODAL */}
            {linkConfig && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-lg w-full max-w-sm p-6 shadow-2xl relative">
                        <button onClick={() => setLinkConfig(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><XCircle /></button>
                        <h3 className="text-lg font-bold text-white mb-4">Manuel Eşleştirme</h3>
                        <p className="text-sm text-gray-400 mb-4"><span className="text-blue-400">{linkConfig.product?.name}</span> adlı ürünü <span className="text-yellow-400"> {linkConfig.market?.store_name}</span> ile eşleştiriyorsunuz.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">PAZARYERİ ÜRÜN ID (Remote ID)</label>
                                <input type="text" className="w-full bg-black/40 border border-gray-600 rounded p-2 text-white outline-none" placeholder="Örn: 1234567"
                                    value={remoteIdInput} onChange={e => setRemoteIdInput(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">BAŞLANGIÇ SATIŞ FİYATI</label>
                                <input type="number" className="w-full bg-black/40 border border-gray-600 rounded p-2 text-white outline-none" placeholder="0.00"
                                    value={remotePriceInput} onChange={e => setRemotePriceInput(e.target.value)} />
                            </div>
                            <button onClick={handleManualLink} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded mt-2">Eşleşmeyi Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}