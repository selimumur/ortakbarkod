"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Search, Link as LinkIcon, Unlink, RefreshCw,
    ArrowRightLeft, ExternalLink, ShoppingBag
} from 'lucide-react';

import {
    getMatchingProductsAction,
    searchRemoteProductsAction,
    matchProductAction,
    unmatchProductAction
} from '@/app/actions/matchingActions';
import { getMarketplacesAction } from '@/app/actions/marketplaceActions';
import {
    parseExcelFileAction,
    bulkMatchProductsAction
} from '@/app/actions/excelMatchingActions';

export default function ProductMatchingPage() {
    // --- STATE ---
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [matchFilter, setMatchFilter] = useState("all"); // all, matched, unmatched

    // Marketplaces
    const [marketplaces, setMarketplaces] = useState<any[]>([]);
    const [selectedMarketplace, setSelectedMarketplace] = useState("");

    // Marketplace Search
    const [mpSearch, setMpSearch] = useState("");
    const [mpResults, setMpResults] = useState<any[]>([]);
    const [mpLoading, setMpLoading] = useState(false);

    // Excel Upload
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelMarketplace, setExcelMarketplace] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [matchResults, setMatchResults] = useState<any>(null);

    // --- DATA FETCHING ---
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMatchingProductsAction(search, matchFilter);
            setProducts(data || []);
        } catch (e) {
            toast.error("Ürünler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, [search, matchFilter]);

    // Fetch Marketplaces
    useEffect(() => {
        const fetchMarketplaces = async () => {
            try {
                const data = await getMarketplacesAction();
                if (data && data.length > 0) {
                    const mps = data.map((m: any) => ({
                        name: m.store_name || m.platform,
                        platform: m.platform,
                        id: m.id
                    }));
                    setMarketplaces(mps);
                    if (mps.length > 0) setSelectedMarketplace(mps[0].name);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchMarketplaces();
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchProducts, 500);
        return () => clearTimeout(t);
    }, [fetchProducts]);

    // --- MARKETPLACE ACTIONS ---
    const searchMarketplace = async () => {
        if (!mpSearch) return;
        setMpLoading(true);
        try {
            const results = await searchRemoteProductsAction(selectedMarketplace, mpSearch);
            setMpResults(results);
            if (results.length === 0) toast.info("Sonuç bulunamadı.");
        } catch (e: any) {
            toast.error(e.message || "Pazaryeri araması başarısız.");
        } finally {
            setMpLoading(false);
        }
    };

    const handleMatch = async (remoteProduct: any) => {
        if (!selectedProduct) return toast.warning("Önce soldan bir ürün seçin.");

        try {
            const result = await matchProductAction({
                master_product_id: selectedProduct.id,
                marketplace: selectedMarketplace,
                remote_product_id: remoteProduct.id,
                remote_variant_id: remoteProduct.variantId,
                remote_data: remoteProduct
            });

            if (result.success) {
                toast.success("Eşleşme sağlandı!");
                fetchProducts(); // Listeyi güncelle
                setSelectedProduct(null); // Reset selection
                setMpResults([]); // Clear results
            }
        } catch (e: any) {
            toast.error("Eşleştirme hatası: " + e.message);
        }
    };

    const handleUnmatch = async (matchId: number) => {
        if (!confirm("Eşleşmeyi kaldırmak istediğinize emin misiniz?")) return;
        try {
            const result = await unmatchProductAction(matchId);
            if (result.success) {
                toast.success("Eşleşme kaldırıldı.");
                fetchProducts();
            }
        } catch (e: any) {
            toast.error("İşlem hatası: " + e.message);
        }
    };

    // --- EXCEL UPLOAD HANDLERS ---
    const handleExcelUpload = async () => {
        if (!excelFile || !excelMarketplace) {
            toast.error("Lütfen dosya ve pazaryeri seçin.");
            return;
        }

        setUploadProgress(10);
        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await excelFile.arrayBuffer();
            setUploadProgress(30);

            // Parse Excel
            toast.info("Excel dosyası okunuyor...");
            const parsedProducts = await parseExcelFileAction(arrayBuffer, excelMarketplace);
            setUploadProgress(50);

            if (parsedProducts.length === 0) {
                toast.error("Excel dosyasında ürün bulunamadı.");
                return;
            }

            toast.info(`${parsedProducts.length} ürün bulundu, eşleştiriliyor...`);
            setUploadProgress(70);

            // Bulk match
            const result = await bulkMatchProductsAction(parsedProducts, excelMarketplace);
            setUploadProgress(100);

            setMatchResults(result);

            // Show results
            if (result.matched > 0) {
                toast.success(`${result.matched} ürün başarıyla eşleştirildi!`);
            }
            if (result.skipped > 0) {
                toast.info(`${result.skipped} ürün zaten eşleşmiş (atlandı).`);
            }
            if (result.notFound > 0) {
                toast.warning(`${result.notFound} ürün sistemde bulunamadı.`);
            }
            if (result.errors.length > 0) {
                console.error('Match errors:', result.errors);
            }

            // Refresh products list
            fetchProducts();

        } catch (e: any) {
            toast.error("Hata: " + e.message);
            console.error(e);
        } finally {
            setUploadProgress(0);
        }
    };

    const resetExcelModal = () => {
        setShowExcelModal(false);
        setExcelFile(null);
        setExcelMarketplace("");
        setUploadProgress(0);
        setMatchResults(null);
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">

            {/* SOL PANEL: Sistem Ürünleri */}
            <div className="w-1/2 flex flex-col border-r border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-600 rounded">
                        <ArrowRightLeft size={20} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold">Ürün Eşleştirme</h1>
                </div>

                {/* Filtreler */}
                <div className="space-y-3 mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <input
                        type="text"
                        placeholder="Ürün adı, kod veya barkod ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                    />
                    <div className="flex gap-2">
                        <select
                            value={matchFilter}
                            onChange={e => setMatchFilter(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm flex-1"
                        >
                            <option value="all">Tüm Ürünler</option>
                            <option value="unmatched">Eşleşmemiş</option>
                            <option value="matched">Eşleşmiş</option>
                        </select>
                        <button
                            onClick={() => setShowExcelModal(true)}
                            className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded text-white font-medium text-sm flex items-center gap-2"
                            title="Excel ile Toplu Eşleştir"
                        >
                            📊 Excel
                        </button>
                        <button onClick={fetchProducts} className="bg-gray-700 hover:bg-gray-600 p-2 rounded">
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Ürün Listesi */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {products.map(p => {
                        const isSelected = selectedProduct?.id === p.id;
                        const matchCount = p.matches?.length || 0;

                        return (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProduct(p)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                    ? "bg-blue-900/30 border-blue-500 ring-1 ring-blue-500"
                                    : "bg-gray-800 border-gray-700 hover:border-gray-500"
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-sm text-gray-200">{p.name}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-1">{p.code}</div>
                                    </div>
                                    {matchCount > 0 ? (
                                        <span className="bg-green-900/50 text-green-400 text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                                            <LinkIcon size={10} /> {matchCount} Eşleşme
                                        </span>
                                    ) : (
                                        <span className="bg-gray-700 text-gray-400 text-[10px] px-2 py-1 rounded-full">Eşleşme Yok</span>
                                    )}
                                </div>

                                {/* Mevcut Eşleşmeler */}
                                {isSelected && p.matches && p.matches.length > 0 && (
                                    <div className="mt-3 bg-black/20 p-2 rounded text-xs space-y-1">
                                        <div className="text-gray-400 font-bold mb-1">Mevcut Bağlantılar:</div>
                                        {p.matches.map((m: any) => (
                                            <div key={m.id} className="flex justify-between items-center group">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-yellow-500 font-bold">{m.marketplace}</span>
                                                    <span className="text-gray-500 font-mono">{m.remote_product_id}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnmatch(m.id); }}
                                                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Bağlantıyı Kopar"
                                                >
                                                    <Unlink size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* SAĞ PANEL: Pazaryeri Arama */}
            <div className="w-1/2 flex flex-col p-4 bg-gray-900/50">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-300">Pazaryeri Bağlantısı</h2>
                    {selectedProduct && <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Seçili: {selectedProduct.code}</span>}
                </div>

                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {marketplaces.length === 0 ? (
                            <div className="text-gray-500 text-sm">Hiç pazaryeri bağlı değil. Ayarlar'dan ekleyin.</div>
                        ) : marketplaces.map(mp => (
                            <button
                                key={mp.id}
                                onClick={() => setSelectedMarketplace(mp.name)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${selectedMarketplace === mp.name
                                    ? "bg-yellow-600 text-white shadow-lg transform scale-105"
                                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                    }`}
                            >
                                <ShoppingBag size={12} /> {mp.name}
                            </button>
                        ))}
                    </div>

                    {marketplaces.length > 0 && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={mpSearch}
                                onChange={e => setMpSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchMarketplace()}
                                placeholder={`${selectedMarketplace}'da Ara...`}
                                className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:border-yellow-500 outline-none"
                            />
                            <button onClick={searchMarketplace} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded text-white font-medium flex items-center gap-2">
                                <Search size={16} /> Ara
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {mpLoading ? (
                        <div className="flex justify-center p-8 text-gray-500">Aranıyor...</div>
                    ) : mpResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-lg">
                            <Search size={24} className="mb-2 opacity-50" />
                            <div>Sonuç yok veya arama yapılmadı</div>
                        </div>
                    ) : (
                        mpResults.map((res: any) => (
                            <div key={res.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex gap-3 hover:border-yellow-500/50 transition-colors">
                                <div className="w-16 h-16 bg-gray-900 rounded flex-shrink-0 relative overflow-hidden">
                                    {res.imageUrl ? (
                                        <img src={res.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-700"><ExternalLink size={16} /></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-gray-200 line-clamp-2">{res.title}</div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span className="font-mono">Barkod: {res.barcode}</span>
                                        <span className="text-yellow-500 font-bold">{res.price} TL</span>
                                        <span className="text-gray-400">Stok: {res.stock}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleMatch(res)}
                                    className="self-center bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full shadow-lg"
                                    title="Eşleştir"
                                >
                                    <LinkIcon size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* EXCEL UPLOAD MODAL */}
            {showExcelModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                📊 Excel ile Toplu Eşleştirme
                            </h2>
                            <button
                                onClick={resetExcelModal}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                ✕
                            </button>
                        </div>

                        {!matchResults ? (
                            <>
                                <div className="space-y-4">
                                    {/* Marketplace Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Pazaryeri Seçin
                                        </label>
                                        <select
                                            value={excelMarketplace}
                                            onChange={e => setExcelMarketplace(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:border-green-500 outline-none"
                                        >
                                            <option value="">-- Pazaryeri Seçin --</option>
                                            {marketplaces.map(mp => (
                                                <option key={mp.id} value={mp.name}>
                                                    {mp.name} ({mp.platform})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* File Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Excel Dosyası Seçin
                                        </label>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={e => setExcelFile(e.target.files?.[0] || null)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:border-green-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-500"
                                        />
                                        {excelFile && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Seçili: {excelFile.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-blue-900/20 border border-blue-700 rounded p-3 text-xs text-blue-300">
                                        <p className="font-bold mb-1">📋 Talimatlar:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Pazaryerinizden ürün listesini Excel olarak indirin</li>
                                            <li>Trendyol için: "Barkod" ve "Partner ID" kolonları gerekli</li>
                                            <li>WooCommerce için: "SKU" ve "ID" kolonları gerekli</li>
                                            <li>Sistem, barkod eşleşmesine göre otomatik eşleştirme yapacak</li>
                                        </ul>
                                    </div>

                                    {/* Progress Bar */}
                                    {uploadProgress > 0 && (
                                        <div className="space-y-2">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-center text-gray-400">
                                                İşleniyor... {uploadProgress}%
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={handleExcelUpload}
                                        disabled={!excelFile || !excelMarketplace || uploadProgress > 0}
                                        className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
                                    >
                                        {uploadProgress > 0 ? 'İşleniyor...' : 'Eşleştirmeyi Başlat'}
                                    </button>
                                    <button
                                        onClick={resetExcelModal}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Results Display */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-green-900/30 border border-green-700 rounded p-3 text-center">
                                            <div className="text-2xl font-bold text-green-400">{matchResults.matched}</div>
                                            <div className="text-xs text-green-300">Eşleştirildi</div>
                                        </div>
                                        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 text-center">
                                            <div className="text-2xl font-bold text-yellow-400">{matchResults.skipped}</div>
                                            <div className="text-xs text-yellow-300">Atlandı</div>
                                        </div>
                                        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-center">
                                            <div className="text-2xl font-bold text-red-400">{matchResults.notFound}</div>
                                            <div className="text-xs text-red-300">Bulunamadı</div>
                                        </div>
                                    </div>

                                    {matchResults.errors.length > 0 && (
                                        <div className="bg-red-900/20 border border-red-700 rounded p-3 max-h-40 overflow-y-auto">
                                            <p className="text-sm font-bold text-red-400 mb-2">Hatalar:</p>
                                            <ul className="text-xs text-red-300 space-y-1">
                                                {matchResults.errors.slice(0, 10).map((err: string, idx: number) => (
                                                    <li key={idx}>• {err}</li>
                                                ))}
                                                {matchResults.errors.length > 10 && (
                                                    <li className="text-gray-400">... ve {matchResults.errors.length - 10} hata daha</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={resetExcelModal}
                                    className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded"
                                >
                                    Kapat
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
