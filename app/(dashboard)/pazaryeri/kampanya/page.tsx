"use client";
import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Tag, Timer, ArrowRight, Percent, CheckCircle2 } from 'lucide-react';
import { CampaignOpportunity, getCampaignOpportunitiesAction, joinCampaignAction } from '@/app/actions/campaignActions';
import { toast } from 'sonner';

export default function CampaignPage() {
    const [opportunities, setOpportunities] = useState<CampaignOpportunity[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOpportunities();
    }, []);

    const loadOpportunities = async () => {
        setLoading(true);
        try {
            const data = await getCampaignOpportunitiesAction();
            setOpportunities(data);
        } catch (e) {
            console.error(e);
            toast.error("Kampanya önerileri alınamadı");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinCampaign = async (id: number) => {
        const toastId = toast.loading("Kampanyaya katılım sağlanıyor...");
        try {
            await joinCampaignAction(id);
            setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status: 'joined' } : o));
            toast.success('Ürün kampanyaya eklendi!', { id: toastId });
        } catch (e) {
            toast.error('Hata oluştu', { id: toastId });
        }
    };

    const totalPotentialRevenue = opportunities.filter(o => o.status === 'new').reduce((a, b) => a + b.estimatedRevenue, 0);

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-pink-500" /> Kampanya Fırsatları
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Stok ve satış verilerine göre size özel hazırlanmış kampanya önerileri.</p>
                </div>
                <div className="bg-[#111827] border border-gray-800 px-6 py-2 rounded-xl flex flex-col items-end">
                    <span className="text-gray-500 text-xs uppercase font-bold">Potansiyel Ek Gelir</span>
                    <span className="text-xl font-bold text-green-400">+₺{totalPotentialRevenue.toLocaleString()}</span>
                </div>
            </div>

            {/* Opportunities Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-500 animate-pulse">Kampanya fırsatları taranıyor...</div>
                ) : opportunities.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">Şu an uygun bir kampanya fırsatı bulunamadı.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                        {opportunities.map(opp => (
                            <div key={opp.id} className={`bg-[#111827] border rounded-xl overflow-hidden transition relative ${opp.status === 'joined' ? 'border-green-900/50 opacity-75' : 'border-gray-800 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-900/10'}`}>
                                {opp.status === 'joined' && (
                                    <div className="absolute top-3 right-3 bg-green-900/80 text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                        <CheckCircle2 size={12} /> KATILDIN
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-2 py-1 bg-pink-900/20 text-pink-400 rounded text-xs font-bold uppercase tracking-wider">
                                            {opp.campaignName}
                                        </div>
                                        <div className="text-gray-500 text-xs flex items-center gap-1">
                                            <Timer size={12} /> Bitiş: {opp.endDate}
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-white mb-1 truncate" title={opp.productName}>{opp.productName}</h3>
                                    <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">{opp.description}</p>

                                    <div className="bg-[#0B1120] rounded-lg p-3 mb-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-gray-500 text-xs line-through">₺{opp.currentPrice}</div>
                                            <div className="text-xl font-bold text-white">₺{opp.discountedPrice.toFixed(2)}</div>
                                        </div>
                                        <div className="flex flex-col items-center p-2 bg-pink-600 rounded text-white font-bold leading-none">
                                            <span className="text-xs">%</span>
                                            <span className="text-lg">{opp.suggestedDiscount}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUp size={14} className="text-green-500" />
                                            <span>Satış Artışı: <b className="text-white">%{opp.upliftPercentage}</b></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Tag size={14} className="text-blue-500" />
                                            <span>Tahmini Adet: <b className="text-white">{opp.estimatedSales}</b></span>
                                        </div>
                                    </div>

                                    {opp.status === 'new' ? (
                                        <button
                                            onClick={() => handleJoinCampaign(opp.id)}
                                            className="w-full py-2.5 bg-gray-800 hover:bg-pink-600 hover:text-white text-gray-300 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 group"
                                        >
                                            Kampanyaya Katıl <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <button className="w-full py-2.5 border border-green-500/30 bg-green-900/10 text-green-500 rounded-lg text-sm font-bold cursor-default">
                                            Planlandı
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
