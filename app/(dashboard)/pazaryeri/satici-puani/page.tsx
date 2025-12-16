"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingDown, Clock, Package, MessageCircle, AlertTriangle } from 'lucide-react';
import { getSellerScoreAction, SellerScoreData } from '@/app/actions/sellerScoreActions';

export default function SellerScorePage() {
    const [data, setData] = useState<SellerScoreData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadScore() { // Renamed loadScore to load for consistency with user's snippet
            try {
                const res = await getSellerScoreAction();
                setData(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadScore(); // Call loadScore
    }, []);

    if (loading) return <div className="p-8 text-white">Yükleniyor...</div>; // Updated loading state as per instruction

    if (!data) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-[#0B1120] text-gray-400 p-6 text-center">
                <ShieldCheck size={64} className="mb-4 text-gray-600" />
                <h2 className="text-xl font-bold text-white">Mağaza Bağlanamadı</h2>
                <p className="mt-2 text-sm">Satıcı puanınızı görmek için lütfen entegrasyon ayarlarından bir mağaza bağlayın.</p>
            </div>
        );
    }


    const { overallScore, metrics, suggestions: apiSuggestions } = data;

    const suggestions = [
        { title: "Paketlemeyi İyileştirin", impact: "+0.3 Puan", desc: "Son dönemde 'kutu ezik geldi' şikayetleri arttı. Kargo poşeti yerine kutu kullanımına geçmeyi değerlendirin.", type: 'critical' },
        { title: "Kargo Firmasını Değerlendirin", impact: "+0.1 Puan", desc: "Sürat Kargo ile yapılan gönderimlerde gecikme oranı %4 arttı. Alternatif firmaları inceleyin.", type: 'warning' },
    ];

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="text-indigo-500" /> Satıcı Puanı Analizi
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Mağaza performansınızı ve görünürlüğünüzü etkileyen metrikleri takip edin.</p>
                </div>
                <div className="px-4 py-2 bg-indigo-900/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-bold flex items-center gap-2">
                    <ShieldCheck size={18} /> Mağaza Durumu: Mükemmel
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left: Score Card */}
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-3xl"></div>
                    <div className="relative w-48 h-48 rounded-full border-8 border-gray-800 flex items-center justify-center mb-6">
                        <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-t-transparent animate-[spin_3s_linear_infinite]" style={{ transform: 'rotate(-45deg)' }}></div>
                        <div className="text-center">
                            <div className="text-6xl font-bold text-white">{overallScore}</div>
                            <div className="text-sm text-gray-400 mt-1">/ 10.0</div>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Harika Gidiyorsunuz!</h3>
                    <p className="text-gray-400 text-center text-sm px-4">
                        Satıcı puanınız rakiplerinizin <b className="text-white">%92'sinden daha yüksek.</b>
                        Bu performansı korursanız "Süper Satıcı" rozetini önümüzdeki ay alabilirsiniz.
                    </p>
                </div>

                {/* Middle: Metrics Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        {metrics.map((m, i) => (
                            <div key={i} className="bg-[#111827] border border-gray-800 p-5 rounded-xl hover:border-gray-700 transition">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-gray-800 rounded-lg">
                                        {m.name.includes("Kargo") ? <Clock size={16} className="text-blue-500" /> :
                                            m.name.includes("Paket") ? <Package size={16} className="text-orange-500" /> :
                                                m.name.includes("İletişim") ? <MessageCircle size={16} className="text-green-500" /> :
                                                    <TrendingDown size={16} className="text-purple-500" />}
                                    </div>
                                    <span className={`text-xl font-bold ${typeof m.score === 'number' && m.score >= 9 ? 'text-green-400' : typeof m.score === 'number' && m.score >= 8 ? 'text-yellow-400' : 'text-red-400'}`}>{m.score}</span>
                                </div>
                                <div className="font-bold text-white text-sm">{m.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                                {/* Mock Progress Bar */}
                                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className={`h-full rounded-full ${m.score >= 9 ? 'bg-green-500' : m.score >= 8 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${m.score * 10}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Suggestions Box */}
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-yellow-500" size={18} />
                            AI Puan İyileştirme Önerileri
                        </h4>
                        <div className="space-y-3">
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-[#0B1120] border border-gray-700 p-4 rounded-lg flex items-start gap-4">
                                    <div className={`shrink-0 w-2 h-full absolute left-0 top-0 bottom-0 rounded-l-lg ${s.type === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h5 className="font-bold text-white text-sm">{s.title}</h5>
                                            <span className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded">{s.impact}</span>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">{s.desc}</p>
                                    </div>
                                    <button className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition self-center">
                                        Detay
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
