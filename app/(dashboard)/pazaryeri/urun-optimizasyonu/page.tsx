"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Search, Filter, AlertTriangle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getOptimizationAnalysisAction, optimizeProductWithAIAction } from '@/app/actions/optimizationActions';

// --- TYPES ---
type ProductAnalysis = {
    id: number;
    name: string;
    image_url: string | null;
    stock: number;
    price: number;
    titleLength: number;
    descLength: number;
    imageCount: number;
    missingSpecs: number;
    score: number;
    status: 'low' | 'medium' | 'high';
    issues: string[];
};

export default function ProductOptimizationPage() {
    const [products, setProducts] = useState<ProductAnalysis[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [scoreFilter, setScoreFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
    const [issueFilter, setIssueFilter] = useState<'all' | 'title' | 'desc' | 'images' | 'specs'>('all');

    const fetchAndAnalyze = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getOptimizationAnalysisAction(search);
            setProducts(data);
        } catch (e: any) {
            console.error(e);
            toast.error("Veri analiz edilirken hata: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [search]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            fetchAndAnalyze();
        }, 500); // Slightly longer debounce for analysis
        return () => clearTimeout(t);
    }, [fetchAndAnalyze]);

    const handleOptimize = async (id: number) => {
        toast.promise(optimizeProductWithAIAction(id), {
            loading: 'AI İyileştirmesi yapılıyor...',
            success: (data) => data.message,
            error: 'İyileştirme hatası'
        });
    }

    // Filter Logic (Client-side filtering on the analyzed 100 items is fine)
    const filteredProducts = products.filter(p => {
        if (scoreFilter !== 'all' && p.status !== scoreFilter) return false;
        if (issueFilter === 'title' && !p.issues.some(i => i.includes('Başlık'))) return false;
        if (issueFilter === 'desc' && !p.issues.some(i => i.includes('Açıklama'))) return false;
        if (issueFilter === 'images' && !p.issues.some(i => i.includes('Görsel'))) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-purple-500" /> Ürün Sayfası Optimizasyonu
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">AI destekli içerik kalitesi analizi ve iyileştirme önerileri.</p>
                </div>
                <div className="flex gap-4 text-sm font-bold">
                    <div className="px-4 py-2 bg-[#111827] border border-gray-800 rounded-lg flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">Ortalama Skor</span>
                        <span className="text-xl text-white">
                            {products.length > 0 ? Math.round(products.reduce((a, b) => a + b.score, 0) / products.length) : 0}
                        </span>
                    </div>
                    <div className="px-4 py-2 bg-[#111827] border border-gray-800 rounded-lg flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">Kritik Ürün</span>
                        <span className="text-xl text-red-500">
                            {products.filter(p => p.status === 'low').length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 shrink-0">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Ürün adı ara..."
                        className="w-full bg-[#111827] border border-gray-700 rounded-lg py-2 pl-9 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="bg-[#111827] border border-gray-700 rounded-lg py-2 px-3 text-sm text-gray-300 outline-none focus:border-purple-500"
                    value={scoreFilter}
                    onChange={(e: any) => setScoreFilter(e.target.value)}
                >
                    <option value="all">Tüm Puanlar</option>
                    <option value="high">Yüksek (80-100)</option>
                    <option value="medium">Orta (50-79)</option>
                    <option value="low">Düşük (0-49)</option>
                </select>

                <select
                    className="bg-[#111827] border border-gray-700 rounded-lg py-2 px-3 text-sm text-gray-300 outline-none focus:border-purple-500"
                    value={issueFilter}
                    onChange={(e: any) => setIssueFilter(e.target.value)}
                >
                    <option value="all">Tüm Sorunlar</option>
                    <option value="title">Başlık Sorunu</option>
                    <option value="desc">Açıklama Sorunu</option>
                    <option value="images">Görsel Sorunu</option>
                </select>

                <button onClick={fetchAndAnalyze} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white" title="Yenile">
                    <Filter size={18} />
                </button>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto bg-[#111827] border border-gray-800 rounded-xl shadow-xl custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-[#1F2937] text-gray-400 text-xs uppercase font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-4">Ürün Detayı</th>
                            <th className="p-4 text-center">Skor</th>
                            <th className="p-4">Analiz Detayı</th>
                            <th className="p-4 w-60">Tespit Edilen Sorunlar</th>
                            <th className="p-4 text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 animate-pulse">Analiz yapılıyor...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Kriterlere uygun ürün bulunamadı.</td></tr>
                        ) : (
                            filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-gray-800/50 transition group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="w-12 h-12 rounded bg-white object-contain border border-gray-700" />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-gray-600"><ImageIcon size={20} /></div>
                                            )}
                                            <div>
                                                <div className="font-bold text-white max-w-[250px] truncate" title={product.name}>{product.name}</div>
                                                <div className="text-gray-500 text-xs mt-0.5">Stok: {product.stock} | Fiyat: ₺{product.price}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-4 font-bold text-sm ${product.score >= 80 ? 'border-green-500/30 text-green-400' :
                                            product.score >= 50 ? 'border-yellow-500/30 text-yellow-400' :
                                                'border-red-500/30 text-red-400'
                                            }`}>
                                            {product.score}
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex gap-4 text-xs">
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-500 mb-1">Başlık</span>
                                                <span className={`font-mono font-bold ${product.titleLength < 20 || product.titleLength > 120 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {product.titleLength} kr
                                                </span>
                                            </div>
                                            <div className="w-px bg-gray-800 h-8"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-500 mb-1">Açıklama</span>
                                                <span className={`font-mono font-bold ${product.descLength < 150 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                    {product.descLength} kr
                                                </span>
                                            </div>
                                            <div className="w-px bg-gray-800 h-8"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-500 mb-1">Görsel</span>
                                                <span className={`font-mono font-bold ${product.imageCount < 3 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {product.imageCount} ad
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {product.issues.length > 0 ? (
                                                product.issues.map((issue, idx) => (
                                                    <span key={idx} className="px-2 py-1 rounded bg-red-900/20 border border-red-500/20 text-red-300 text-[10px] font-medium flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {issue}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-green-900/20 border border-green-500/20 text-green-300 text-[10px] font-medium flex items-center gap-1">
                                                    <CheckCircle size={10} /> Mükemmel
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleOptimize(product.id)}
                                            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto shadow-lg shadow-purple-900/20">
                                            <Zap size={12} /> AI İyileştir
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
