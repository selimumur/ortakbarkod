"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Receipt, RefreshCw, Save, Search, AlertCircle
} from 'lucide-react';
import { getPricingProductsAction, updateProductPriceAction } from '@/app/actions/pricingActions';

export default function PricingPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null); // matchId
    const [editPrice, setEditPrice] = useState<string>("");

    const fetchPricing = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPricingProductsAction(search);
            setProducts(data || []);
        } catch (e) {
            toast.error("Fiyatlar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        // Debounce search
        const t = setTimeout(fetchPricing, 300);
        return () => clearTimeout(t);
    }, [fetchPricing]);

    const startEdit = (match: any) => {
        setEditingId(match.id);
        setEditPrice(match.price ? match.price.toString() : "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditPrice("");
    };

    const savePrice = async (matchId: number) => {
        const priceVal = parseFloat(editPrice);
        if (isNaN(priceVal) || priceVal < 0) return toast.warning("Geçerli bir fiyat girin.");

        const tId = toast.loading("Fiyat güncelleniyor...");
        try {
            await updateProductPriceAction({ matchId, newPrice: priceVal });
            toast.success("Fiyat güncellendi!");
            setEditingId(null);
            fetchPricing(); // Refresh
        } catch (e: any) {
            toast.error(e.message || "Güncelleme hatası.");
        } finally {
            toast.dismiss(tId);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Receipt className="text-green-500" /> Fiyat Yönetimi
                        </h1>
                        <p className="text-gray-400 text-xs mt-1">Tüm pazaryerlerindeki fiyatlarınızı tek ekrandan yönetin.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Ürün adı veya kod ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded pl-10 pr-4 py-2 text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button onClick={() => fetchPricing()} className="p-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden min-h-full">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900/80 text-gray-400 text-xs uppercase sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="p-4 border-b border-gray-700 w-1/3">Ürün</th>
                                <th className="p-4 border-b border-gray-700 w-32 text-center text-yellow-500">Maliyet</th>
                                <th className="p-4 border-b border-gray-700">Pazaryeri Fiyatları</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm">
                            {loading && products.length === 0 ? (
                                <tr><td colSpan={3} className="p-20 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={3} className="p-20 text-center text-gray-500">Kayıt yok.</td></tr>
                            ) : (
                                products.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-700/30">
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-gray-200">{p.name}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-1">{p.code}</div>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <span className="bg-yellow-900/20 text-yellow-500 px-2 py-1 rounded font-mono text-xs border border-yellow-900/30">
                                                {p.cost_price ? `${p.cost_price} TL` : '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 align-top">
                                            {(!p.matches || p.matches.length === 0) ? (
                                                <span className="text-gray-600 text-xs italic">Bağlı mağaza yok.</span>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {p.matches.map((m: any) => (
                                                        <div key={m.id} className="bg-black/20 p-2 rounded border border-gray-700 flex justify-between items-center group">
                                                            <div>
                                                                <div className="text-xs text-gray-400 font-bold mb-0.5">{m.marketplace}</div>
                                                                <div className="text-[10px] text-gray-600 font-mono">{m.remote_product_id}</div>
                                                            </div>

                                                            {editingId === m.id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={editPrice}
                                                                        onClick={e => e.stopPropagation()}
                                                                        onChange={e => setEditPrice(e.target.value)}
                                                                        className="w-20 bg-gray-900 border border-blue-500 rounded px-1 py-1 text-right text-xs focus:outline-none"
                                                                        autoFocus
                                                                    />
                                                                    <button onClick={() => savePrice(m.id)} className="text-green-500 hover:bg-green-900 p-1 rounded"><Save size={14} /></button>
                                                                    <button onClick={cancelEdit} className="text-red-500 hover:bg-red-900 p-1 rounded"><AlertCircle size={14} /></button>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    onClick={() => startEdit(m)}
                                                                    className="font-bold cursor-pointer hover:text-blue-400 flex items-center gap-2 group-hover:bg-gray-700/50 px-2 py-1 rounded transition-colors"
                                                                >
                                                                    {m.price} TL
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
