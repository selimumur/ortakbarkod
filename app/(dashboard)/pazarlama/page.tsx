"use client";

import {
    Zap, TrendingUp, Search, RefreshCw,
    Calculator, Wand2, Copy, Activity,
    LineChart, Swords, Target, CalendarDays,
    Rocket, Brain, BarChart3, Globe,
    CheckCircle2, XCircle, AlertTriangle, MoveRight,
    TrendingDown, Percent, Trophy, Package, Wallet, PieChart,
    Smartphone, Share2, MousePointerClick, Megaphone,
    Image, Palette, Camera, Lightbulb, UserCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    analyzeCompetitorAction,
    getMarketingProductsAction,
    getSalesBoosterInsightsAction,
    generateMarketingContentAction,
    MarketingProduct
} from '@/app/actions/marketingActions';
import { useEffect, useState } from 'react';

export default function MarketingPage() {
    const [activeTab, setActiveTab] = useState("Rakip Analizi");

    // --- COMPETITOR ANALYSIS STATE ---
    const [competitorUrl, setCompetitorUrl] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    async function analyzeCompetitor() {
        if (!competitorUrl.includes('trendyol')) return toast.error("Geçerli bir Trendyol mağaza linki girin.");

        setAnalyzing(true);
        try {
            const data = await analyzeCompetitorAction(competitorUrl);
            setAnalysisResult(data);
            toast.success("Analiz Tamamlandı!");
        } catch (e) {
            toast.error("Analiz servisine ulaşılamadı.");
        } finally {
            setAnalyzing(false);
        }
    }

    // --- PRICE SIMULATOR STATE ---
    const [products, setProducts] = useState<MarketingProduct[]>([]);
    const [simSelected, setSimSelected] = useState<MarketingProduct | null>(null);
    const [simPrice, setSimPrice] = useState(0);
    const [simCommission, setSimCommission] = useState(21);
    const [simCargo, setSimCargo] = useState(50);
    const [simAds, setSimAds] = useState(0);

    // --- BOOSTER STATE ---
    const [boosterData, setBoosterData] = useState<any>(null);


    useEffect(() => {
        if ((activeTab === "Fiyat Simülatörü" || activeTab === "AI İçerik" || activeTab === "Sosyal Medya" || activeTab === "Görsel Fikirleri") && products.length === 0) {
            fetchProducts();
        }
        if (activeTab === "Satış Artırıcı" && !boosterData) {
            fetchBooster();
        }
    }, [activeTab]);

    async function fetchProducts() {
        try {
            const data = await getMarketingProductsAction();
            setProducts(data);
        } catch (error: any) {
            console.error("Ürünler yüklenirken hata:", error);
            toast.error("Ürün listesi yüklenemedi.");
        }
    }

    async function fetchBooster() {
        try {
            const data = await getSalesBoosterInsightsAction();
            setBoosterData(data);
        } catch (e) {
            console.error(e);
        }
    }

    const calculateProfit = () => {
        if (!simSelected) return { netProfit: 0, margin: 0, totalCost: 0, commissionAmount: 0, breakeven: 0 };

        const cost = simSelected.cost_price || 0;
        const commissionAmount = simPrice * (simCommission / 100);
        const adsAmount = simPrice * (simAds / 100); // Ads as percentage of sale price
        const totalDeductions = cost + simCargo + commissionAmount + adsAmount;

        const netProfit = simPrice - totalDeductions;
        const margin = simPrice > 0 ? (netProfit / simPrice) * 100 : 0;

        // Breakeven Point Calculation: Cost + Cargo / (1 - (Commission% + Ads%))
        // P = C + F + (P * r)  => P - P*r = C + F => P(1-r) = C + F => P = (C+F) / (1-r)
        const variableRate = (simCommission + simAds) / 100;
        const breakeven = (cost + simCargo) / (1 - variableRate);

        return {
            netProfit,
            margin,
            totalCost: cost,
            commissionAmount,
            adsAmount,
            breakeven: breakeven > 0 ? breakeven : 0
        };
    };
    const simResult = calculateProfit();

    // --- MOCK CAMPAIGN DATA ---
    const campaigns = [
        { name: "Mega Eylül İndirimleri", date: "15-20 Eylül", status: "Yaklaşıyor", urgency: "high" },
        { name: "Okula Dönüş", date: "1-10 Eylül", status: "Aktif", urgency: "medium" },
        { name: "Büyük Ekim Fırsatları", date: "10-15 Ekim", status: "Planlanıyor", urgency: "low" },
    ];

    return (
        <div className="w-full h-full bg-[#020617] overflow-y-auto custom-scrollbar">

            {/* HEADER */}
            <header className="px-8 py-8 border-b border-white/5 bg-[#020617] sticky top-0 z-20 backdrop-blur-xl bg-opacity-80">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                                <Rocket size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Pazarlama Zekası</h1>
                        </div>
                        <p className="text-gray-400 text-sm font-medium pl-1">Yapay zeka destekli rakip analizi ve büyüme araçları.</p>
                    </div>

                    <div className="hidden md:flex items-center gap-4 bg-[#0F172A] p-2 pr-6 rounded-2xl border border-white/5">
                        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 animate-pulse">
                            <Activity size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mağaza Skoru</div>
                            <div className="text-xl font-black text-white">9.8<span className="text-sm text-gray-500 font-medium">/10</span></div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-8">

                {/* TABS */}
                <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
                    {[
                        { id: "Rakip Analizi", icon: Swords },
                        { id: "Satış Artırıcı", icon: TrendingUp },
                        { id: "Kampanya Takvimi", icon: CalendarDays },
                        { id: "Fiyat Simülatörü", icon: Calculator },
                        { id: "AI İçerik", icon: Wand2 },
                        { id: "Sosyal Medya", icon: Smartphone },
                        { id: "Görsel Fikirleri", icon: Palette },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === tab.id ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20" : "bg-[#0F172A] border-white/5 text-gray-400 hover:text-white hover:border-white/10"}`}
                        >
                            <tab.icon size={16} /> {tab.id}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* --- COMPETITOR ANALYSIS --- */}
                    {activeTab === "Rakip Analizi" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* INPUT SECTION */}
                            <div className="lg:col-span-12">
                                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-bl-full blur-3xl -z-10 group-hover:bg-indigo-600/20 transition-colors"></div>

                                    <div className="max-w-3xl mx-auto text-center space-y-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
                                            <Brain size={12} /> AI Detective v2.0
                                        </div>
                                        <h2 className="text-3xl font-bold text-white">Rakibini Tanı, Stratejini Belirle.</h2>
                                        <p className="text-gray-400 max-w-xl mx-auto">Rakip mağazanın Trendyol linkini yapıştırın. Yapay zekamız onların zayıf noktalarını, en çok satan stratejilerini ve sizin fırsat alanlarınızı analiz etsin.</p>

                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="https://www.trendyol.com/magaza/..."
                                                    value={competitorUrl}
                                                    onChange={e => setCompetitorUrl(e.target.value)}
                                                    className="w-full h-14 bg-[#020617] border-2 border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-indigo-500 focus:ring-0 outline-none transition font-medium"
                                                />
                                            </div>
                                            <button
                                                onClick={analyzeCompetitor}
                                                disabled={analyzing}
                                                className="h-14 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-base flex items-center gap-2 min-w-[140px] justify-center transition shadow-xl shadow-indigo-900/20"
                                            >
                                                {analyzing ? <RefreshCw className="animate-spin" /> : <Zap fill="currentColor" />}
                                                {analyzing ? "Taranıyor..." : "Analiz Et"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RESULTS SECTION */}
                            {analysisResult && (
                                <>
                                    {/* SCORE CARD */}
                                    <div className="lg:col-span-4 space-y-6">
                                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-6 opacity-10"><Trophy size={64} /></div>
                                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Genel Mağaza Skoru</h3>
                                            <div className="flex items-end gap-2 mb-6">
                                                <span className="text-6xl font-black text-white tracking-tighter">{analysisResult.score}</span>
                                                <span className="text-xl font-bold text-gray-500 mb-2">/100</span>
                                            </div>

                                            <div className="space-y-4">
                                                <MetricRow label="Takipçi Sayısı" value={analysisResult.metrics.followers.toLocaleString()} icon={Globe} color="text-blue-400" />
                                                <MetricRow label="Ürün Sayısı" value={analysisResult.metrics.productCount} icon={Package} color="text-purple-400" />
                                                <MetricRow label="Ort. Puan" value={analysisResult.metrics.reviewAvg} icon={Target} color="text-yellow-400" />
                                                <MetricRow label="Cevap Hızı" value={analysisResult.metrics.responseSpeed} icon={Zap} color="text-green-400" />
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 rounded-3xl p-6">
                                            <h3 className="text-indigo-200 font-bold mb-3 flex items-center gap-2"><Brain size={18} /> Yapay Zeka Önerisi</h3>
                                            <p className="text-indigo-100/80 text-sm leading-relaxed italic">
                                                "{analysisResult.aiSuggestion}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* SWOT ANALYSIS */}
                                    <div className="lg:col-span-8">
                                        <div className="grid grid-cols-2 gap-4 h-full">
                                            <SwotBox title="Güçlü Yönler (Strengths)" items={analysisResult.swot.strengths} type="success" />
                                            <SwotBox title="Zayıf Yönler (Weaknesses)" items={analysisResult.swot.weaknesses} type="danger" />
                                            <SwotBox title="Fırsatlar (Opportunities)" items={analysisResult.swot.opportunities} type="info" />
                                            <SwotBox title="Tehditler (Threats)" items={analysisResult.swot.threats} type="warning" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* --- SALES BOOSTER (SATIŞ ARTIRICI) --- */}
                    {activeTab === "Satış Artırıcı" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 animate-in fade-in">

                            {/* BUYBOX RADAR */}
                            <div className="lg:col-span-12">
                                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500"><Trophy size={18} /></span>
                                        Buybox Radarı
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-400">
                                            <thead className="text-[10px] uppercase font-bold text-gray-500 bg-white/5 rounded-lg">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-lg">Ürün</th>
                                                    <th className="px-4 py-3">Sizin Fiyat</th>
                                                    <th className="px-4 py-3">Kazanan Fiyat</th>
                                                    <th className="px-4 py-3">Fark</th>
                                                    <th className="px-4 py-3 text-right rounded-r-lg">Aksiyon</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {boosterData?.buybox?.map((item: any, i: number) => (
                                                    <tr key={i} className="hover:bg-white/5 transition">
                                                        <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                                                        <td className="px-4 py-4">₺{item.myPrice}</td>
                                                        <td className="px-4 py-4 text-green-400 font-bold">₺{item.winPrice}</td>
                                                        <td className="px-4 py-4 text-red-400">₺{item.diff}</td>
                                                        <td className="px-4 py-4 text-right">
                                                            <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition">
                                                                Fiyatı Eşitle
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!boosterData?.buybox || boosterData.buybox.length === 0) && (
                                                    <tr><td colSpan={5} className="p-4 text-center">Rekabet verisi bulunamadı.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* SEO HEALTH CHECK */}
                            <div className="lg:col-span-6">
                                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 h-full">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Search size={18} /></span>
                                        SEO Sağlık Taraması
                                    </h3>
                                    <div className="space-y-4">
                                        {boosterData?.seo?.map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-[#020617] rounded-xl border border-white/5 flex gap-4 items-start">
                                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.type === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                <div>
                                                    <div className="text-white font-bold text-sm">{item.name}</div>
                                                    <div className="text-gray-400 text-xs mt-1">{item.reason}</div>
                                                    <button className="mt-3 text-xs text-blue-400 font-bold hover:underline">{item.action} &rarr;</button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!boosterData?.seo || boosterData.seo.length === 0) && (
                                            <div className="text-gray-500 text-sm text-center">Harika! SEO sorunu bulunamadı.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* OPPORTUNITY FINDER */}
                            <div className="lg:col-span-6">
                                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 h-full">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500"><TrendingUp size={18} /></span>
                                        Fırsat Ürünleri (Yüksek Stok / Düşük Fiyat)
                                    </h3>
                                    <div className="space-y-4">
                                        {boosterData?.opportunities?.map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-[#020617] rounded-xl border border-white/5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="text-white font-bold text-sm">{item.name}</div>
                                                    <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1"><Zap size={10} /> Fırsat</span>
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-500 mb-3 ml-1">
                                                    <span className="flex items-center gap-1"><Package size={12} /> {item.metric}</span>
                                                </div>
                                                <div className="text-xs text-indigo-300 bg-indigo-500/10 p-2 rounded border border-indigo-500/20 italic">
                                                    💡 Öneri: {item.action}
                                                </div>
                                            </div>
                                        ))}
                                        {(!boosterData?.opportunities || boosterData.opportunities.length === 0) && (
                                            <div className="text-gray-500 text-sm text-center">Şu an için fırsat önerisi yok.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- CAMPAIGN CALENDAR --- */}
                    {activeTab === "Kampanya Takvimi" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((camp, i) => (
                                <div key={i} className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition group relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 w-1 h-full ${camp.urgency === 'high' ? 'bg-red-500' : camp.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    <div className="flex justify-between items-start mb-4 pl-3">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{camp.date}</div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${camp.status === 'Aktif' ? 'bg-green-500/10 text-green-500' : 'bg-gray-800 text-gray-400'}`}>{camp.status}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 pl-3 group-hover:text-indigo-400 transition">{camp.name}</h3>
                                    <p className="text-sm text-gray-400 pl-3 mb-6">Bu kampanya döneminde satışların ortalama %40 artması bekleniyor.</p>

                                    <button className="w-full py-3 bg-[#1E293B] hover:bg-[#283548] text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                                        Kurgu Oluştur <MoveRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- PRICE SIMULATOR --- */}
                    {activeTab === "Fiyat Simülatörü" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                            {/* LEFT: INPUTS */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Calculator size={18} /></span>
                                        Hesaplama Parametreleri
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Ürün Seçimi</label>
                                            <ProductSelector
                                                products={products}
                                                selectedId={simSelected?.id}
                                                onSelect={p => {
                                                    setSimSelected(p);
                                                    if (p) setSimPrice(Math.ceil((p.cost_price || 100) * 1.6));
                                                }}
                                            />
                                        </div>

                                        {simSelected && (
                                            <>
                                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex justify-between items-center mb-2">
                                                    <span className="text-blue-400 text-xs font-bold">Üretim Maliyeti</span>
                                                    <span className="text-white font-mono font-bold">₺{simSelected.cost_price?.toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Satış Fiyatı (TL)</label>
                                                        <input type="number" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-indigo-500 transition" value={simPrice} onChange={e => setSimPrice(Number(e.target.value))} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Komisyon (%)</label>
                                                        <input type="number" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-indigo-500 transition" value={simCommission} onChange={e => setSimCommission(Number(e.target.value))} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Kargo (TL)</label>
                                                        <input type="number" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-indigo-500 transition" value={simCargo} onChange={e => setSimCargo(Number(e.target.value))} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Reklam (%)</label>
                                                        <input type="number" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-indigo-500 transition" value={simAds} onChange={e => setSimAds(Number(e.target.value))} />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: RESULTS */}
                            <div className="lg:col-span-7">
                                {simSelected ? (
                                    <div className="h-full flex flex-col gap-6">
                                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex-1 flex flex-col justify-center items-center text-center">
                                            <div className={`absolute top-0 left-0 w-full h-2 ${simResult.netProfit > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <h4 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">TAHMİNİ NET KÂR</h4>
                                            <div className={`text-6xl font-black tracking-tighter mb-4 ${simResult.netProfit > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                {simResult.netProfit > 0 ? '+' : ''}₺{simResult.netProfit.toFixed(2)}
                                            </div>
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${simResult.netProfit > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                Marj: %{simResult.margin.toFixed(1)}
                                            </div>
                                        </div>
                                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 relative">
                                            <div className="text-xs text-gray-500 font-bold uppercase mb-2">BAŞA BAŞ NOKTASI</div>
                                            <div className="text-3xl font-black text-white">₺{simResult.breakeven.toFixed(2)}</div>
                                            <p className="text-xs text-gray-400 mt-2">Zarar etmemek için minimum satış fiyatı.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full bg-[#0F172A] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 border-dashed border-2 border-gray-800">
                                        <Wallet size={64} className="opacity-20 mb-6" />
                                        <h3 className="text-xl font-bold text-gray-500">Lütfen önce bir ürün seçin.</h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- AI CONTENT STUDIO --- */}
                    {activeTab === "AI İçerik" && (<AIContentStudio products={products} />)}

                    {/* --- SOCIAL MEDIA CENTER --- */}
                    {activeTab === "Sosyal Medya" && (<SocialMediaCenter products={products} />)}

                    {/* --- VISUAL IDEA GENERATOR --- */}
                    {activeTab === "Görsel Fikirleri" && (<VisualIdeaGenerator products={products} />)}

                    {/* --- PLACEHOLDERS FOR OTHER TABS --- */}
                    {(activeTab !== "Rakip Analizi" && activeTab !== "Kampanya Takvimi" && activeTab !== "Satış Artırıcı" && activeTab !== "Fiyat Simülatörü" && activeTab !== "AI İçerik" && activeTab !== "Sosyal Medya" && activeTab !== "Görsel Fikirleri") && (
                        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-[#0F172A]/50">
                            <h3 className="text-xl font-bold text-white mb-2">{activeTab} Modülü Hazırlanıyor</h3>
                            <p className="text-gray-500 max-w-md">Çok yakında hizmetinizde.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-component to keep default export clean
function AIContentStudio({ products }: { products: any[] }) {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [tone, setTone] = useState("Resmi");
    const [keywords, setKeywords] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    async function generate() {
        if (!selectedProduct) return toast.error("Ürün seçin.");
        setLoading(true);
        try {
            const data = await generateMarketingContentAction('content', {
                productName: selectedProduct.name,
                tone,
                keywords
            });
            setResult(data);
        } catch (e) { toast.error("Hata oluştu."); }
        setLoading(false);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Wand2 className="text-purple-500" /> İçerik Sihirbazı</h3>
                    <div className="space-y-4">
                        <div>
                            <ProductSelector
                                products={products}
                                selectedId={selectedProduct?.id}
                                onSelect={p => setSelectedProduct(p)}
                                label="Ürün"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Hedef Kelimeler</label>
                            <input className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white text-sm outline-none" placeholder="Örn: Ahşap, Modern, Dayanıklı" value={keywords} onChange={e => setKeywords(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Ton</label>
                            <div className="grid grid-cols-2 gap-2">
                                {["Resmi", "Coşkulu", "Aciliyet", "Samimi"].map(t => (
                                    <button key={t} onClick={() => setTone(t)} className={`p-2 rounded-lg text-xs font-bold border transition ${tone === t ? 'bg-purple-500 text-white border-purple-500' : 'bg-[#020617] border-white/10 text-gray-400'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <button onClick={generate} disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                            {loading ? <RefreshCw className="animate-spin" /> : <Zap fill="currentColor" />} Oluştur
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8">
                {result ? (
                    <div className="h-full flex flex-col gap-6">
                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{result.title}</h3>
                                    <div className="flex gap-2 mt-2">
                                        {result.tags.map((t: string, i: number) => <span key={i} className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded-full border border-white/5">#{t}</span>)}
                                    </div>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(result.description); toast.success("Kopyalandı") }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"><Copy size={18} /></button>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none p-4 bg-[#020617] rounded-xl border border-white/5 min-h-[300px] [&_*]:text-gray-300 [&_h2]:text-white [&_strong]:text-white [&_li]:text-gray-300 [&_li_span]:text-gray-300" dangerouslySetInnerHTML={{ __html: result.description }}></div>
                        </div>

                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Brain size={14} /> AI Kritik</h4>
                            <div className="space-y-3">
                                {result.critique.map((c: any, i: number) => (
                                    <div key={i} className="flex gap-3 text-sm items-start">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${c.type === 'warning' ? 'bg-yellow-500' : c.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                        <span className="text-gray-300">{c.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-[#0F172A] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 border-dashed border-2 border-gray-800">
                        <Wand2 size={64} className="opacity-20 mb-6" />
                        <p>Sol taraftan ayarları seçip "Oluştur" butonuna basın.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function MetricRow({ label, value, icon: Icon, color }: any) {
    return (
        <div className="flex items-center justify-between p-3 bg-[#020617] rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={16} /></div>
                <span className="text-sm text-gray-400 font-medium">{label}</span>
            </div>
            <span className="text-white font-bold">{value}</span>
        </div>
    )
}

function SwotBox({ title, items, type }: any) {
    const colors = {
        success: "text-green-400 bg-green-500/10 border-green-500/20",
        danger: "text-red-400 bg-red-500/10 border-red-500/20",
        info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        warning: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    }
    // @ts-ignore
    const myColor = colors[type];

    return (
        <div className={`p-6 rounded-3xl border ${myColor.split(' ')[2]} bg-[#0F172A] relative group hover:bg-[#131c31] transition`}>
            <h4 className={`font-bold uppercase tracking-wider text-xs mb-4 ${myColor.split(' ')[0]}`}>{title}</h4>
            <ul className="space-y-3">
                {items.map((item: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${myColor.split(' ')[1].replace('/10', '')}`}></div>
                        <span className="leading-relaxed">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function VisualIdeaGenerator({ products }: { products: any[] }) {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [features, setFeatures] = useState("");
    const [audience, setAudience] = useState("");
    const [platform, setPlatform] = useState("Instagram");
    const [loading, setLoading] = useState(false);
    const [ideas, setIdeas] = useState<any[]>([]);

    async function generate() {
        if (!selectedProduct) return toast.error("Lütfen bir ürün seçin.");
        setLoading(true);
        try {
            // Using existing action for visuals as well
            const data = await generateMarketingContentAction('visual', {
                productName: selectedProduct.name,
                features,
                audience,
                platform
            });
            setIdeas(data || []);
        } catch (e) {
            toast.error("Fikirler oluşturulamadı.");
        }
        setLoading(false);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
            {/* INPUTS */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Palette className="text-cyan-500" /> Görsel Fikir Stüdyosu</h3>

                    <div className="space-y-4">
                        <ProductSelector
                            products={products}
                            selectedId={selectedProduct?.id}
                            onSelect={p => {
                                setSelectedProduct(p);
                                // Auto-fill if empty
                                if (!features && p.description) setFeatures(p.description.substring(0, 100) + "...");
                            }}
                            label="Ürün Seçimi"
                        />

                        {selectedProduct?.image_url && (
                            <img src={selectedProduct.image_url} className="w-20 h-20 object-cover rounded-xl border border-white/10 mb-2" alt="Preview" />
                        )}

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Öne Çıkan Özellikler</label>
                            <textarea
                                className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white text-sm outline-none h-24"
                                placeholder="Örn: Su geçirmez, Bambu kapak, Isıya dayanıklı..."
                                value={features}
                                onChange={e => setFeatures(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Hedef Kitle</label>
                            <div className="relative">
                                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    className="w-full bg-[#020617] border border-white/10 rounded-xl pl-10 pr-3 py-3 text-white text-sm outline-none"
                                    placeholder="Örn: Gen Z, Ofis Çalışanları..."
                                    value={audience}
                                    onChange={e => setAudience(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Platform</label>
                            <select className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white text-sm outline-none" value={platform} onChange={e => setPlatform(e.target.value)}>
                                <option>Instagram</option>
                                <option>TikTok</option>
                                <option>Facebook</option>
                                <option>Google Display</option>
                            </select>
                        </div>

                        <button onClick={generate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 transition">
                            {loading ? <RefreshCw className="animate-spin" /> : <Lightbulb fill="currentColor" />}
                            Fikirleri Üret
                        </button>
                    </div>
                </div>
            </div>

            {/* RESULTS */}
            <div className="lg:col-span-8">
                {ideas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ideas.map((idea, i) => (
                            <div key={i} className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 hover:border-cyan-500/30 transition group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full blur-2xl -z-10 group-hover:bg-cyan-500/10 transition"></div>

                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs border border-cyan-500/40">{i + 1}</span>
                                    {idea.title}
                                </h4>

                                <div className="space-y-3 mb-6">
                                    <div className="flex gap-3 text-sm items-start">
                                        <Camera size={16} className="text-gray-500 mt-1 flex-shrink-0" />
                                        <div>
                                            <span className="text-gray-500 font-bold block text-xs uppercase">Kamera & Işık</span>
                                            <span className="text-gray-300">{idea.visuals}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-sm items-start">
                                        <Image size={16} className="text-gray-500 mt-1 flex-shrink-0" />
                                        <div>
                                            <span className="text-gray-500 font-bold block text-xs uppercase">Sahne & Dekor</span>
                                            <span className="text-gray-300">{idea.scene}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-sm items-start">
                                        <Palette size={16} className="text-gray-500 mt-1 flex-shrink-0" />
                                        <div>
                                            <span className="text-gray-500 font-bold block text-xs uppercase">Renk Paleti</span>
                                            <span className="text-gray-300">{idea.palette}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#020617] p-3 rounded-xl border border-white/10 mb-4">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Müşteri Mesajı / Başlık</div>
                                    <div className="text-white font-medium italic">"{idea.headline}"</div>
                                </div>

                                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(idea, null, 2)); toast.success("Fikir kopyalandı!") }} className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
                                    <Copy size={16} /> Tasarımcıya Gönder
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full bg-[#0F172A] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 border-dashed border-2 border-gray-800 min-h-[400px]">
                        <Palette size={64} className="opacity-20 mb-6" />
                        <h3 className="text-xl font-bold text-gray-500">Henüz Fikir Yok</h3>
                        <p className="max-w-xs text-center mt-2 opacity-50">Soldaki panelden ürün ve özellik girin, yapay zeka sizin için tasarım konseptleri oluştursun.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function SocialMediaCenter({ products }: { products: any[] }) {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [platform, setPlatform] = useState("instagram_feed");
    const [goal, setGoal] = useState("sales");
    const [tone, setTone] = useState("Coşkulu");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    async function generate() {
        if (!selectedProduct) return toast.error("Lütfen bir ürün seçin.");
        setLoading(true);
        try {
            const data = await generateMarketingContentAction('social', {
                productName: selectedProduct.name,
                platform,
                goal,
                tone
            });
            setResult(data);
        } catch (e) {
            toast.error("İçerik oluşturulamadı.");
        }
        setLoading(false);
    }


    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
            {/* CONTROLS */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Smartphone className="text-pink-500" /> Reklam Merkezi</h3>

                    <div className="space-y-4">
                        <ProductSelector products={products} selectedId={selectedProduct?.id} onSelect={setSelectedProduct} label="Reklam Yapılacak Ürün" />

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Platform</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPlatform('instagram_feed')} className={`p-3 rounded-xl border text-left flex items-center gap-2 transition ${platform === 'instagram_feed' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-[#020617] border-white/10 text-gray-400'}`}>
                                    <Smartphone size={16} /> <span className="text-xs font-bold">IG Gönderi</span>
                                </button>
                                <button onClick={() => setPlatform('instagram_story')} className={`p-3 rounded-xl border text-left flex items-center gap-2 transition ${platform === 'instagram_story' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-[#020617] border-white/10 text-gray-400'}`}>
                                    <Zap size={16} /> <span className="text-xs font-bold">IG Hikaye</span>
                                </button>
                                <button onClick={() => setPlatform('facebook_ads')} className={`p-3 rounded-xl border text-left flex items-center gap-2 col-span-2 transition ${platform === 'facebook_ads' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-[#020617] border-white/10 text-gray-400'}`}>
                                    <Share2 size={16} /> <span className="text-xs font-bold">Facebook Sponsorlu</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Hedef</label>
                            <div className="flex bg-[#020617] p-1 rounded-xl border border-white/10">
                                {[{ id: 'sales', l: 'Satış' }, { id: 'awareness', l: 'Bilinirlik' }, { id: 'engagement', l: 'Etkileşim' }].map(g => (
                                    <button key={g.id} onClick={() => setGoal(g.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${goal === g.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                        {g.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Ton</label>
                            <select className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white text-sm outline-none" value={tone} onChange={e => setTone(e.target.value)}>
                                <option>Coşkulu</option>
                                <option>Samimi</option>
                                <option>Profesyonel</option>
                                <option>Aciliyet</option>
                            </select>
                        </div>

                        <button onClick={generate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition">
                            {loading ? <RefreshCw className="animate-spin" /> : <Megaphone fill="currentColor" />}
                            Reklamı Oluştur
                        </button>
                    </div>
                </div>
            </div>

            {/* PREVIEW */}
            <div className="lg:col-span-8 flex justify-center items-start">
                {result ? (
                    <div className="w-[380px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative aspect-[9/19]">
                        {/* Dynamic Preview based on Platform */}

                        {platform === 'instagram_feed' && (
                            <div className="bg-black h-full text-white flex flex-col">
                                <div className="p-4 flex items-center justify-between border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                                            <div className="w-full h-full bg-black rounded-full text-[10px] flex items-center justify-center font-bold">L</div>
                                        </div>
                                        <span className="font-bold text-sm">magazaniz</span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">Sponsored</div>
                                </div>
                                {selectedProduct?.image_url ? (
                                    <img src={selectedProduct.image_url} className="aspect-square w-full object-cover" alt="Product" />
                                ) : (
                                    <div className="aspect-square bg-gray-800 flex items-center justify-center text-gray-600">
                                        <Smartphone size={48} className="opacity-20" />
                                        <span className="text-xs ml-2">Ürün Görseli</span>
                                    </div>
                                )}
                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <div className="flex gap-4"><div className="text-2xl">❤️</div><div className="text-2xl">💬</div></div>
                                        <div className="text-2xl">🔖</div>
                                    </div>
                                    <div className="font-bold text-sm">2,453 beğenme</div>
                                    <div className="text-sm prose prose-invert prose-sm max-w-none">
                                        <span className="font-bold mr-2">magazaniz</span>
                                        <span className="whitespace-pre-wrap">{result.primaryText}</span>
                                    </div>
                                    <div className="text-blue-400 text-sm">{result.hashtags.join(' ')}</div>
                                </div>
                                <button className="mx-4 mb-4 py-2 bg-blue-600 rounded text-sm font-bold mt-auto">Alışveriş Yap</button>
                            </div>
                        )}

                        {platform === 'instagram_story' && (
                            <div className="bg-gradient-to-b from-purple-800 to-orange-800 h-full text-white relative flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                                {selectedProduct?.image_url && (
                                    <div className="absolute inset-0 z-0">
                                        <img src={selectedProduct.image_url} className="w-full h-full object-cover opacity-50 blur-sm scale-110" alt="Background" />
                                        <div className="absolute inset-0 bg-black/40"></div>
                                    </div>
                                )}
                                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                    <div className="absolute top-8 left-4 flex gap-2 items-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                        <span className="font-bold text-sm shadow-black drop-shadow-md">magazaniz</span>
                                    </div>

                                    <h2 className="text-3xl font-black mb-8 drop-shadow-xl">{selectedProduct?.name}</h2>

                                    {result.storyOverlays.map((text: string, i: number) => (
                                        <div key={i} className={`mb-4 px-4 py-2 bg-white text-black font-bold text-xl transform ${i % 2 === 0 ? '-rotate-2' : 'rotate-1'}`}>
                                            {text}
                                        </div>
                                    ))}

                                    <div className="absolute bottom-12 animate-bounce">
                                        <div className="flex flex-col items-center text-sm font-bold drop-shadow-md">
                                            <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center mb-1">^</div>
                                            Daha Fazla
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {platform === 'facebook_ads' && (
                            <div className="bg-[#18191A] h-full text-gray-200 flex flex-col font-sans">
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-600"></div>
                                        <div>
                                            <div className="font-bold text-white text-sm">Mağaza Adı</div>
                                            <div className="text-xs text-gray-500">Sponsorlu • 🌍</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 pb-2 text-sm whitespace-pre-wrap">{result.primaryText}</div>
                                {selectedProduct?.image_url ? (
                                    <img src={selectedProduct.image_url} className="aspect-video w-full object-cover" alt="Product" />
                                ) : (
                                    <div className="bg-gray-800 aspect-video flex items-center justify-center">
                                        <span className="text-gray-600">Video / Görsel</span>
                                    </div>
                                )}
                                <div className="p-3 bg-[#242526] border-t border-gray-700 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-gray-400">TARZINI YANSIT</div>
                                        <div className="font-bold text-white text-base leading-tight">{result.headline}</div>
                                    </div>
                                    <button className="px-4 py-2 bg-gray-700 rounded text-sm font-bold text-white">Şimdi Al</button>
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl min-h-[500px]">
                        <Smartphone size={64} className="opacity-20 mb-6" />
                        <h3 className="text-xl font-bold text-gray-500">Önizleme Bekleniyor</h3>
                        <p className="max-w-xs text-center mt-2 opacity-50">Soldaki panelden ayarları seçip "Reklamı Oluştur" butonuna basın.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function ProductSelector({ products, onSelect, selectedId, label = "Ürün Seçimi" }: { products: any[], onSelect: (p: any) => void, selectedId?: any, label?: string }) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // Filter safely
    const filtered = (products || []).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative group">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{label}</label>

            {/* Trigger */}
            <div
                className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition cursor-pointer flex justify-between items-center relative"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedId ? "text-white font-medium" : "text-gray-500"}>
                    {(products || []).find(p => p.id === selectedId)?.name || "Ürün seçin veya arayın..."}
                </span>
                <Search size={14} className="text-gray-500" />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-white/5 sticky top-0 bg-[#1E293B]">
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-[#020617] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500/50"
                                placeholder="Ürün adı yazın..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar p-1">
                            {filtered.length > 0 ? filtered.map(p => (
                                <div
                                    key={p.id}
                                    className={`p-3 hover:bg-white/5 rounded-lg text-sm text-gray-300 cursor-pointer transition flex justify-between ${p.id === selectedId ? 'bg-indigo-500/20 text-indigo-400' : ''}`}
                                    onClick={() => {
                                        onSelect(p);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <span>{p.name}</span>
                                    {p.stock !== undefined && <span className="text-xs opacity-50 bg-white/5 px-2 rounded ml-2">{p.stock} Adet</span>}
                                </div>
                            )) : (
                                <div className="p-4 text-center text-xs text-gray-500">Ürün bulunamadı.</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
