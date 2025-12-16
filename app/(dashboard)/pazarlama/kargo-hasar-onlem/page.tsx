"use client";

import { getCargoProtectionPlanAction } from '@/app/actions/marketingActions';

import { useState } from 'react';
import {
    ShieldCheck, Package, Box, Truck, AlertOctagon,
    CheckCircle2, AlertTriangle, Hammer, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function CargoProtectionPage() {
    const [productType, setProductType] = useState("");
    const [material, setMaterial] = useState("Seramik/Cam");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);

    async function analyze() {
        if (!productType) return toast.error("Lütfen ürün cinsini girin.");

        setLoading(true);
        setReport(null);

        try {
            const data = await getCargoProtectionPlanAction(productType, material);
            setReport(data);
            toast.success("Koruma planı oluşturuldu!");
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
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500 mb-2">
                        Kargo Hasar Kalkanı 🛡️
                    </h1>
                    <p className="text-gray-400">Kargoda kırılan ürünlere son: Yapay zeka destekli paketleme stratejisi.</p>
                </div>
            </div>

            {/* INPUT SECTION */}
            <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-orange-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-bl-full blur-3xl -z-10"></div>

                <div className="flex flex-col lg:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">Ürün Tipi / Adı</label>
                        <input
                            type="text"
                            className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 outline-none focus:border-orange-500 transition"
                            placeholder="Örn: 6'lı Porselen Tabak Seti..."
                            value={productType}
                            onChange={(e) => setProductType(e.target.value)}
                        />
                    </div>

                    <div className="w-full lg:w-48 space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">Malzeme Türü</label>
                        <select
                            className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-orange-500"
                            value={material}
                            onChange={(e) => setMaterial(e.target.value)}
                        >
                            <option>Seramik/Cam</option>
                            <option>Ahşap/Mobilya</option>
                            <option>Elektronik</option>
                            <option>Tekstil</option>
                            <option>Kozmetik/Sıvı</option>
                            <option>Metal</option>
                        </select>
                    </div>

                    <button
                        onClick={analyze}
                        disabled={loading}
                        className="w-full lg:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                    >
                        {loading ? <RefreshCw className="animate-spin" /> : <ShieldCheck />}
                        {loading ? "Analiz Ediliyor..." : "Koruma Planı Oluştur"}
                    </button>
                </div>
            </div>

            {/* RESULTS */}
            {report && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">

                    {/* RISK CARD */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle size={120} /></div>
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-2">Tahmini Risk Seviyesi</h3>
                            <div className="text-4xl font-black text-white mb-2">{report.riskLevel}</div>
                            <div className="text-orange-400 font-medium text-sm flex items-center gap-2"><Hammer size={16} /> {report.prediction}</div>
                        </div>

                        <div className="md:col-span-2 bg-[#0F172A] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><Package size={16} /> Önerilen Paketleme Kombinasyonu</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#020617] p-4 rounded-xl border border-white/10">
                                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Kutu Tipi</div>
                                    <div className="text-white font-medium text-sm">{report.packaging.box}</div>
                                </div>
                                <div className="bg-[#020617] p-4 rounded-xl border border-white/10">
                                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Dolgu Malzemesi</div>
                                    <div className="text-white font-medium text-sm">{report.packaging.filler}</div>
                                </div>
                                <div className="bg-[#020617] p-4 rounded-xl border border-white/10">
                                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Bantlama</div>
                                    <div className="text-white font-medium text-sm">{report.packaging.tape}</div>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 bg-white/5 p-2 rounded-lg flex items-center gap-2">
                                <AlertOctagon size={14} className="text-orange-500" />
                                <span><strong>Maliyet/Etki:</strong> {report.costEfficiency}</span>
                            </div>
                        </div>
                    </div>

                    {/* 10 STEP PLAN */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-orange-500/20 p-8 rounded-3xl">
                        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-lg shadow-lg shadow-orange-600/20">10</div>
                            Adımda Hasarsız Teslimat Rehberi
                        </h2>

                        <div className="space-y-4 relative">
                            {/* VERTICAL LINE */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-800"></div>

                            {report.steps.map((step: string, i: number) => (
                                <div key={i} className="flex gap-6 items-start relative hover:bg-white/5 p-3 rounded-xl transition group">
                                    <div className={`w-10 h-10 rounded-full border-4 border-[#0F172A] flex items-center justify-center shrink-0 z-10 text-xs font-bold transition group-hover:scale-110 ${i < 3 ? 'bg-orange-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                                        {i + 1}
                                    </div>
                                    <p className="text-gray-300 mt-2 leading-relaxed font-medium">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
