"use client";

import { useState, useEffect } from 'react';
import {
    Calculator, DollarSign, HelpCircle, PieChart,
    ArrowRight, RotateCcw, TrendingUp
} from 'lucide-react';

export default function ProfitabilityCalculatorPage() {
    // Inputs
    const [cost, setCost] = useState<number>(1000); // Ürün Maliyeti
    const [shipping, setShipping] = useState<number>(50); // Kargo
    const [prepFee, setPrepFee] = useState<number>(10); // Paketleme
    const [commissionRate, setCommissionRate] = useState<number>(15); // Platform Komisyonu (%)
    const [ads, setAds] = useState<number>(0); // Reklam Bütçesi
    const [salePrice, setSalePrice] = useState<number>(1500); // Satış Fiyatı
    const [taxRate, setTaxRate] = useState<number>(20); // KDV (%)

    // Results
    const [results, setResults] = useState({
        commissionAmount: 0,
        taxAmount: 0,
        totalCost: 0,
        netProfit: 0,
        roi: 0,
        breakEven: 0,
        margin: 0
    });

    useEffect(() => {
        calculateProfit();
    }, [cost, shipping, prepFee, commissionRate, ads, salePrice, taxRate]);

    function calculateProfit() {
        const commissionAmount = salePrice * (commissionRate / 100);
        // Basit KDV Hesabı: Satış Fiyatı içinden KDV ayıklama veya üstüne ekleme? 
        // Genelde "Satış Fiyatı" KDV dahil varsayılır. 
        // Net satış = Satış / (1 + tax). Vergi = Satış - Net Satış.
        // Ancak burada basit gider olarak düşelim: Satış Fiyatı üzerinden KDV ödenir varsayalım.
        // KDV Dahil Satış - (KDV Dahil Satış / (1+Oran)) = KDV Tutarı
        const taxAmount = salePrice - (salePrice / (1 + (taxRate / 100)));

        // Total Cost to Seller
        const totalExps = cost + shipping + prepFee + ads + commissionAmount + taxAmount;

        const netProfit = salePrice - totalExps;
        const roi = (cost > 0) ? (netProfit / totalExps) * 100 : 0; // ROI on total investment usually
        const margin = (salePrice > 0) ? (netProfit / salePrice) * 100 : 0;

        // Break Even: Sale - (Sale * Comm) - (Sale - Sale/1+Tax) = FixedCosts
        // Sale (1 - Comm - (1 - 1/1+Tax)) = FixedCosts
        // Sale (1 - Comm/100 - TaxRate/(100+TaxRate)*TaxRate ??) -> Basitleştirelim:
        // Maliyetler = Cost + Ship + Prep + Ads.
        // Değişken = Comm + Tax.
        // BEP = Fixed / (1 - VariableRatio)
        const fixedCosts = cost + shipping + prepFee + ads;
        const variableRatio = (commissionRate / 100) + (1 - (1 / (1 + taxRate / 100)));
        const breakEven = fixedCosts / (1 - variableRatio);

        setResults({
            commissionAmount,
            taxAmount,
            totalCost: totalExps,
            netProfit,
            roi,
            breakEven,
            margin
        });
    }

    return (
        <div className="md:p-8 p-4 min-h-full bg-[#0B1120] text-white">

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Calculator className="text-emerald-500" /> Karlılık Hesaplayıcı
                </h1>
                <p className="text-gray-400 text-sm mt-1">Yatırım yapmadan önce potansiyel net karınızı ve ROI oranınızı hesaplayın.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">

                {/* LEFT COLUMN: INPUTS */}
                <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Gider Kalemleri</h2>
                        <button
                            onClick={() => { setCost(0); setShipping(0); setPrepFee(0); setAds(0); setSalePrice(0); }}
                            className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                        >
                            <RotateCcw size={12} /> Sıfırla
                        </button>
                    </div>

                    <div className="space-y-6">

                        <InputGroup
                            label="Ürün Kaynak Maliyeti"
                            icon={<DollarSign size={14} />}
                            value={cost}
                            onChange={setCost}
                            suffix="₺"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup
                                label="Kargo Maliyeti"
                                value={shipping}
                                onChange={setShipping}
                                suffix="₺"
                            />
                            <InputGroup
                                label="Hazırlık / Paket"
                                value={prepFee}
                                onChange={setPrepFee}
                                suffix="₺"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup
                                label="Platform Komisyonu"
                                value={commissionRate}
                                onChange={setCommissionRate}
                                suffix="%"
                                max={100}
                            />
                            <InputGroup
                                label="Vergi Oranı (KDV)"
                                value={taxRate}
                                onChange={setTaxRate}
                                suffix="%"
                                max={100}
                            />
                        </div>

                        <InputGroup
                            label="Reklam Bütçesi (Opsiyonel)"
                            value={ads}
                            onChange={setAds}
                            suffix="₺"
                        />

                        <div className="pt-4 border-t border-gray-800">
                            <InputGroup
                                label="Beklenen Satış Fiyatı"
                                value={salePrice}
                                onChange={setSalePrice}
                                suffix="₺"
                                highlight
                            />
                        </div>

                    </div>
                </div>

                {/* RIGHT COLUMN: RESULTS */}
                <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden">
                    {/* Background Gradient Effect */}
                    <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full opacity-20 pointer-events-none transition duration-700 ${results.netProfit > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                    <h2 className="text-lg font-bold text-white mb-6 relative z-10">Hesaplama Sonucu</h2>

                    {/* MAIN RESULTS BIG CARDS */}
                    <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                        <div className={`p-4 rounded-2xl border ${results.netProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <p className={`text-xs font-bold uppercase ${results.netProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>Net Kar</p>
                            <h3 className={`text-3xl font-black mt-1 ${results.netProfit > 0 ? 'text-white' : 'text-red-200'}`}>
                                ₺{results.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                            <p className="text-xs font-bold uppercase text-blue-400">ROI (Getiri)</p>
                            <h3 className="text-3xl font-black mt-1 text-white">
                                %{results.roi.toFixed(1)}
                            </h3>
                        </div>
                    </div>

                    {/* DETAIL LIST */}
                    <div className="space-y-3 relative z-10 flex-1">
                        <ResultRow label="Platform Komisyonu" value={`-₺${results.commissionAmount.toFixed(2)}`} />
                        <ResultRow label="Tahmini Vergi (KDV)" value={`-₺${results.taxAmount.toFixed(2)}`} />
                        <ResultRow label="Toplam Maliyet" value={`-₺${results.totalCost.toFixed(2)}`} />
                        <div className="my-2 border-b border-gray-700"></div>
                        <ResultRow label="Kar Marjı" value={`%${results.margin.toFixed(1)}`} highlight />
                        <ResultRow label="Başa Baş Noktası" value={`₺${results.breakEven.toFixed(2)}`} highlight color="text-orange-400" />
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-8 p-3 bg-gray-800/50 rounded-lg text-[10px] text-gray-500 relative z-10">
                        <p className="flex items-center gap-1"><HelpCircle size={10} /> Not: Bu hesaplamalar tahminidir. Gerçek kesintiler ve vergiler farklılık gösterebilir.</p>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Sub-components for cleaner code
function InputGroup({ label, value, onChange, icon, suffix, max, highlight }: any) {
    return (
        <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${highlight ? 'text-emerald-400' : 'text-gray-500'}`}>
                {label}
            </label>
            <div className="relative group">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`w-full bg-[#0B1120] border rounded-xl py-3 text-white font-bold text-sm focus:outline-none focus:ring-2 transition
            ${icon ? 'pl-9' : 'pl-4'} pr-8
            ${highlight ? 'border-emerald-500/50 focus:ring-emerald-500' : 'border-gray-700 focus:ring-blue-500'}
          `}
                    min="0"
                    max={max}
                />
                {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">{suffix}</span>}
            </div>
        </div>
    )
}

function ResultRow({ label, value, highlight, color }: any) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className={highlight ? 'text-gray-300 font-bold' : 'text-gray-500'}>{label}</span>
            <span className={`font-mono font-bold ${color ? color : highlight ? 'text-white' : 'text-gray-400'}`}>{value}</span>
        </div>
    )
}
