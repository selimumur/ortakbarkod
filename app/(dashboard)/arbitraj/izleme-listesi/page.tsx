"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, ShoppingCart, ExternalLink, Trash2, RotateCw, Link as LinkIcon, PackagePlus
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getWatchlistAction,
    addToWatchlistAction,
    removeFromWatchlistAction,
    createProductFromArbitrageAction,
    type WatchlistItem
} from '@/app/actions/arbitrageActions';

export default function WatchlistPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newLink, setNewLink] = useState("");


    useEffect(() => {
        fetchWatchlist();
    }, []);

    async function fetchWatchlist() {
        setLoading(true);
        try {
            const res = await getWatchlistAction();
            if (res.success && res.data) {
                setWatchlist(res.data);
            } else {
                toast.error("Veriler alınamadı: " + (res.error || "Bilinmeyen hata"));
            }
        } catch (e) {
            toast.error("İzleme listesi yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bu ürünü izleme listesinden çıkarmak istediğinize emin misiniz?")) return;

        const toastId = toast.loading("Siliniyor...");
        try {
            const res = await removeFromWatchlistAction(id);
            if (res.success) {
                toast.success("Ürün silindi", { id: toastId });
                setWatchlist(prev => prev.filter(i => i.id !== id));
            } else {
                toast.error("Silinemedi: " + res.error, { id: toastId });
            }
        } catch (e) {
            toast.error("Hata oluştu", { id: toastId });
        }
    }

    async function handleAddByLink() {
        if (!newLink) return;
        const toastId = toast.loading("Link taranıyor ve ürün ekleniyor...", { description: "Bu işlem 5-10 saniye sürebilir." });
        setIsAdding(true);

        // Normally we would scrape logic here or in backend. 
        // For now, we mock adding a product since scraper logic is complex.
        const mockData = {
            product_name: "Yeni Eklenen Ürün (Otomatik)",
            product_url: newLink,
            market_name: newLink.includes("trendyol") ? "Trendyol" : "Diğer",
            current_price: 100,
            target_price: 120,
            stock_status: "Stokta",
            currency: "TRY"
        };

        try {
            const res = await addToWatchlistAction(mockData);

            if (res.success) {
                toast.success("Ürün Başarıyla Eklendi", { id: toastId, description: mockData.product_name });
                setNewLink("");
                fetchWatchlist();
            } else {
                toast.error("Eklenemedi: " + res.error, { id: toastId });
            }
        } catch (e) {
            toast.error("Bağlantı hatası", { id: toastId });
        } finally {
            setIsAdding(false);
        }
    }

    async function handleConvertToProduct(itemId: string) {
        const toastId = toast.loading("Ürün kataloğuna ekleniyor...");

        try {
            const result = await createProductFromArbitrageAction(itemId);

            if (result.success) {
                toast.success("Ürün taslağı oluşturuldu!", {
                    id: toastId,
                    action: {
                        label: 'Ürünlere Git',
                        onClick: () => router.push('/urunler')
                    }
                });
            } else {
                toast.error("Oluşturulamadı", { id: toastId });
            }

        } catch (e: any) {
            console.error(e);
            toast.error("Hata: " + e.message, { id: toastId });
        }
    }

    const filtered = watchlist.filter(i => i.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="md:p-8 p-4 min-h-full bg-[#0B1120] text-white">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingCart className="text-indigo-500" /> Ürün İzleme Listesi
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Takip ettiğiniz ürünlerin anlık fiyat ve stok durumu.</p>
                </div>
            </div>

            {/* ADD NEW SECTION */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-8 shadow-lg shadow-black/40">
                <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <LinkIcon size={16} /> Hızlı Ürün Ekle (Canlı Link)
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        placeholder="Amazon, Trendyol veya Hepsiburada ürün linkini buraya yapıştırın..."
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddByLink()}
                    />
                    <button
                        onClick={handleAddByLink}
                        disabled={isAdding || !newLink}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-900/20 flex items-center gap-2"
                    >
                        {isAdding ? <RotateCw size={16} className="animate-spin" /> : <Plus size={16} />}
                        {isAdding ? "Taranıyor..." : "Ekle"}
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 ml-1">* Desteklenen siteler: Trendyol, Amazon, Hepsiburada, n11. Fiyat ve görsel otomatik çekilir.</p>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Listenizde arayın..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#111827] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                </div>
                <button onClick={fetchWatchlist} className="px-4 py-3 bg-[#111827] border border-gray-800 rounded-xl text-gray-400 hover:text-white transition flex items-center gap-2">
                    <RotateCw size={16} className={loading ? "animate-spin" : ""} /> Yenile
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64 text-gray-500">Yükleniyor...</div>
            ) : (
                /* CARD GRID */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-3xl">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShoppingCart size={24} />
                            </div>
                            <p className="font-bold">Listeniz boş</p>
                            <p className="text-xs mt-1">Link yapıştırarak ilk ürününüzü ekleyin.</p>
                        </div>
                    )}

                    {filtered.map((product) => (
                        <div
                            key={product.id}
                            className="bg-[#111827] rounded-3xl p-5 border border-gray-800 transition-all duration-300 hover:scale-[1.02] flex flex-col group hover:border-indigo-500/30"
                        >
                            {/* Header: Market Badge & Update Time */}
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                    {product.market_name || 'Bilinmiyor'}
                                </span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                    {/* {new Date(product.created_at).toLocaleDateString()} */}
                                    Canlı
                                </span>
                            </div>

                            {/* Product Info */}
                            <div className="flex gap-4 mb-4">
                                <div className="w-20 h-20 bg-white rounded-xl p-2 shrink-0 overflow-hidden relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={/*product.image_url ||*/ "https://placehold.co/200"} alt={product.product_name} className="w-full h-full object-contain hover:scale-110 transition duration-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-indigo-400 transition" title={product.product_name}>
                                        {product.product_name}
                                    </h3>
                                    <div className="mt-2 flex items-center gap-2">
                                        {product.stock_status === 'Tükendi' || product.stock_status === 'Bilinmiyor' ? (
                                            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{product.stock_status.toUpperCase()}</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">STOKTA</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Price Section */}
                            <div className="bg-gray-900/50 rounded-2xl p-3 mb-4 border border-gray-800">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Güncel Fiyat</p>
                                        <p className="text-xl font-black text-white">{product.currency === 'TRY' ? '₺' : product.currency}{product.current_price?.toLocaleString()}</p>
                                    </div>
                                    {/* Mock Target Logic Visualization */}
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Hedef</p>
                                        <p className="text-sm font-bold text-gray-300">{product.currency === 'TRY' ? '₺' : product.currency}{product.target_price?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <button onClick={() => handleConvertToProduct(product.id)} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mb-1 shadow-lg shadow-indigo-900/20">
                                    <PackagePlus size={16} /> Ürün Olarak Ekle
                                </button>
                                <a href={product.product_url || '#'} target="_blank" className="bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-xs font-bold transition text-center flex items-center justify-center gap-2">
                                    Git <ExternalLink size={12} />
                                </a>
                                <button onClick={() => handleDelete(product.id)} className="flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition border border-transparent hover:border-red-500/30">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
