"use client";

import { auditProductImageAction } from '@/app/actions/marketingActions';

import { useState } from 'react';
import {
    Image as ImageIcon, UploadCloud, Search, CheckCircle2,
    AlertTriangle, XCircle, Wand2, RefreshCw, Eye, Lightbulb,
    Camera, ScanEye
} from 'lucide-react';
import { toast } from 'sonner';

export default function ImageAuditPage() {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);

    async function analyze() {
        if (!input) return toast.error("Lütfen bir görsel linki girin.");

        setLoading(true);
        setReport(null);

        try {
            const data = await auditProductImageAction(input);
            setReport(data);
            toast.success("Görsel denetimi tamamlandı!");
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    // Helper for circular score
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500 border-green-500";
        if (score >= 50) return "text-yellow-500 border-yellow-500";
        return "text-red-500 border-red-500";
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500 mb-2">
                        Görsel Denetim Uzmanı 📸
                    </h1>
                    <p className="text-gray-400">Ürün fotoğraflarınızı yapay zeka ile profesyonel bir stüdyo gözüyle inceleyin.</p>
                </div>
            </div>

            {/* INPUT SECTION */}
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden h-full flex flex-col justify-center">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-pink-500/5 rounded-br-full blur-3xl -z-10"></div>

                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-pink-500">
                                <UploadCloud size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Görselinizi Analiz Edin</h3>
                            <p className="text-sm text-gray-500">Analiz etmek istediğiniz ürün görselinin linkini yapıştırın.</p>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-[#020617] border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white placeholder:text-gray-600 outline-none focus:border-pink-500 transition font-mono text-sm"
                                placeholder="https://..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">
                                <ImageIcon size={20} />
                            </div>
                        </div>

                        <button
                            onClick={analyze}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-pink-900/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <RefreshCw className="animate-spin" /> : <ScanEye />}
                            {loading ? "Görsel Taranıyor..." : "Denetimi Başlat"}
                        </button>
                    </div>
                </div>

                {/* VISUAL PREVIEW (Static Placeholder or User Input Image) */}
                <div className="hidden lg:flex items-center justify-center bg-[#020617] border border-white/5 rounded-3xl h-[400px] relative overflow-hidden group">
                    {input ? (
                        <img src={input} className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    ) : (
                        <div className="text-gray-700 flex flex-col items-center">
                            <ImageIcon size={64} className="mb-4 opacity-20" />
                            <span className="font-bold opacity-30">Önizleme</span>
                        </div>
                    )}

                    {/* Scanning Effect Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-pink-500/10 animate-pulse z-10 flex items-center justify-center">
                            <div className="w-full h-1 bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.8)] absolute animate-[scan_2s_ease-in-out_infinite]"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* RESULTS */}
            {report && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">

                    {/* SCORE & METRICS */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center text-4xl font-black mb-4 ${getScoreColor(report.score)} bg-white/5`}>
                                {report.score}
                            </div>
                            <h3 className="text-white font-bold">Genel Kalite Puanı</h3>
                            <p className="text-xs text-gray-500 mt-1">Yapay zeka estetik değerlendirmesi</p>
                        </div>

                        <div className="md:col-span-2 bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><ScanEye size={16} /> Teknik Analiz</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(report.analysis).map(([key, val]: [string, any]) => (
                                    <div key={key} className="bg-[#020617] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                        <div>
                                            <span className="text-gray-500 text-xs font-bold uppercase block mb-0.5">{key === 'lighting' ? 'Aydınlatma' : key === 'color' ? 'Renk Dengesi' : key === 'reflection' ? 'Yansıma' : key === 'ambiance' ? 'Ambiyans' : 'Lüks Algısı'}</span>
                                            <span className="text-gray-300 text-sm">{val.msg}</span>
                                        </div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded bg-white/5 ${val.status === 'İyi' ? 'text-green-500' : val.status === 'Orta' ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {val.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* ISSUES */}
                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-red-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><AlertTriangle size={16} /> Tespit Edilen Sorunlar</h3>
                            <ul className="space-y-3">
                                {report.issues.map((issue: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-300 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                                        <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        {issue}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* SUGGESTIONS */}
                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-blue-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><Lightbulb size={16} /> İyileştirme Önerileri</h3>
                            <ul className="space-y-3">
                                {report.suggestions.map((sug: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-300 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                        <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                        {sug}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* CONCEPTS */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-white/5 p-8 rounded-3xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Wand2 className="text-purple-500" />
                            Sizin İçin 5 Yaratıcı Konsept Önerisi
                        </h2>
                        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {report.concepts.map((concept: any, i: number) => (
                                <div key={i} className="bg-white/5 hover:bg-white/10 transition p-4 rounded-2xl border border-white/5 hover:border-purple-500/30 group">
                                    <div className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wider">{concept.vibe}</div>
                                    <h4 className="text-white font-bold mb-2 text-sm">{concept.title}</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">{concept.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
