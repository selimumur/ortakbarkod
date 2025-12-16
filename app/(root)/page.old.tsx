"use client";

import { useEffect, useState, useRef } from 'react';
import {
    ArrowRight, Box, Layers, Globe, ShieldCheck, Zap,
    BarChart3, Truck, RefreshCw, Database, Lock,
    ChevronRight, Play, CheckCircle2, AlertTriangle,
    CreditCard, Users, Factory
} from 'lucide-react';
import Link from 'next/link';

// --- HOOKS ---
function useScrollReveal() {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, []);

    return { ref, isVisible };
}

// --- COMPONENTS ---

// 1. HERO SECTION
function HeroSection() {
    return (
        <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 overflow-hidden pt-20">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[#030712]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto space-y-8 mt-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4 animate-fade-in-up">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Sistem Yayında v1.0
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.1]">
                    <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        Ürün, Sipariş ve
                    </span>
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-white">
                        Pazaryeri Verisinin
                    </span>
                    <span className="block text-white">
                        Tek Gerçek Kaynağı.
                    </span>
                </h1>

                <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
                    OrtakBarkod, e-ticaret yapan markalar için barkoddan siparişe,
                    stoktan kargoya kadar tüm veriyi tek merkezde toplayan global bir yönetim platformudur.
                </p>

                <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-2"><Globe size={16} /> Pazaryerleri</span>
                    <span className="flex items-center gap-2"><Database size={16} /> ERP'ler</span>
                    <span className="flex items-center gap-2"><Truck size={16} /> Kargo Süreçleri</span>
                    <span className="flex items-center gap-2"><CreditCard size={16} /> Finansal Hareketler</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <Link href="/ozellikler" className="group px-8 py-4 bg-white text-black rounded-lg font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2">
                        Sistemi Keşfet
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="#nasil-calisir" className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-2">
                        <Play size={18} /> Nasıl Çalışır?
                    </Link>
                </div>
            </div>

            {/* Abstract Flow Visual */}
            <div className="w-full max-w-6xl mt-20 relative h-[300px] md:h-[500px] border-t border-white/10 bg-gradient-to-b from-blue-500/5 to-transparent rounded-t-[50px] overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-3 gap-8 md:gap-20 opacity-30">
                        <Box size={64} className="text-blue-500 animate-pulse" />
                        <ArrowRight size={48} className="text-gray-600" />
                        <Truck size={64} className="text-purple-500 animate-pulse delay-75" />

                        <Database size={64} className="text-gray-500" />
                        <RefreshCw size={48} className="text-blue-500 animate-spin-slow" />
                        <Globe size={64} className="text-green-500" />
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
            </div>
        </section>
    );
}

