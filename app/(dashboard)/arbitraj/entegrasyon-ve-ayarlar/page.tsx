"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Plug, ExternalLink, Store } from 'lucide-react';
import Link from 'next/link';
import { getMarketplacesAction } from '@/app/actions/settingsActions';

export default function IntegrationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [account, setAccount] = useState<any | null>(null);

    useEffect(() => {
        fetchAccount();
    }, []);

    async function fetchAccount() {
        try {
            const accounts = await getMarketplacesAction();
            const trendyol = accounts.find((a: any) =>
                a.platform?.toLowerCase().includes("trendyol") && a.is_active
            );

            if (trendyol) {
                setAccount(trendyol);
            }
        } catch (error) {
            console.error("Account fetch error", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Ayarlar kontrol ediliyor...</div>;

    return (
        <div className="md:p-8 p-4 min-h-screen bg-[#0B1120] text-white">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Plug className="text-indigo-500" /> Entegrasyon Durumu
            </h1>
            <p className="text-gray-400 mb-8">Pazaryeri bağlantı durumunuz ve aktarım ayarlarını buradan yönetebilirsiniz.</p>

            <div className="max-w-3xl mx-auto">

                {/* Connection Status Card */}
                <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Store className="text-orange-500" /> Trendyol Bağlantısı
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">Veriler "Entegrasyon Merkezi" üzerinden çekilmektedir.</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${account ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {account ? 'BAĞLI' : 'BAĞLANMADI'}
                        </div>
                    </div>

                    {account ? (
                        <div className="space-y-4 relative z-10">
                            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="bg-green-500/10 p-2 rounded-lg">
                                    <CheckCircle className="text-green-500" size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Mağaza: {account.store_name}</h4>
                                    <p className="text-sm text-gray-400">ID: {account.supplier_id} • API Key Tanımlı</p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-gray-400 text-sm mb-4">
                                    Bu mağaza üzerinden ürün aktarımı (Product Create V2) ve özellik eşleştirme işlemleri yapılacaktır.
                                </p>
                                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
                                    <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="font-bold text-blue-400 text-sm">Sıradaki Adım: Özellik Eşleştirme</h4>
                                        <p className="text-gray-400 text-xs mt-1">
                                            Mobilya ürünleriniz için Kategori (Desi, Varyant) eşleştirmelerini <strong>Ürün Detay</strong> sayfasındaki "Pazaryeri" sekmesinden yapabileceksiniz.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 relative z-10">
                            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6 text-center">
                                <XCircle className="text-red-500 mx-auto mb-3" size={32} />
                                <h4 className="font-bold text-white mb-1">Trendyol Mağazası Bulunamadı</h4>
                                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                                    Sistemde kayıtlı aktif bir Trendyol API anahtarı yok. Ürün aktarabilmek için önce mağazanızı bağlamalısınız.
                                </p>
                            </div>

                            <Link href="/ayarlar/pazaryerleri" className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-lg shadow-indigo-900/20">
                                <ExternalLink size={18} /> Entegrasyon Merkezine Git
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
