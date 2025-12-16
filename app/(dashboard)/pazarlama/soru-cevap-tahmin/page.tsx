"use client";

import { predictQuestionsAction } from '@/app/actions/marketingActions';

import { useState } from 'react';
import {
    Search, Brain, MessageCircle, Copy, Check,
    HelpCircle, BookOpen, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function QAPredictionPage() {
    const [input, setInput] = useState("");
    const [category, setCategory] = useState("Genel");
    const [loading, setLoading] = useState(false);
    const [qaList, setQaList] = useState<any[]>([]);

    async function predict() {
        if (!input) return toast.error("Lütfen bir ürün adı veya açıklaması girin.");

        setLoading(true);
        setQaList([]);

        try {
            const data = await predictQuestionsAction(input, category);
            setQaList(data);
            toast.success("Sorular ve cevaplar hazırlandı!");
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Kopyalandı!");
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                        Soru-Cevap Tahminatörü 🔮
                    </h1>
                    <p className="text-gray-400">Müşterilerinizi şaşırtın: Onlar sormadan cevaplarını hazırlayın.</p>
                </div>
            </div>

            {/* INPUT SECTION */}
            <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 shadow-2xl shadow-blue-900/10">
                <div className="flex flex-col lg:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">Ürün Adı / Açıklaması</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="text"
                                className="w-full bg-[#020617] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 outline-none focus:border-blue-500 transition"
                                placeholder="Örn: 3 Kişilik Kamp Çadırı, Su Geçirmez..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && predict()}
                            />
                        </div>
                    </div>

                    <div className="w-full lg:w-48 space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">Kategori (Opsiyonel)</label>
                        <select
                            className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-blue-500"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option>Genel</option>
                            <option>Elektronik</option>
                            <option>Ev & Yaşam</option>
                            <option>Giyim</option>
                            <option>Spor</option>
                        </select>
                    </div>

                    <button
                        onClick={predict}
                        disabled={loading}
                        className="w-full lg:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" /> : <Brain />}
                        {loading ? "Düşünülüyor..." : "Soruları Tahmin Et"}
                    </button>
                </div>
            </div>

            {/* RESULTS */}
            {qaList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                    {qaList.map((qa, i) => (
                        <div key={i} className="bg-[#111827] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition group relative">
                            <div className="absolute top-4 right-4 text-xs font-bold text-gray-600 bg-gray-800 px-2 py-1 rounded uppercase tracking-wider">{qa.cat}</div>

                            <h3 className="text-white font-bold pr-16 mb-4 flex gap-2">
                                <span className="text-blue-500">S:</span> {qa.q}
                            </h3>

                            <div className="bg-[#1F2937] rounded-xl p-4 mb-3 border border-white/5 relative">
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    <span className="text-green-500 font-bold mr-1">C:</span> {qa.a}
                                </p>
                                <button
                                    onClick={() => copyToClipboard(qa.a)}
                                    className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-white bg-gray-700/50 hover:bg-blue-600 rounded-lg transition"
                                    title="Cevabı Kopyala"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>

                            <div className="flex items-start gap-2 text-xs text-yellow-500/80 bg-yellow-500/5 p-2 rounded-lg">
                                <Zap size={14} className="shrink-0 mt-0.5" fill="currentColor" />
                                <span><strong className="text-yellow-500">Satıcı Notu:</strong> {qa.note}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && qaList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-[#0F172A]/50">
                    <MessageCircle size={64} className="text-gray-800 mb-4" />
                    <h3 className="text-xl font-bold text-gray-400 mb-2">Henüz Soru Tahmin Edilmedi</h3>
                    <p className="text-gray-600 max-w-md">Ürün adını yukarı yazın, yapay zeka müşterilerin aklını okusun.</p>
                </div>
            )}
        </div>
    );
}
