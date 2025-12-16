"use client";

import { competitorAdAnalysisAction } from '@/app/actions/marketingActions';

import { useState } from 'react';
import {
    Search, Rocket, Target, Zap,
    BarChart3, Brain, ArrowRight, CheckCircle2,
    Eye, Megaphone, Smartphone, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'sonner';

export default function CompetitorAdAnalysisPage() {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);

    async function analyze() {
        if (!input) return toast.error("Lütfen bir marka adı veya link girin.");

        setLoading(true);
        setReport(null);

        try {
            const data = await competitorAdAnalysisAction(input);
            setReport(data);
            toast.success("Analiz tamamlandı!");
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 mb-2">
                        Rakip Reklam Zekası
                    </h1>
                    <p className="text-gray-400">Yapay zeka ile rakiplerinizin reklam stratejilerini saniyeler içinde çözün.</p>
                </div>
            </div>

            {/* INPUT SECTION */}
            <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-bl-full blur-3xl -z-10"></div>

                <div className="max-w-2xl mx-auto text-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-gray-500" />
                        </div>
                        <input
                            type="text"
                            className="w-full bg-[#020617] border border-white/10 rounded-2xl pl-12 pr-4 py-5 text-white placeholder:text-gray-600 outline-none focus:border-blue-500 transition shadow-xl"
                            placeholder="Rakip Marka Adı veya Instagram/Web Sitesi Linki..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && analyze()}
                        />
                    </div>

                    <button
                        onClick={analyze}
                        disabled={loading}
                        className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                    >
                        {loading ? <RefreshCw className="animate-spin" /> : <Rocket />}
                        {loading ? "Analiz Ediliyor..." : "Stratejiyi Analiz Et"}
                    </button>
                </div>
            </div>

            {/* REPORT SECTION */}
            {report && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">

                    {/* 1. ÖZET CARD */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <Brain className="text-blue-400" /> {report.brandName} Strateji Özeti
                        </h2>
                        <p className="text-gray-300 leading-relaxed">{report.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 2. REKLAM MESAJLARI */}
                        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><Megaphone size={16} /> Reklam Mesaj Analizi</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm font-bold text-white mb-2">Öne Çıkan Sloganlar</div>
                                    <div className="flex flex-wrap gap-2">
                                        {report.adAnalysis.messages.map((m: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">"{m}"</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#020617] p-3 rounded-xl border border-white/5">
                                        <div className="text-xs text-gray-500 mb-1">Ton & Dil</div>
                                        <div className="text-white text-sm font-medium">{report.adAnalysis.tone}</div>
                                    </div>
                                    <div className="bg-[#020617] p-3 rounded-xl border border-white/5">
                                        <div className="text-xs text-gray-500 mb-1">Aktif Kanallar</div>
                                        <div className="text-white text-sm font-medium">{report.adAnalysis.channels.length} Kanal</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. KREATIF ANALIZI */}
                        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><Eye size={16} /> Tasarım & Kreatif</h3>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-sm text-gray-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></span>
                                    <span><strong className="text-white">Görsel Stil:</strong> {report.creativeAnalysis.style}</span>
                                </li>
                                <li className="flex gap-3 text-sm text-gray-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></span>
                                    <span><strong className="text-white">İçerik Tipi:</strong> {report.creativeAnalysis.visuals}</span>
                                </li>
                                <li className="flex gap-3 text-sm text-gray-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></span>
                                    <span><strong className="text-white">Video Stratejisi:</strong> {report.creativeAnalysis.videoStrategy}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 4. HEDEF KITLE */}
                        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl lg:col-span-1">
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><Target size={16} /> Hedef Kitle</h3>
                            <div className="text-2xl font-bold text-white mb-2">{report.audience.primary}</div>
                            <div className="flex flex-wrap gap-1 mb-4">
                                {report.audience.interests.map((int: string, i: number) => (
                                    <span key={i} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{int}</span>
                                ))}
                            </div>
                            <p className="text-sm text-gray-400">
                                <strong className="text-gray-300">Temel Ağrı Noktası:</strong> {report.audience.painPoints}
                            </p>
                        </div>

                        {/* 5. KAMPANYA RITMI & 6. FIRSATLAR */}
                        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl lg:col-span-2">
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><Zap size={16} /> Fırsat Alanları & Ritim</h3>
                            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-200">
                                <strong className="block mb-1 text-yellow-400">Kampanya Döngüsü</strong>
                                {report.campaignRhythm}
                            </div>
                            <div className="grid md:grid-cols-3 gap-3">
                                {report.opportunities.map((opp: string, i: number) => (
                                    <div key={i} className="p-3 bg-[#020617] rounded-xl border border-green-500/10 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500 opacity-50"></div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{opp}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 7. SWOT ANALIZI */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><BarChart3 size={100} /></div>
                            <h3 className="text-green-400 font-bold uppercase text-sm mb-4">Rakibin Güçlü Yönleri</h3>
                            <ul className="space-y-2">
                                {report.swot.strengths.map((s: string, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-green-500 shrink-0" /> {s}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Layers size={100} /></div>
                            <h3 className="text-red-400 font-bold uppercase text-sm mb-4">Rakibin Zayıf Yönleri</h3>
                            <ul className="space-y-2">
                                {report.swot.weaknesses.map((w: string, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-300"><ArrowRight size={16} className="text-red-500 shrink-0" /> {w}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 8. AKSIYON PLANI */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-blue-500/20 p-8 rounded-3xl">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">10</div>
                            Maddelik Aksiyon Planı
                        </h2>
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                            {report.actionPlan.map((action: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start p-3 hover:bg-white/5 rounded-xl transition">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                                    <p className="text-sm text-gray-300 leading-relaxed font-medium">{action}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
