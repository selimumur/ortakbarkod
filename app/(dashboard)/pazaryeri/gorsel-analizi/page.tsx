"use client";
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, CheckCircle, AlertTriangle, Wand2, Monitor, AlertOctagon, Download, RefreshCw } from 'lucide-react';
import { ImageAnalysis, getAnalyzedImagesAction, enhanceImageAction } from '@/app/actions/imageAnalysisActions';
import { toast } from 'sonner';

export default function ImageAnalysisPage() {
    const [images, setImages] = useState<ImageAnalysis[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        try {
            const data = await getAnalyzedImagesAction();
            setImages(data);
        } catch (e) {
            console.error(e);
            toast.error("Görsel analizi başlatılamadı.");
        } finally {
            setLoading(false);
        }
    };

    const handleEnhance = async (id: number, action: 'Arkaplan' | 'Upscale') => {
        const type = action === 'Arkaplan' ? 'background' : 'upscale';
        const toastId = toast.loading(`${action} işlemi uygulanıyor (AI)...`);

        try {
            const result = await enhanceImageAction(id, type);

            // Optimistic update
            setImages(prev => prev.map(img => {
                if (img.id === id) {
                    return {
                        ...img,
                        status: 'optimized',
                        qualityScore: 95,
                        issues: [],
                        resolution: result.newResolution || img.resolution
                    };
                }
                return img;
            }));

            toast.success(result.message, { id: toastId });

        } catch (e) {
            toast.error('İşlem başarısız.', { id: toastId });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ImageIcon className="text-cyan-500" /> Görsel Analizi & Geliştirme
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Yapay zeka ile ürün görsellerini denetleyin ve tek tıkla iyileştirin.</p>
                </div>
                <button onClick={loadImages} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Yenileniyor..." : "Analizi Yenile"}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-red-900/20 text-red-500 rounded-lg"><AlertOctagon size={24} /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Sorunlu Görsel</p>
                        <p className="text-xl font-bold text-white">{images.filter(i => i.status === 'needs_attention').length}</p>
                    </div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-green-900/20 text-green-500 rounded-lg"><CheckCircle size={24} /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Optimize Edildi</p>
                        <p className="text-xl font-bold text-white">{images.filter(i => i.status === 'optimized').length}</p>
                    </div>
                </div>
                <div className="bg-[#111827] border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-cyan-900/20 text-cyan-500 rounded-lg"><Wand2 size={24} /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">AI ile İyileştirilen</p>
                        <p className="text-xl font-bold text-white">-</p>
                    </div>
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-500 animate-pulse">Görseller analiz ediliyor...</div>
                ) : images.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">Analiz edilecek görsel bulunamadı.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
                        {images.map(img => (
                            <div key={img.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden group hover:border-cyan-500/50 transition duration-300">
                                {/* Image Container */}
                                <div className="relative aspect-square bg-gray-900 p-2">
                                    <div className="w-full h-full relative rounded-lg overflow-hidden">
                                        <img src={img.imageUrl} alt={img.productName} className="object-contain w-full h-full" />

                                        {/* Status Badge */}
                                        <div className="absolute top-2 left-2">
                                            {img.status === 'optimized' ? (
                                                <span className="bg-green-500/90 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                                    <CheckCircle size={10} /> Mükemmel
                                                </span>
                                            ) : (
                                                <span className="bg-red-500/90 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Sorunlu
                                                </span>
                                            )}
                                        </div>

                                        {/* Score Badge */}
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded">
                                            Skor: {img.qualityScore}
                                        </div>

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-4">
                                            {img.status === 'needs_attention' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEnhance(img.id, 'Arkaplan')}
                                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                                                    >
                                                        <Wand2 size={14} /> Arkaplanı Temizle
                                                    </button>
                                                    <button
                                                        onClick={() => handleEnhance(img.id, 'Upscale')}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                                                    >
                                                        <Monitor size={14} /> Çözünürlüğü Artır (4x)
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-green-400 font-bold flex flex-col items-center gap-2">
                                                    <CheckCircle size={32} />
                                                    <span>Optimize Edildi</span>
                                                    <button className="mt-2 text-white border border-gray-600 hover:bg-gray-800 px-4 py-1.5 rounded-lg text-xs transition flex items-center gap-2">
                                                        <Download size={14} /> İndir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-4">
                                    <h3 className="text-sm font-bold text-white mb-2 truncate" title={img.productName}>{img.productName}</h3>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {img.issues.length > 0 ? img.issues.map((issue, i) => (
                                            <span key={i} className="text-[10px] bg-red-900/30 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                                                {issue}
                                            </span>
                                        )) : (
                                            <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                                                Temiz
                                            </span>
                                        )}
                                        <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                                            {img.resolution}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
