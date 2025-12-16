"use client";

import { analyzeReviewsAction } from '@/app/actions/marketingActions';

import { useState } from 'react';
import {
    MessageSquareQuote, ThumbsUp, ThumbsDown, TrendingUp,
    Lightbulb, Megaphone, CheckCircle2, AlertOctagon,
    BarChart3, RefreshCw, PenTool, PieChart, FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewAnalysisPage() {
    const [reviews, setReviews] = useState("");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);

    async function analyze() {
        if (!reviews) return toast.error("Lütfen analiz edilecek yorumları yapıştırın.");
        if (reviews.length < 50) return toast.error("Daha doğru analiz için lütfen daha fazla içerik girin.");

        setLoading(true);
        setReport(null);

        try {
            const data = await analyzeReviewsAction(reviews);
            setReport(data);
            toast.success("Yorum analizi tamamlandı!");
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
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-2">
                        Müşteri Sesi Analisti 🗣️
                    </h1>
                    <p className="text-gray-400">Yığınla yorumu saniyeler içinde anlamlı içgörülere dönüştürün.</p>
                </div>
            </div>

            {/* INPUT SECTION */}
            <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-violet-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-bl-full blur-3xl -z-10"></div>

                <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-500 ml-1">Müşteri Yorumları</label>
                    <textarea
                        className="w-full bg-[#020617] border border-white/10 rounded-2xl p-6 text-white placeholder:text-gray-600 outline-none focus:border-violet-500 transition h-48 resize-none font-mono text-sm leading-relaxed"
                        placeholder="Pazaryeri, web sitesi veya sosyal medya yorumlarını buraya topluca yapıştırın..."
                        value={reviews}
                        onChange={(e) => setReviews(e.target.value)}
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={analyze}
                            disabled={loading}
                            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20"
                        >
                            {loading ? <RefreshCw className="animate-spin" /> : <BarChart3 />}
                            {loading ? "Veriler İşleniyor..." : "İçgörüleri Çıkar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* RESULTS */}
            {report && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">

                    {/* SENTIMENT OVERVIEW */}
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 bg-[#0F172A] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="#1e293b" strokeWidth="12" fill="none" />
                                    <circle cx="64" cy="64" r="56" stroke={report.sentiment.score >= 70 ? "#10b981" : report.sentiment.score >= 50 ? "#eab308" : "#ef4444"} strokeWidth="12" fill="none" strokeDasharray={`${report.sentiment.score * 3.51} 351`} className="transition-all duration-1000 ease-out" />
                                </svg>
                                <span className="absolute text-3xl font-black text-white">{report.sentiment.score}</span>
                            </div>
                            <h3 className="text-white font-bold mb-1">Duygu Skoru (NPS)</h3>
                            <div className="flex gap-2 text-xs font-bold mt-2">
                                <span className="text-green-500">%{report.sentiment.positive} Pozitif</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-red-500">%{report.sentiment.negative} Negatif</span>
                            </div>
                        </div>

                        <div className="md:col-span-3 grid md:grid-cols-2 gap-6">
                            {/* COMPLAINTS */}
                            <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                                <h3 className="text-red-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><ThumbsDown size={16} /> En Sık Şikayet Edilenler</h3>
                                <ul className="space-y-2 h-48 overflow-y-auto custom-scrollbar pr-2">
                                    {report.complaints.map((c: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-300 flex gap-2 items-start py-1 border-b border-white/5 last:border-0">
                                            <span className="text-red-500 font-bold text-xs mt-0.5">{i + 1}.</span> {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* LIKES */}
                            <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                                <h3 className="text-green-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><ThumbsUp size={16} /> En Çok Beğenilenler</h3>
                                <ul className="space-y-2 h-48 overflow-y-auto custom-scrollbar pr-2">
                                    {report.likes.map((l: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-300 flex gap-2 items-start py-1 border-b border-white/5 last:border-0">
                                            <span className="text-green-500 font-bold text-xs mt-0.5">{i + 1}.</span> {l}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* STRATEGY & ACTIONS */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8">
                            <h3 className="text-blue-400 font-bold text-lg mb-6 flex items-center gap-2"><Lightbulb /> Geliştirme Önerileri</h3>
                            <div className="space-y-4">
                                {report.suggestions.map((s: string, i: number) => (
                                    <div key={i} className="flex gap-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                        <p className="text-sm text-gray-300">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8">
                            <h3 className="text-purple-400 font-bold text-lg mb-6 flex items-center gap-2"><Megaphone /> Pazarlama Fırsatları</h3>
                            <div className="space-y-4">
                                {report.marketingOpportunities.map((m: string, i: number) => (
                                    <div key={i} className="flex gap-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                        <p className="text-sm text-gray-300">{m}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PR SUMMARY */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-white/5 p-8 rounded-3xl">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-gray-400" /> Otomatik PR Özeti</h3>
                        <div className="bg-black/30 p-6 rounded-2xl border border-white/10 relative">
                            <p className="text-gray-300 leading-relaxed font-serif italic text-lg">"{report.prSummary}"</p>
                            <div className="absolute top-4 right-4 text-gray-600">
                                <MessageSquareQuote size={48} className="opacity-20" />
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