// 2. TRUST & SCALE
function TrustSection() {
    const { ref, isVisible } = useScrollReveal();
    return (
        <section ref={ref} className={`py-24 bg-[#030712] border-t border-white/5 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold text-white mb-12">Bu küçük bir proje değil.</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Yüksek Hacimli Satıcılar</h3>
                        <p className="text-gray-400 text-sm">Günlük yüzlerce sipariş yöneten operasyonlar için sıfır hata toleransı.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 mb-4">
                            <RefreshCw size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Kaosu Bitiren Yapı</h3>
                        <p className="text-gray-400 text-sm">Stok, fiyat ve ürün eşleştirme karmaşasına son veren merkezi otorite.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-green-500/30 transition-colors">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 mb-4">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Bağımsız Merkez</h3>
                        <p className="text-gray-400 text-sm">Pazaryerlerinden bağımsız, kendi verinizin tek sahibi olun.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// 3. PROBLEM / SOLUTION
function ProblemSolution() {
    const { ref, isVisible } = useScrollReveal();
    return (
        <section ref={ref} className={`py-32 bg-[#030712] relative overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                {/* PROBLEM */}
                <div className="space-y-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
                    <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-2">
                        <AlertTriangle /> E-Ticaretin Görünmeyen Yüzü
                    </h3>
                    <ul className="space-y-6">
                        <li className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mt-1">✕</div>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-300">Dağınık Barkod Yapısı</h4>
                                <p className="text-gray-500 text-sm">Aynı ürün farklı pazaryerlerinde farklı kodlarla, kontrolsüzce listeleniyor.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mt-1">✕</div>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-300">Kopuk Veri Siloları</h4>
                                <p className="text-gray-500 text-sm">Stok Excel'de, fatura başka programda, sipariş pazaryeri panelinde.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mt-1">✕</div>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-300">Manuel Hatalar</h4>
                                <p className="text-gray-500 text-sm">İnsan hatası yüzünden iptal edilen siparişler ve düşen mağaza puanları.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* SOLUTION */}
                <div className="relative p-10 rounded-3xl bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full" />

                    <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                        <CheckCircle2 className="text-blue-500" /> OrtakBarkod Çözümü
                    </h3>

                    <ul className="space-y-6">
                        <li className="flex gap-4 items-center p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">1</div>
                            <div>
                                <h4 className="text-white font-bold">Tek Barkod = Tek Gerçek</h4>
                                <p className="text-blue-200/60 text-sm">Tüm kanallar tek bir ana ürüne bağlanır.</p>
                            </div>
                        </li>
                        <li className="flex gap-4 items-center p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">2</div>
                            <div>
                                <h4 className="text-white font-bold">Canlı Senkronizasyon</h4>
                                <p className="text-blue-200/60 text-sm">Bir satış düştüğünde, stok her yerde aynı anda güncellenir.</p>
                            </div>
                        </li>
                        <li className="flex gap-4 items-center p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">3</div>
                            <div>
                                <h4 className="text-white font-bold">Yapay Zeka Denetimi</h4>
                                <p className="text-blue-200/60 text-sm">Hatalı eşleşmeler ve fiyatlar sistem tarafından yakalanır.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

// 4. MODULES
function ModulesGrid() {
    const { ref, isVisible } = useScrollReveal();
    const modules = [
        { icon: Layers, title: "Ürün Yönetimi", desc: "Global ürün kataloğu ve barkod standardizasyonu." },
        { icon: Globe, title: "Pazaryeri Entegrasyon", desc: "Trendyol, Hepsiburada, Amazon çift yönlü tam entegrasyon." },
        { icon: Box, title: "Sipariş & Kargo", desc: "Tüm siparişleri tek ekrandan yönetin, kargo fişlerini toplu yazdırın." },
        { icon: BarChart3, title: "Fiyat & Stok", desc: "Kritik stok uyarıları ve dinamik fiyat motoru." },
        { icon: Zap, title: "Yapay Zeka", desc: "Satış tahminleri ve anomali tespiti." },
        { icon: CreditCard, title: "Finans & Muhasebe", desc: "Ön muhasebe, fatura takibi ve cari yönetimi." },
    ];

    return (
        <section ref={ref} className={`py-24 bg-[#030712] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">İhtiyacın kadar, ama profesyonel.</h2>
                    <p className="text-gray-400">Modüler yapı sayesinde sadece kullandığınız özelliklere odaklanın.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((m, i) => (
                        <div key={i} className="group p-8 rounded-2xl bg-[#0B1120] border border-gray-800 hover:border-gray-600 hover:bg-[#111827] transition-all cursor-default">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                                <m.icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{m.title}</h3>
                            <p className="text-gray-400 text-sm">{m.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// 5. AI SECTION
function AISection() {
    const { ref, isVisible } = useScrollReveal();
    return (
        <section ref={ref} className={`py-32 bg-[#030712] relative overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-blue-600/5" />
            <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
                <div className="inline-block p-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
                    <Zap size={32} className="text-blue-400 animate-pulse" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    Yapay zeka, gösteriş için değil.<br />
                    <span className="text-blue-500">Kontrol için.</span>
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
                    OrtakBarkod, veriyi sadece toplamaz. Anlamlandırır, uyarır ve karar almanı kolaylaştırır.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    <div className="p-6 bg-[#030712] border border-gray-800 rounded-xl">
                        <div className="text-yellow-500 font-bold text-sm mb-2">⚠ ANOMALİ TESPİTİ</div>
                        <p className="text-gray-300">"X ürününde fiyat %40 düştü, bu normal mi?" diye sorar.</p>
                    </div>
                    <div className="p-6 bg-[#030712] border border-gray-800 rounded-xl">
                        <div className="text-blue-500 font-bold text-sm mb-2">⚡ HATALI EŞLEŞME</div>
                        <p className="text-gray-300">"Bu barkod Trendyol'da tişört, Amazon'da pantolon olarak görünüyor."</p>
                    </div>
                    <div className="p-6 bg-[#030712] border border-gray-800 rounded-xl">
                        <div className="text-green-500 font-bold text-sm mb-2">📈 ÖNGÖRÜ</div>
                        <p className="text-gray-300">"Stok hızı böyle devam ederse 3 gün içinde tükenir."</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// 6. TARGET AUDIENCE
function AudienceSection() {
    const { ref, isVisible } = useScrollReveal();
    return (
        <section ref={ref} className={`py-24 bg-[#030712] border-t border-white/5 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold text-white mb-12">Kimler İçin?</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 bg-[#0B1120] rounded-xl border border-white/5 text-center hover:border-white/20 transition">
                        <Users className="mx-auto mb-3 text-gray-400" />
                        <h3 className="text-white font-bold">Pazaryeri Satıcıları</h3>
                    </div>
                    <div className="p-6 bg-[#0B1120] rounded-xl border border-white/5 text-center hover:border-white/20 transition">
                        <Factory className="mx-auto mb-3 text-gray-400" />
                        <h3 className="text-white font-bold">Üreticiler</h3>
                    </div>
                    <div className="p-6 bg-[#0B1120] rounded-xl border border-white/5 text-center hover:border-white/20 transition">
                        <Truck className="mx-auto mb-3 text-gray-400" />
                        <h3 className="text-white font-bold">Distribütörler</h3>
                    </div>
                    <div className="p-6 bg-[#0B1120] rounded-xl border border-white/5 text-center hover:border-white/20 transition">
                        <Database className="mx-auto mb-3 text-gray-400" />
                        <h3 className="text-white font-bold">Büyük Ekipler</h3>
                    </div>
                </div>
                <p className="mt-8 text-gray-500 text-sm">OrtakBarkod, tek kişilik satıcıdan kurumsal ekiplere kadar ölçeklenir.</p>
            </div>
        </section>
    );
}

// 7. CLOSING
function ClosingSection() {
    return (
        <section className="py-32 bg-gradient-to-b from-[#030712] to-[#0B1120] text-center px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                    Kontrol, bir lüks değil.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Rekabet avantajıdır.</span>
                </h2>
                <p className="text-xl text-gray-400">
                    OrtakBarkod, operasyonu düzene sokmak için değil, büyümeyi mümkün kılmak için tasarlandı.
                </p>
                <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/sign-in" className="px-10 py-5 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-all shadow-xl shadow-white/10">
                        Platformu İncele
                    </Link>
                    <Link href="/demo" className="px-10 py-5 bg-transparent border border-white/20 text-white font-bold text-lg rounded-full hover:bg-white/5 transition-all">
                        Demo Yapıyı Gör
                    </Link>
                </div>
            </div>
        </section>
    );
}

// 8. FOOTER
function Footer() {
    return (
        <footer className="bg-[#02040a] border-t border-white/5 py-12 px-4 text-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">O</div>
                    <span className="text-white font-bold text-lg tracking-tight">OrtakBarkod</span>
                </div>

                <p className="text-gray-500">Global commerce needs a single source of truth.</p>

                <div className="flex gap-6 text-gray-400">
                    <Link href="#" className="hover:text-white transition">Ürün</Link>
                    <Link href="#" className="hover:text-white transition">Platform</Link>
                    <Link href="#" className="hover:text-white transition">Güvenlik</Link>
                    <Link href="#" className="hover:text-white transition">İletişim</Link>
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/5 text-center text-gray-700 text-xs">
                © 2024 OrtakBarkod Inc. Tüm Hakları Saklıdır.
            </div>
        </footer>
    );
}

export default function LandingPage() {
    return (
        <main className="bg-[#030712] min-h-screen text-white font-sans selection:bg-blue-500/30">
            {/* Navbar Placeholder */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-black text-sm">OB</div>
                    <span className="font-bold text-lg tracking-tighter">OrtakBarkod</span>
                </div>
                <div className="hidden md:flex gap-6 text-sm text-gray-400 font-medium">
                    <Link href="#" className="hover:text-white transition">Çözümler</Link>
                    <Link href="#" className="hover:text-white transition">Fiyatlandırma</Link>
                    <Link href="#" className="hover:text-white transition">Kurumsal</Link>
                </div>
                <div className="flex gap-4">
                    <Link href="/sign-in" className="text-sm font-bold text-white hover:text-gray-300 py-2">Giriş Yap</Link>
                    <Link href="/sign-up" className="text-sm font-bold bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition">Kayıt Ol</Link>
                </div>
            </nav>

            <HeroSection />
            <TrustSection />
            <ProblemSolution />
            <ModulesGrid />
            <AISection />
            <AudienceSection />
            <ClosingSection />
            <Footer />
        </main>
    );
}
