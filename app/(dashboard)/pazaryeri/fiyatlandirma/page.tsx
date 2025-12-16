"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Filter, ArrowUpRight,
    CheckCircle, XCircle, DollarSign, Package,
    Globe, Loader2, Link as LinkIcon, FileSpreadsheet, X
} from 'lucide-react';
import { toast } from 'sonner';

// Actions
import { getMarketplacesAction, getMarketplaceProductsAction } from '@/app/actions/marketplaceActions';
import { updateProductPriceAction } from '@/app/actions/pricingActions';
import { bulkUpdatePricesAction, manualLinkAction } from '@/app/actions/smartPricingActions';
// Note: Import action unimplemented yet? I'll disable that button or leave a placeholder.
// The user request said "sisteme uygun hale getir", focusing on data access.

export default function PricingPage() {
    // --- State ---
    const [products, setProducts] = useState<any[]>([]);
    const [marketplaces, setMarketplaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 30;
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [stockFilter, setStockFilter] = useState("all");
    const [visibleMarkets, setVisibleMarkets] = useState<number[]>([]);

    // Actions State
    const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);

    // --- Init ---
    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Get Marketplaces (Once)
            if (marketplaces.length === 0) {
                const markets = await getMarketplacesAction();
                if (markets) {
                    setMarketplaces(markets);
                    // Default visible: all
                    if (visibleMarkets.length === 0) {
                        // @ts-ignore
                        setVisibleMarkets(markets.map((m: any) => m.id));
                    }
                }
            }

            // 2. Get Products (Server Action)
            const { products: prods, totalCount: count } = await getMarketplaceProductsAction(page, PAGE_SIZE, search, stockFilter);

            // Transform for UI
            const rows = (prods || []).map((p: any) => ({
                ...p,
                integrations: (p.product_marketplaces || []).map((int: any) => ({
                    ...int,
                    marketplaces: marketplaces.find((m: any) => m.id === int.marketplace_id)
                }))
            }));

            setProducts(rows);
            setTotalCount(count);

        } catch (e: any) {
            console.error(e);
            toast.error("Veri yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [page, search, stockFilter, marketplaces.length, visibleMarkets.length]); // Dependencies carefully managed

    useEffect(() => {
        const t = setTimeout(() => {
            fetchInitialData();
        }, 300); // Debounce
        return () => clearTimeout(t);
    }, [fetchInitialData]);

    const handleSearch = () => {
        setPage(1);
        // fetch triggered by effect
    };


    async function handleUpdatePrice(product: any, marketId: number, newPrice: number) {
        if (!newPrice || newPrice <= 0) return toast.error("Geçersiz fiyat!");
        if (product.cost_price && newPrice < product.cost_price * 1.05) {
            if (!window.confirm("DİKKAT! Bu fiyat maliyetin altında. Devam?")) return;
        }

        const tId = toast.loading("Güncelleniyor...");
        try {
            // Find match ID
            const match = product.integrations.find((i: any) => i.marketplace_id === marketId);
            if (!match) throw new Error("Eşleşme bulunamadı");

            await updateProductPriceAction({ matchId: match.id, newPrice });

            toast.dismiss(tId);
            toast.success("Fiyat güncellendi");

            // Refresh
            fetchInitialData();

        } catch (e: any) {
            toast.dismiss(tId);
            toast.error(e.message);
        }
    }

    // --- Bulk Action State ---
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkConfig, setBulkConfig] = useState<{ sourceMarketId: string, targetMarketId: string, operation: 'copy' | 'inc_percent' | 'dec_percent', value: number }>({
        sourceMarketId: 'base_price',
        targetMarketId: '',
        operation: 'copy',
        value: 0
    });

    async function handleBulkProcess() {
        if (!bulkConfig.targetMarketId) return toast.error("Hedef pazaryeri seçiniz!");

        const tId = toast.loading("Toplu işlem başlatılıyor (Sunucu Arka Planı)...");
        try {
            const res = await bulkUpdatePricesAction({
                sourceMarketId: bulkConfig.sourceMarketId,
                targetMarketId: Number(bulkConfig.targetMarketId),
                operation: bulkConfig.operation,
                value: bulkConfig.value
            });

            if (res.success) {
                toast.success(`${res.count} ürün güncellendi!`, { id: tId });
                if (res.errors && res.errors.length > 0) toast.warning(`${res.errors.length} üründe hata oluştu.`);
                setIsBulkModalOpen(false);
                fetchInitialData();
            }

        } catch (e: any) {
            toast.error(e.message, { id: tId });
        }
    }

    // --- Manual Link State ---
    const [linkConfig, setLinkConfig] = useState<{ isOpen: boolean, product?: any, market?: any } | null>(null);
    const [remoteIdInput, setRemoteIdInput] = useState("");
    const [remotePriceInput, setRemotePriceInput] = useState("");

    async function handleManualLink() {
        if (!linkConfig?.product || !linkConfig?.market || !remoteIdInput) return;
        const tId = toast.loading("Eşleştiriliyor...");
        try {
            await manualLinkAction({
                productId: linkConfig.product.id,
                marketplaceId: linkConfig.market.id,
                remoteId: remoteIdInput,
                remoteInitialPrice: parseFloat(remotePriceInput) || 0
            });

            toast.success("Eşleşti", { id: tId });
            setLinkConfig(null);
            fetchInitialData();
        } catch (e: any) { toast.error(e.message, { id: tId }); }
    }

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 overflow-hidden relative">
            {/* HEAD */}
            <header className="px-6 py-4 border-b border-gray-800 bg-[#111827] flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-green-500" /> Fiyat ve Entegrasyon Yönetimi
                    </h1>
                    <p className="text-gray-500 text-sm">Pazaryerleri arası fiyat eşleme ve toplu yönetim paneli</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => toast.info("Excel modülü yapım aşamasında")} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg opacity-50"><FileSpreadsheet size={16} /> Excel Eşle</button>
                    {/* Fetch is essentially implicit via server actions now, button can trigger refresh or specific sync logic if implemented */}
                    <button onClick={() => fetchInitialData()} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-gray-700"><RefreshCw size={16} /> Yenile</button>
                    <button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg"><ArrowUpRight size={16} /> Toplu Güncelle</button>
                </div>
            </header>

            {/* FILTERS */}
            <div className="p-4 bg-[#1F2937] border-b border-gray-800 flex flex-wrap items-center gap-4 shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    <input type="text" placeholder="Ürün Ara..." className="w-full bg-[#111827] border border-gray-700 rounded-lg py-2 pl-10 text-white focus:border-blue-500 outline-none"
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="bg-[#111827] border border-gray-700 rounded-lg p-2 text-sm text-gray-300 outline-none"
                    value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                    <option value="all">Filtre: Tüm Stok</option>
                    <option value="critical">Kritik Stok (&lt;5)</option>
                    <option value="out">Tükenenler (0)</option>
                </select>
                <div className="relative group">
                    <button className="bg-[#111827] border border-gray-700 rounded-lg p-2 text-sm text-gray-300 flex items-center gap-2"><Filter size={14} /> Sütunlar</button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1F2937] border border-gray-700 rounded-lg shadow-xl p-2 hidden group-hover:block z-50">
                        {marketplaces.map((m: any) => (
                            <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer">
                                <input type="checkbox" checked={visibleMarkets.includes(m.id)} onChange={e => {
                                    if (e.target.checked) setVisibleMarkets([...visibleMarkets, m.id]);
                                    else setVisibleMarkets(visibleMarkets.filter(id => id !== m.id));
                                }} />
                                <span className="text-xs text-white">{m.store_name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="ml-auto flex gap-4 text-sm font-mono text-gray-400">
                    <span className="flex items-center gap-1"><Package size={14} className="text-blue-400" /> Kayıt: {totalCount}</span>
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111827] text-gray-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-md">
                        <tr>
                            <th className="p-4 w-[350px]">Ürün Bilgisi</th>
                            <th className="p-4 w-[100px]">Stok</th>
                            <th className="p-4 w-[100px]">Maliyet</th>
                            <th className="p-4 w-[100px] border-r border-gray-800">Yerel</th>
                            {marketplaces.filter((m: any) => visibleMarkets.includes(m.id)).map((m: any) => (
                                <th key={m.id} className="p-4 min-w-[200px] border-r border-gray-800 bg-[#1F2937]">
                                    <div className="flex items-center gap-2"><Globe size={14} /> {m.store_name}</div>
                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">{m.platform}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-800 bg-[#111827]">
                        {loading && products.length === 0 ? <tr><td colSpan={10} className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" /> Yükleniyor...</td></tr> :
                            products.map(product => (
                                <tr key={product.id} className="hover:bg-gray-800/50 group">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {product.image_url ? <img src={product.image_url} className="w-10 h-10 rounded object-cover bg-white" /> : <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center"><Package size={16} /></div>}
                                            <div>
                                                <div className="text-white font-medium max-w-[250px] truncate" title={product.name}>{product.name}</div>
                                                <div className="text-xs text-blue-400 font-mono">{product.code}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`p-3 font-bold ${product.stock < 5 ? 'text-red-500' : 'text-green-500'}`}>{product.stock}</td>
                                    <td className="p-3 text-orange-400 font-mono">₺{product.cost_price?.toFixed(2)}</td>
                                    <td className="p-3 font-bold text-white border-r border-gray-800">₺{product.price?.toFixed(2)}</td>

                                    {marketplaces.filter((m: any) => visibleMarkets.includes(m.id)).map((market: any) => {
                                        const integration = product.integrations.find((i: any) => i.marketplace_id === market.id);
                                        if (!integration) return (
                                            <td key={market.id} className="p-3 border-r border-gray-800 text-center opacity-30 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setLinkConfig({ isOpen: true, product, market })} className="text-xs text-blue-400 border border-dashed border-gray-600 rounded px-2 py-1 mx-auto hover:border-blue-500 flex gap-1"><LinkIcon size={12} /> Eşle</button>
                                            </td>
                                        );

                                        return (
                                            <td key={market.id} className="p-3 border-r border-gray-800 bg-gray-900/30">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500 text-xs">₺</span>
                                                        <input type="number" defaultValue={integration.current_sale_price} onBlur={e => {
                                                            const val = parseFloat(e.target.value);
                                                            if (val !== integration.current_sale_price) handleUpdatePrice(product, market.id, val);
                                                        }} className="w-20 bg-black/40 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:border-blue-500 outline-none font-bold" />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className={`${integration.status === 'active' ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                                                            {integration.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />} {integration.status || 'Pasif'}
                                                        </span>
                                                        <span className="text-gray-500">Stok: {integration.stock_quantity ?? '?'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="p-4 bg-[#1F2937] border-t border-gray-800 flex items-center justify-between shrink-0">
                <div className="text-sm text-gray-400">Toplam <span className="text-white font-bold">{totalCount}</span> ürün</div>
                <div className="flex bg-[#111827] rounded-lg border border-gray-700 overflow-hidden">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-gray-300 hover:bg-gray-800 disabled:opacity-50">&larr; Önceki</button>
                    <div className="px-4 py-2 text-gray-300 font-mono text-sm bg-gray-900 border-x border-gray-700">{page}</div>
                    <button onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= totalCount} className="px-4 py-2 text-gray-300 hover:bg-gray-800 disabled:opacity-50">Sonraki &rarr;</button>
                </div>
            </div>

            {/* BULK MODAL */}
            {isBulkModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button onClick={() => setIsBulkModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><XCircle /></button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><ArrowUpRight className="text-blue-500" /> Toplu Fiyat Güncelleme</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">KAYNAK</label>
                                <select className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white outline-none" value={bulkConfig.sourceMarketId} onChange={e => setBulkConfig({ ...bulkConfig, sourceMarketId: e.target.value })}>
                                    <option value="base_price">Sistem Fiyatı (Ana Fiyat)</option>
                                    {marketplaces.map((m: any) => <option key={m.id} value={m.id}>{m.store_name} ({m.platform})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">HEDEF</label>
                                <select className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white outline-none" value={bulkConfig.targetMarketId} onChange={e => setBulkConfig({ ...bulkConfig, targetMarketId: e.target.value })}>
                                    <option value="">Seçiniz...</option>
                                    {marketplaces.map((m: any) => <option key={m.id} value={m.id}>{m.store_name} ({m.platform})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">İŞLEM</label>
                                    {/* @ts-ignore */}
                                    <select className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white outline-none" value={bulkConfig.operation} onChange={e => setBulkConfig({ ...bulkConfig, operation: e.target.value })}>
                                        <option value="copy">Birebir Kopyala</option>
                                        <option value="inc_percent">Yüzde Artır (%)</option>
                                        <option value="dec_percent">Yüzde Azalt (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">DEĞER</label>
                                    <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white outline-none disabled:opacity-50" value={bulkConfig.value} onChange={e => setBulkConfig({ ...bulkConfig, value: Number(e.target.value) })} disabled={bulkConfig.operation === 'copy'} />
                                </div>
                            </div>
                            <button onClick={handleBulkProcess} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg mt-4">İşlemi Başlat</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANUAL LINK MODAL */}
            {linkConfig && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-lg w-full max-w-sm p-6 shadow-xl relative">
                        <button onClick={() => setLinkConfig(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><XCircle /></button>
                        <h3 className="text-lg font-bold text-white mb-4">Manuel Eşleştirme</h3>
                        <div className="space-y-3">
                            <div><label className="text-xs font-bold text-gray-500">REMOTE ID</label><input type="text" className="w-full bg-black/40 border border-gray-600 rounded p-2 text-white" value={remoteIdInput} onChange={e => setRemoteIdInput(e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500">FİYAT</label><input type="number" className="w-full bg-black/40 border border-gray-600 rounded p-2 text-white" value={remotePriceInput} onChange={e => setRemotePriceInput(e.target.value)} /></div>
                            <button onClick={handleManualLink} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
