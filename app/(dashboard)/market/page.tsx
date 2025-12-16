"use client";

import { useEffect, useState } from 'react';
import { getModulesAction, getTenantModulesAction, purchaseModuleAction } from '@/app/actions/moduleActions';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { ShoppingBag, CheckCircle, Package, Lock, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MarketPage() {
    const [modules, setModules] = useState<any[]>([]);
    const [myModules, setMyModules] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allModules, tenantMods] = await Promise.all([
                getModulesAction(),
                getTenantModulesAction()
            ]);
            setModules(allModules);
            setMyModules(new Set(tenantMods.map((m: any) => m.module_id)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (module: any) => {
        if (!confirm(`${module.name} modülünü satın almak istiyor musunuz? (${module.price} ₺/ay)`)) return;

        setPurchasing(module.id);
        try {
            const res = await purchaseModuleAction(module.id);
            if (res.status === 'activated') {
                toast.success("Modül başarıyla aktif edildi!");
                loadData();
                // Force reload sidebar (optional)
                window.location.reload();
            } else if (res.status === 'payment_required') {
                toast.info("Ödeme Gerçekleştirilmelidir. Abonelik sayfasına yönlendiriliyorsunuz...", { duration: 2000 });
                // Redirect to subscription page (future: pass module ID to highlight/modal)
                setTimeout(() => router.push('/ayarlar/abonelik'), 1000);
            }
        } catch (error: any) {
            toast.error("İşlem başarısız: " + error.message);
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-[#0B1120]">
            <div className="text-white animate-pulse flex items-center gap-2"><ShoppingBag /> Mağaza yükleniyor...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1120] text-white p-8 md:p-12">
            <header className="max-w-7xl mx-auto mb-16 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 animate-pulse">
                    <Package size={120} />
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Uygulama Marketi
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                    İşletmenizi büyütmek için ihtiyacınız olan ek özellikleri ve entegrasyonları tek tıkla keşfedin ve aktif edin.
                </p>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {modules.map(module => {
                    const isOwned = myModules.has(module.id);
                    return (
                        <div key={module.id} className={`group relative bg-[#111827] border border-gray-800 rounded-3xl p-8 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300 flex flex-col ${isOwned ? 'border-green-900/30 bg-green-900/5' : ''}`}>

                            {module.image_url ? (
                                <div className="w-full h-48 bg-gray-800 rounded-2xl mb-6 overflow-hidden relative shadow-lg">
                                    <img src={module.image_url} alt={module.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    {isOwned && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <div className="bg-green-500/20 text-green-400 border border-green-500 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                                                <CheckCircle size={18} /> Kütüphanenizde
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                                    <Package size={32} className={isOwned ? "text-green-500" : "text-blue-400"} />
                                </div>
                            )}

                            <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{module.name}</h3>
                            <p className="text-gray-400 mb-8 flex-1 leading-relaxed">
                                {module.description}
                            </p>

                            <div className="border-t border-gray-800 pt-6 mt-auto">
                                <div className="flex justify-between items-end mb-6">
                                    <div className="text-sm text-gray-500">Aylık Ücret</div>
                                    <div className="text-2xl font-bold text-white">
                                        {Number(module.price) === 0 ? 'ÜCRETSİZ' : `${Number(module.price).toLocaleString()} ₺`}
                                    </div>
                                </div>

                                <button
                                    onClick={() => !isOwned && handlePurchase(module)}
                                    disabled={isOwned || purchasing === module.id}
                                    className={`w-full py-4 rounded-xl font-bold transition flex items-center justify-center gap-3 relative overflow-hidden
                                        ${isOwned
                                            ? 'bg-gray-800 text-gray-500 cursor-default'
                                            : 'bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-95'
                                        }`}
                                >
                                    {purchasing === module.id ? (
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isOwned ? (
                                        <>Kütüphanede Mevcut</>
                                    ) : (
                                        <>
                                            Satın Al & Aktifleştir
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {modules.length === 0 && !loading && (
                    <div className="col-span-full py-24 text-center">
                        <div className="inline-block p-6 rounded-full bg-gray-800 mb-4">
                            <ShoppingBag className="text-gray-500" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-300">Market Henüz Açılmadı</h3>
                        <p className="text-gray-500 mt-2">Yakında yeni modüller eklenecek.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
