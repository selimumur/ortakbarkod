"use client";

import { useState, useEffect } from 'react';
import { 
    Globe, Search, RefreshCw, UploadCloud, Loader2, ChevronLeft, ChevronRight, 
    AlertCircle, Store, ShoppingBag, Flower2, X, CheckCircle 
} from 'lucide-react';
import { supabase } from '../supabase'; 
import { toast } from 'sonner';

// --- TİP TANIMLAMALARI ---
type Account = {
    id: string;
    platform: string;
    store_name: string;
    is_active: boolean;
};

type Product = {
    id: number;
    name: string;
    code: string;
    price: number;
    stock: number;
    description?: string;
    created_at?: string;
};

// --- YARDIMCI: İKON GETİR ---
const getPlatformIcon = (platform: string, size = 16) => {
    switch(platform.toLowerCase()) {
        case 'trendyol': return <Store className="text-orange-500" size={size}/>;
        case 'hepsiburada': return <ShoppingBag className="text-orange-600" size={size}/>;
        case 'woocommerce': return <Globe className="text-purple-500" size={size}/>;
        case 'shopify': return <ShoppingBag className="text-green-500" size={size}/>;
        default: return <Globe className="text-gray-400" size={size}/>;
    }
};

export default function MarketplacePage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filtreleme
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 20;

    // MODAL STATE'LERİ
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [targetAccountId, setTargetAccountId] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [page, searchTerm]);

    // 1. Mağazaları Çek
    async function fetchAccounts() {
        const { data } = await supabase.from('marketplace_accounts').select('*').eq('is_active', true);
        if (data) setAccounts(data);
    }

    // 2. Ürünleri Çek
    async function fetchProducts() {
        setLoading(true);
        try {
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase.from('master_products').select('*', { count: 'exact' }).order('created_at', { ascending: false });
            
            if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

            const { data, count, error } = await query.range(from, to);

            if (error) {
                // Yedek tabloyu dene
                const backup = await supabase.from('products').select('*', { count: 'exact' }).range(from, to);
                if (backup.data) {
                    setProducts(backup.data);
                    setTotalCount(backup.count || 0);
                }
            } else if (data) {
                setProducts(data);
                setTotalCount(count || 0);
            }
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    }

    // --- MODAL AÇMA ---
    const openUploadModal = (product: Product) => {
        setSelectedProduct(product);
        setTargetAccountId(""); // Seçimi sıfırla
        setIsModalOpen(true);
    };

    // --- GÖNDERİM İŞLEMİ ---
    const handleSendToMarketplace = async () => {
        if (!selectedProduct || !targetAccountId) return toast.error("Lütfen bir mağaza seçin.");

        const account = accounts.find(a => a.id === targetAccountId);
        if (!account) return;

        // Şimdilik Sadece WooCommerce destekliyoruz
        if (account.platform !== 'WooCommerce') {
            return toast.info(`${account.platform} ürün yükleme servisi çok yakında!`);
        }

        setUploading(true);
        const toastId = toast.loading(`${account.store_name} mağazasına gönderiliyor...`);

        try {
            const res = await fetch('/api/woocommerce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: account.id,
                    product: {
                        name: selectedProduct.name,
                        price: selectedProduct.price,
                        stock: selectedProduct.stock,
                        sku: selectedProduct.code,
                        description: selectedProduct.description || ""
                    }
                })
            });

            const responseText = await res.text();
            let result;
            try { result = JSON.parse(responseText); } catch(e) { throw new Error("Sunucu yanıtı bozuk."); }

            if (!res.ok || !result.success) {
                throw new Error(result.error || "Bilinmeyen hata");
            }

            toast.success("Ürün başarıyla açıldı!", { id: toastId });
            setIsModalOpen(false); // Modalı kapat

        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    return (
        <div className="w-full h-full bg-[#0B1120] p-8 overflow-y-auto">
            {/* BAŞLIK */}
            <header className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Globe className="text-purple-500" /> Pazaryeri Yönetimi
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Ürün kataloğunuzu pazaryerlerine aktarın.</p>
                </div>
                {/* AKTİF MAĞAZA LİSTESİ */}
                <div className="flex gap-2">
                    {accounts.map(acc => (
                        <div key={acc.id} className="bg-gray-800 px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-700 flex items-center gap-2">
                            {getPlatformIcon(acc.platform)} {acc.store_name}
                        </div>
                    ))}
                </div>
            </header>

            {/* ARAMA */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    <input type="text" placeholder="Ürün Ara..." className="w-full bg-[#111827] border border-gray-700 rounded-xl pl-10 py-2 text-white text-sm outline-none focus:border-purple-500 transition"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => fetchProducts()} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition"><RefreshCw size={18}/></button>
            </div>

            {/* LİSTE */}
            <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#1F2937] text-gray-200 uppercase font-bold text-xs">
                        <tr>
                            <th className="p-4">Ürün</th>
                            <th className="p-4">SKU</th>
                            <th className="p-4">Fiyat</th>
                            <th className="p-4">Stok</th>
                            <th className="p-4 text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Yükleniyor...</td></tr> : 
                         products.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Ürün yok.</td></tr> :
                         products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-800/50 transition">
                                <td className="p-4 font-medium text-white">{product.name}</td>
                                <td className="p-4 font-mono text-xs">{product.code}</td>
                                <td className="p-4 text-white">₺{product.price?.toLocaleString()}</td>
                                <td className="p-4">{product.stock}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openUploadModal(product)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ml-auto shadow-lg shadow-purple-900/20">
                                        <UploadCloud size={14}/> Mağazada Aç
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-[#111827]">
                    <span className="text-xs text-gray-500">Sayfa {page} / {totalPages}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-gray-800 rounded text-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-gray-800 rounded text-white disabled:opacity-50"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            {/* === SEÇİM MODALI === */}
            {isModalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#111827]">
                            <h3 className="text-white font-bold">Mağaza Seçimi</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-white"/></button>
                        </div>
                        
                        <div className="p-6">
                            <p className="text-gray-400 text-sm mb-4">
                                <strong className="text-white">{selectedProduct.name}</strong> ürününü hangi mağazada açmak istersiniz?
                            </p>

                            <div className="space-y-3">
                                {accounts.map(acc => (
                                    <div 
                                        key={acc.id}
                                        onClick={() => setTargetAccountId(acc.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                                            targetAccountId === acc.id 
                                            ? 'border-purple-500 bg-purple-500/10' 
                                            : 'border-gray-700 bg-[#111827] hover:border-gray-500'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-800 p-2 rounded-lg">{getPlatformIcon(acc.platform, 20)}</div>
                                            <div>
                                                <p className="text-white text-sm font-bold">{acc.store_name}</p>
                                                <p className="text-xs text-gray-500">{acc.platform}</p>
                                            </div>
                                        </div>
                                        {targetAccountId === acc.id && <CheckCircle className="text-purple-500" size={20}/>}
                                    </div>
                                ))}
                                {accounts.length === 0 && <p className="text-red-400 text-center text-sm">Bağlı mağaza bulunamadı.</p>}
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-700 bg-[#111827] flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Vazgeç</button>
                            <button 
                                onClick={handleSendToMarketplace} 
                                disabled={uploading || !targetAccountId}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
                                {uploading ? 'Gönderiliyor...' : 'GÖNDER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}