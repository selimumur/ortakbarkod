"use client";

import { useState } from 'react';
import { Book, Code, FileText, HelpCircle, Layout, MessageCircle, Settings, Search, ChevronRight, PlayCircle, Terminal } from 'lucide-react';
import TenantSupportView from '@/components/support/TenantSupportView';

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('baslangic');

    const menuItems = [
        { id: 'baslangic', label: 'Başlangıç', icon: <PlayCircle size={18} /> },
        { id: 'moduller', label: 'Modül Rehberleri', icon: <Layout size={18} /> },
        { id: 'pazarlama', label: 'Pazarlama & AI', icon: <Layout size={18} /> },
        { id: 'teknik', label: 'Teknik & API', icon: <Code size={18} /> },
        { id: 'sss', label: 'Sık Sorulan Sorular', icon: <HelpCircle size={18} /> },
        { id: 'destek', label: 'Destek Taleplerim', icon: <MessageCircle size={18} /> },
    ];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const subject = formData.get('subject') as string;
        const message = formData.get('message') as string;

        try {
            const { createTicketAction } = await import('@/app/actions/supportActions');
            const { toast } = await import('sonner');

            const result = await createTicketAction(subject, message);

            if (result.success) {
                toast.success('Destek talebiniz oluşturuldu. Size en kısa sürede dönüş yapacağız.');
                setIsModalOpen(false);
            } else {
                toast.error(result.error || 'Talep oluşturulurken bir hata oluştu.');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex h-full bg-[#0B1120] text-gray-200 relative">
            {/* SOL MENÜ */}
            <aside className="w-64 border-r border-gray-800 bg-[#111827] flex flex-col shrink-0">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Book className="text-blue-500" /> Yardım Merkezi
                    </h1>
                    <p className="text-xs text-gray-500 mt-2">v1.0 Dokümantasyon</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 bg-gray-900 m-4 rounded-xl border border-gray-800">
                    <h4 className="text-white font-bold text-sm mb-2">Destek Hattı</h4>
                    <p className="text-xs text-gray-400 mb-3">Sorun devam ederse teknik ekibimize ulaşın.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg border border-gray-700 transition"
                    >
                        Destek Talebi Oluştur
                    </button>
                </div>
            </aside>

            {/* İÇERİK ALANI */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                <div className="max-w-4xl mx-auto">

                    {/* 1. BAŞLANGIÇ */}
                    {activeTab === 'baslangic' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <header className="border-b border-gray-800 pb-8 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/20">
                                    <PlayCircle size={14} /> Hoşgeldiniz
                                </div>
                                <h2 className="text-4xl font-black text-white mb-4">OrtakBarkod Paneline Giriş</h2>
                                <p className="text-lg text-gray-400 leading-relaxed">
                                    İşletmenizi dijitalleştirmek için ihtiyacınız olan tüm araçlar tek bir panelde. Bu rehber ile sistemin temel fonksiyonlarını hızlıca öğrenebilirsiniz.
                                </p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/30 transition group">
                                    <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition">
                                        <LayoutDashboardIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Kokpit (Dashboard)</h3>
                                    <p className="text-sm text-gray-400">
                                        Giriş yaptığınızda sizi karşılayan ana ekran. Günlük satışlar, bekleyen siparişler ve kritik stok uyarılarını burada görürsünüz.
                                    </p>
                                </div>

                                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-purple-500/30 transition group">
                                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition">
                                        <Settings size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Kurulum & Ayarlar</h3>
                                    <p className="text-sm text-gray-400">
                                        Sol menüden <strong>Ayarlar &gt; Genel</strong> yolunu izleyerek şirket bilgilerinizi ve logo ayarlarınızı yapın.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. MODÜLLER */}
                    {activeTab === 'moduller' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">

                            {/* ÜRÜNLER */}
                            <section>
                                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-sm">1</span>
                                    Ürün & Stok Yönetimi
                                </h2>
                                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 space-y-6">
                                    <p className="text-gray-300">
                                        `/urunler` sayfası, sistemin en temel parçasıdır. Tüm ürünlerinizi, stoklarınızı ve maliyetlerinizi buradan yönetirsiniz.
                                    </p>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FeatureItem title="Excel İle Yükleme" desc="Toplu ürün yüklemek için .xlsx formatında listelerinizi kullanın." />
                                        <FeatureItem title="Reçete Sistemi" desc="Ürünü oluşturan hammadde ve işçilikleri girerek otomatik maliyet hesabı yapın." />
                                        <FeatureItem title="Kritik Stok" desc="Stok seviyesi 5'in altına düşen ürünler için otomatik uyarı alın." />
                                    </ul>
                                </div>
                            </section>

                            {/* PAZARYERİ */}
                            <section>
                                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-sm">2</span>
                                    Pazaryeri Entegrasyonları
                                </h2>
                                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 space-y-6">
                                    <p className="text-gray-300">
                                        Trendyol, Hepsiburada ve WooCommerce gibi kanalları tek panelden yönetin.
                                    </p>
                                    <div className="space-y-4">
                                        <div className="border-l-4 border-orange-500 pl-4 py-1">
                                            <h4 className="text-white font-bold">Nasıl Bağlanır?</h4>
                                            <p className="text-sm text-gray-400 mt-1">Ayarlar &gt; Pazaryerleri sayfasına gidin. "Yeni Mağaza Ekle" butonuna basıp API anahtarlarınızı girin.</p>
                                        </div>
                                        <div className="border-l-4 border-green-500 pl-4 py-1">
                                            <h4 className="text-white font-bold">Ürün Eşleştirme</h4>
                                            <p className="text-sm text-gray-400 mt-1">Pazaryerinden gelen ürünün Barcode/SKU bilgisi ile sistemdeki Model Kodu aynı ise otomatik eşleşir.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* MUHASEBE */}
                            <section>
                                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-sm">3</span>
                                    Muhasebe & Finans
                                </h2>
                                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8">
                                    <p className="text-gray-300 mb-4">
                                        İşletmenizin nakit akışını, gelir-gider dengesini ve faturalarını takip edin.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['Cari Hesaplar', 'Gelir/Gider Takibi', 'Nakit Akışı', 'Resmi Fatura', 'Personel Maaşları', 'Banka Entegrasyonu'].map(i => (
                                            <div key={i} className="bg-gray-800/50 p-3 rounded-lg text-sm text-gray-300 font-medium flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {i}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* 3. PAZARLAMA & AI */}
                    {activeTab === 'pazarlama' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <header>
                                <h2 className="text-3xl font-bold text-white mb-4">Pazarlama Zekası (AI)</h2>
                                <p className="text-gray-400">Yapay zeka destekli araçlarla rakiplerinizi analiz edin ve içerik üretin.</p>
                            </header>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-8">
                                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Search size={24} className="text-indigo-400" /> Rakip Analizi (AI Detective)</h3>
                                    <p className="text-gray-300 mb-6">
                                        Rakibinizin Trendyol mağaza linkini girin. Yapay zeka, rakibin en çok satan ürünlerini, yorum analizlerini ve zayıf yönlerini (SWOT) analiz edip size bir rapor sunsun.
                                    </p>
                                    <div className="bg-[#0B1120] p-4 rounded-xl border border-indigo-500/30 font-mono text-sm text-indigo-300">
                                        Örnek Çıktı: "Rakibinizin teslimat hızı düşük (3.8/5). Aynı ürünleri 'Hızlı Teslimat' etiketiyle öne çıkararak avantaj sağlayabilirsiniz."
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                                        <h4 className="text-lg font-bold text-white mb-2">İçerik Stüdyosu</h4>
                                        <p className="text-sm text-gray-400">Ürünleriniz için SEO uyumlu açıklamalar, Instagram post metinleri ve hashtag önerileri oluşturur.</p>
                                    </div>
                                    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                                        <h4 className="text-lg font-bold text-white mb-2">Fiyat Simülatörü</h4>
                                        <p className="text-sm text-gray-400">Komisyon, kargo ve reklam maliyetlerini girerek ürün başına net karınızı ve başa baş noktanızı hesaplar.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. TEKNİK & API */}
                    {activeTab === 'teknik' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-gray-800 bg-gray-900/50">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Terminal size={20} className="text-green-500" /> API Referansı</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-mono text-blue-400">
                                            <span className="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">POST</span> /api/ai/competitor-analysis
                                        </div>
                                        <p className="text-sm text-gray-400 ml-4">Rakip mağaza analizi yapar. Girdi: `{`{ url: "..." }`}`</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-mono text-green-400">
                                            <span className="bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">GET</span> /api/marketplace/import
                                        </div>
                                        <p className="text-sm text-gray-400 ml-4">Bağlı mağazalardan ürünleri çeker ve veritabanına kaydeder.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-mono text-orange-400">
                                            <span className="bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">POST</span> /api/marketplace/push-product
                                        </div>
                                        <p className="text-sm text-gray-400 ml-4">Sistemdeki bir ürünü pazaryerine gönderir/günceller.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Hata Kodları</h3>
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 font-bold border-b border-gray-800">
                                        <tr><th className="pb-2">Kod</th><th className="pb-2">Anlamı</th><th className="pb-2">Çözüm</th></tr>
                                    </thead>
                                    <tbody className="text-gray-400 divide-y divide-gray-800">
                                        <tr><td className="py-2 text-red-400 font-mono">401</td><td>Yetkisiz Giriş</td><td>API Key kontrol edin veya oturumu yenileyin.</td></tr>
                                        <tr><td className="py-2 text-yellow-400 font-mono">429</td><td>Çok Fazla İstek</td><td>AI servisi yoğun. 1 dakika bekleyip tekrar deneyin.</td></tr>
                                        <tr><td className="py-2 text-blue-400 font-mono">500</td><td>Sunucu Hatası</td><td>Sistem yöneticisine başvurun.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 5. SSS */}
                    {activeTab === 'sss' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <h2 className="text-3xl font-bold text-white mb-6">Sık Sorulan Sorular</h2>

                            <FAQItem q="Pazaryerinden gelen siparişler ne zaman düşer?" a="Sistem her 5 dakikada bir Trendyol ve diğer pazaryerlerini tarar. Manuel tetiklemek için Siparişler sayfasındaki 'Yenile' butonunu kullanabilirsiniz." />
                            <FAQItem q="Stoklar otomatik güncelleniyor mu?" a="Evet. Bir sipariş geldiğinde veya siz manuel stok girişi yaptığınızda, bağlı olan tüm pazaryerlerine anlık olarak yeni stok bilgisi gönderilir." />
                            <FAQItem q="Faturayı nasıl keserim?" a="Muhasebe > Fatura sayfasından siparişi seçip 'Fatura Oluştur' diyerek resmi e-fatura/e-arşiv taslağı oluşturabilirsiniz." />
                            <FAQItem q="Yapay zeka kredisi biter mi?" a="Her paketin aylık belirli bir AI işlem limiti vardır. Limit bittiğinde ek paket alabilirsiniz." />
                        </div>
                    )}

                    {/* 6. DESTEK TALEPLERİM (YENİ) */}
                    {activeTab === 'destek' && (
                        <TenantSupportView />
                    )}

                </div>
            </main>

            {/* MODAL */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1F2937] border border-gray-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold text-white mb-2">Destek Talebi Oluştur</h2>
                        <p className="text-sm text-gray-400 mb-6">Sorununuzu detaylı bir şekilde açıklayın. Teknik ekibimiz inceleyip size dönüş yapacaktır.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Konu</label>
                                <input
                                    name="subject"
                                    required
                                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Örn: Trendyol entegrasyon hatası"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mesajınız</label>
                                <textarea
                                    name="message"
                                    required
                                    rows={4}
                                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Hata kodu veya detaylı açıklama..."
                                ></textarea>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Gönderiliyor...' : 'Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeatureItem({ title, desc }: { title: string, desc: string }) {
    return (
        <li className="flex gap-3 items-start">
            <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <ChevronRight size={14} />
            </div>
            <div>
                <h4 className="text-white font-bold text-sm">{title}</h4>
                <p className="text-sm text-gray-400">{desc}</p>
            </div>
        </li>
    )
}

function FAQItem({ q, a }: { q: string, a: string }) {
    return (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h4 className="text-white font-bold mb-2 flex items-center gap-2"><HelpCircle size={16} className="text-gray-500" /> {q}</h4>
            <p className="text-gray-400 text-sm pl-6 border-l border-gray-700 ml-2">{a}</p>
        </div>
    )
}

function LayoutDashboardIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
    )
}
