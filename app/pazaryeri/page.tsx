"use client";

import { useState, useEffect } from 'react';
import { 
    Package, 
    Search, 
    RefreshCw, 
    DownloadCloud, 
    Globe, 
    CheckCircle2, 
    AlertCircle, 
    Store,
    ChevronLeft,
    ChevronRight,
    UploadCloud // Yükleme ikonu
} from 'lucide-react';
import { supabase } from '../supabase'; 
import { toast } from 'sonner';

// --- TİP TANIMLAMALARI ---

type MarketplaceConnection = {
    id: number;
    platform: string;
    supplier_id: string; 
    is_active: boolean;
};

type MarketplaceMap = {
    id: number;
    marketplace_type: string;
    remote_product_id: string;
    remote_price: number;
    remote_stock: number;
    target_price: number;
    sync_needed: boolean;
    last_error?: string;
    last_sync_date?: string;
};

type Product = {
    id: number;
    name: string;
    code: string;
    price: number;
    stock: number;
    product_marketplace_map?: MarketplaceMap[];
};

// --- ANA BİLEŞEN ---

export default function MarketplacePage() {
    const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [syncingId, setSyncingId] = useState<number | null>(null); // Tekil gönderim loading durumu
    
    // Sayfalama ve Arama
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const ITEMS_PER_PAGE = 50; 

    useEffect(() => { 
        fetchConnections();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [page, searchQuery]); 

    const fetchConnections = async () => {
        const { data } = await supabase
            .from('marketplace_connections')
            .select('*')
            .eq('is_active', true);
        
        setConnections(data || []);
        if (data && data.length === 1) setSelectedStore(data[0].id);
    };

    const fetchProducts = async () => {
        setLoading(true);
        
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // 1. Sorguyu Hazırla
        let query = supabase
            .from('master_products')
            .select('*, product_marketplace_map(*)', { count: 'exact' })
            .neq('code', null); // Boş kodlu çöp verileri engelle

        // 2. Arama Varsa Filtrele
        if (searchQuery) {
            query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`);
        }

        // 3. Veriyi Çek
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Veri hatası:", error);
            toast.error("Veriler yüklenirken hata oluştu.");
        } else {
            setProducts(data || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    };

    // İŞLEM 1: TOPLU IMPORT (Veri Çekme)
    const handleImport = async () => {
        if (!selectedStore) {
            toast.error("Lütfen önce bir mağaza seçin!");
            return;
        }

        setImporting(true);
        let currentPage = 1;
        let totalCreated = 0;
        let keepFetching = true;
        const toastId = toast.loading("Veriler çekiliyor...");

        try {
            while (keepFetching) {
                toast.loading(`Sayfa ${currentPage} taranıyor... (Eklenen: ${totalCreated})`, { id: toastId });

                const res = await fetch('/api/marketplace/import', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ connectionId: selectedStore, page: currentPage }) 
                });

                const textData = await res.text();
                let data;
                try { data = JSON.parse(textData); } catch { throw new Error(`Sunucu hatası: ${res.status}`); }

                if (!res.ok) throw new Error(data.error);

                totalCreated += (data.created || 0);

                if (data.hasMore && data.processed > 0) currentPage++;
                else keepFetching = false;
            }

            toast.success(`İşlem Tamam! ${totalCreated} yeni ürün eklendi.`, { id: toastId });
            setPage(1); 
            fetchProducts(); 

        } catch (e: any) {
            toast.error(`Hata: ${e.message}`, { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    // İŞLEM 2: FİYAT GÜNCELLEME (Kuyruğa Ekleme)
    const handlePriceChange = async (mapId: number, newPrice: number, currentTarget: number) => {
        if (newPrice === currentTarget) return;

        const { error } = await supabase
            .from('product_marketplace_map')
            .update({ target_price: newPrice, sync_needed: true })
            .eq('id', mapId);

        if (!error) {
            toast.success("Fiyat kuyruğa alındı.");
            fetchProducts();
            try { fetch('/api/marketplace/worker'); } catch {}
        }
    };

    // İŞLEM 3: TEKİL ÜRÜN GÖNDERME (Mağazada Aç)
    const handleSingleSync = async (product: Product) => {
        if (!selectedStore) return toast.error("Mağaza seçmelisiniz.");
        
        setSyncingId(product.id);
        const toastId = toast.loading("Ürün mağazaya gönderiliyor...");

        try {
            // Mevcut Sync API'mizi kullanıyoruz
            // Not: Sync API'si şu an sadece WooCommerce varsayıyor olabilir, 
            // onu da mağaza ID'si alacak şekilde güncellemek gerekebilir. 
            // Şimdilik import mantığıyla eşleşme yapıyoruz.
            
            // Hızlı çözüm: Import API'sini tek ürünlük kullanmak yerine
            // createProductInWooCommerce fonksiyonunu tetikleyen bir endpoint kullanmalıyız.
            // Mevcut /api/marketplace/sync endpointi bu işi yapıyor.
            
            const res = await fetch('/api/marketplace/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id }) // Mağaza ID'sini backend'de connection tablosundan alıyor
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Ürün başarıyla açıldı/eşleşti!", { id: toastId });
            fetchProducts();

        } catch (e: any) {
            toast.error("Hata: " + e.message, { id: toastId });
        } finally {
            setSyncingId(null);
        }
    };

    // Sayfa Sayısı Hesapla
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="p-6 bg-[#0B1120] min-h-screen text-gray-200 font-sans flex flex-col">
            
            {/* ÜST BÖLÜM */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Store className="text-purple-500"/> Pazaryeri Ürün Yönetimi
                    </h1>
                    
                    <div className="flex gap-2">
                        {connections.map(conn => (
                            <button
                                key={conn.id}
                                onClick={() => setSelectedStore(conn.id)}
                                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all text-sm ${
                                    selectedStore === conn.id 
                                    ? 'bg-purple-900/40 border-purple-500 text-white' 
                                    : 'bg-[#111827] border-gray-700 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                <div className="w-2 h-2 rounded-full bg-current"></div>
                                {conn.supplier_id}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 bg-[#111827] p-4 rounded-xl border border-gray-800">
                    <button 
                        onClick={handleImport}
                        disabled={importing || !selectedStore}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition whitespace-nowrap text-sm"
                    >
                        {importing ? <RefreshCw className="animate-spin" size={16}/> : <DownloadCloud size={16}/>}
                        {importing ? 'Çekiliyor...' : 'Tüm Verileri Çek & Eşle'}
                    </button>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-500" size={18}/>
                        <input 
                           type="text" 
                           placeholder="Ürün adı veya kodu ile ara..." 
                           className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-2.5 pl-10 text-white outline-none focus:border-purple-500 transition text-sm"
                           value={searchQuery} 
                           onChange={e => {
                               setSearchQuery(e.target.value);
                               setPage(1); 
                           }}
                        />
                    </div>
                </div>
            </div>

            {/* TABLO */}
            <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden shadow-xl flex-1 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#1F2937] text-gray-200 font-bold uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Ürün Bilgisi</th>
                                <th className="p-4">Stok</th>
                                <th className="p-4">Sistem Fiyatı</th>
                                <th className="p-4">Pazaryeri (Canlı)</th>
                                <th className="p-4">Hedef Fiyat</th>
                                <th className="p-4 text-right">Durum / Aksiyon</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                products.map(p => {
                                    // Eşleşme var mı kontrol et
                                    const map = p.product_marketplace_map?.find((m: MarketplaceMap) => 
                                        selectedStore ? true : m.marketplace_type === 'woocommerce' 
                                    );
                                    
                                    // ARTIK GİZLEMİYORUZ!
                                    // if (!map) return null; <--- BU SATIRI SİLDİK

                                    return (
                                        <tr key={p.id} className="hover:bg-gray-800/50 transition">
                                            <td className="p-4">
                                                <div className="text-white font-bold">{p.name}</div>
                                                <div className="text-xs text-blue-400 font-mono mt-0.5">{p.code}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-xs ${p.stock < 5 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                                    {p.stock} Adet
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-400">₺{p.price.toLocaleString()}</td>
                                            
                                            {/* PAZARYERİ SÜTUNU */}
                                            <td className="p-4">
                                                {map ? (
                                                    <span className="text-orange-400 font-mono font-bold">
                                                        ₺{map.remote_price}
                                                        <span className="text-[10px] text-gray-600 ml-2 font-normal">(Stok: {map.remote_stock})</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600 text-xs italic">-</span>
                                                )}
                                            </td>

                                            {/* HEDEF FİYAT / İŞLEM SÜTUNU */}
                                            <td className="p-4">
                                                {map ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-600 text-xs">₺</span>
                                                        <input 
                                                            type="number" 
                                                            className="bg-[#0B1120] border border-gray-600 rounded p-1.5 w-24 text-white font-bold focus:border-purple-500 outline-none text-center"
                                                            defaultValue={map.target_price || map.remote_price}
                                                            onBlur={(e) => handlePriceChange(map.id, parseFloat(e.target.value), (map.target_price || map.remote_price))}
                                                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* DURUM / BUTON */}
                                            <td className="p-4 text-right">
                                                {map ? (
                                                    map.sync_needed ? (
                                                        <span className="text-yellow-500 flex items-center justify-end gap-1 text-xs font-bold animate-pulse"><RefreshCw size={14}/> Kuyrukta</span>
                                                    ) : map.last_error ? (
                                                        <div className="group relative flex justify-end">
                                                            <span className="text-red-500 flex items-center gap-1 text-xs font-bold cursor-help"><AlertCircle size={14}/> Hata</span>
                                                            <div className="absolute right-0 bottom-full bg-red-900 text-white text-[10px] p-2 rounded hidden group-hover:block w-48 z-50">{map.last_error}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-right">
                                                            <span className="text-green-500 flex items-center justify-end gap-1 text-xs font-bold"><CheckCircle2 size={14}/> Eşleşti</span>
                                                            {map.last_sync_date && <div className="text-[9px] text-gray-600 mt-0.5">{new Date(map.last_sync_date).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</div>}
                                                        </div>
                                                    )
                                                ) : (
                                                    // EŞLEŞME YOKSA "MAĞAZADA AÇ" BUTONU GÖSTER
                                                    <button 
                                                        onClick={() => handleSingleSync(p)}
                                                        disabled={syncingId === p.id}
                                                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ml-auto"
                                                    >
                                                        {syncingId === p.id ? <RefreshCw className="animate-spin" size={12}/> : <UploadCloud size={14}/>}
                                                        {syncingId === p.id ? '...' : 'Mağazada Aç'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- SAYFALAMA --- */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-[#161f32]">
                        <div className="text-sm text-gray-400">
                            Toplam <span className="text-white font-bold">{totalCount}</span> ürün, 
                            <span className="text-white font-bold mx-1">{page}</span> / {totalPages} sayfa
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg bg-[#0B1120] border border-gray-700 hover:border-gray-500 disabled:opacity-50 transition text-white"
                            >
                                <ChevronLeft size={18}/>
                            </button>
                            
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pNum = page - 2 + i;
                                    if (page < 3) pNum = i + 1;
                                    if (pNum > totalPages) return null;
                                    if (pNum < 1) return null;

                                    return (
                                        <button 
                                            key={pNum}
                                            onClick={() => setPage(pNum)}
                                            className={`w-8 h-8 rounded-lg text-sm font-bold transition ${
                                                page === pNum 
                                                ? 'bg-purple-600 text-white' 
                                                : 'bg-[#0B1120] border border-gray-700 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {pNum}
                                        </button>
                                    )
                                })}
                            </div>

                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-2 rounded-lg bg-[#0B1120] border border-gray-700 hover:border-gray-500 disabled:opacity-50 transition text-white"
                            >
                                <ChevronRight size={18}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}