import Link from 'next/link';
import { ArrowRight, Check, Package, BarChart3, Globe, ShieldCheck, Zap, Layers, Smartphone } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="overflow-hidden">
            {/* HERO SECTION */}
            <section className="relative pt-32 pb-40">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] z-0 pointer-events-none">
                    <div className="absolute top-[-200px] left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute top-[-100px] right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-md hover:bg-white/10 transition cursor-default">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Yeni Nesil E-Ticaret İşletim Sistemi
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        İşinizi Yönetmenin Geleceği: <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x">Tüm Operasyonunuz Tek Ekranda.</span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        Siparişler, stoklar, pazaryeri entegrasyonları, üretim ve finans... Karmaşık süreçleri bırakın, <span className="text-white font-medium">OrtakBarkod</span> ile büyümeye odaklanın.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
                        <Link href="/sign-up" className="group relative w-full sm:w-auto overflow-hidden rounded-full bg-blue-600 px-9 py-4 text-white text-lg font-bold shadow-2xl shadow-blue-500/25 transition hover:scale-105 active:scale-95 border border-blue-500/50">
                            <span className="relative z-10 flex items-center justify-center gap-2">Hemen Başlayın (Ücretsiz) <ArrowRight size={18} className="group-hover:translate-x-1 transition" /></span>
                            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 transition group-hover:opacity-100"></div>
                        </Link>
                        <button className="w-full sm:w-auto px-9 py-4 bg-white/5 text-white border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-sm group">
                            <Zap size={18} className="text-yellow-400 group-hover:text-yellow-300 transition" /> Nasıl Çalışır? (Video)
                        </button>
                    </div>

                    {/* MOCKUP CONTAINER */}
                    <div className="mt-24 relative mx-auto max-w-6xl animate-in fade-in zoom-in duration-1000 delay-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl opacity-20 blur-xl"></div>
                        <div className="relative rounded-2xl border border-white/10 bg-[#0B1120]/80 backdrop-blur-2xl shadow-2xl overflow-hidden aspect-[16/9] ring-1 ring-white/10">
                            {/* Browser Header Mock */}
                            <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                            {/* Image Placeholder */}
                            <div className="relative w-full h-full bg-[#020617] flex items-center justify-center group">
                                <span className="text-gray-600 text-sm font-mono flex flex-col items-center gap-4">
                                    <Layers size={48} className="text-indigo-500 group-hover:scale-110 transition duration-500" />
                                    <span>DASHBOARD UI PREVIEW</span>
                                </span>
                                {/* Optional: You can put a real image here later */}
                                <img src="/dashboard-preview.png" className="absolute inset-0 w-full h-full object-cover object-left-top opacity-80 hover:opacity-100 transition duration-700" alt="Dashboard" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* INTEGRATION STRIP (SOCIAL PROOF) */}
            <section className="py-12 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm font-medium text-gray-500 mb-8 uppercase tracking-widest">Türkiye'nin önde gelen pazaryerleri ve kargo firmalarıyla tam entegre</p>
                    <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Logos (Text representation for now, replace with SVGs later) */}
                        <span className="text-xl font-bold font-mono tracking-tighter hover:text-orange-500 transition cursor-default">TRENDYOL</span>
                        <span className="text-xl font-bold font-mono tracking-tighter hover:text-orange-600 transition cursor-default">HEPSIBURADA</span>
                        <span className="text-xl font-bold font-mono tracking-tighter hover:text-yellow-500 transition cursor-default">AMAZON</span>
                        <span className="text-xl font-bold font-mono tracking-tighter hover:text-purple-600 transition cursor-default">N11</span>
                        <span className="text-xl font-bold font-mono tracking-tighter hover:text-blue-600 transition cursor-default">ARAS KARGO</span>
                        <span className="text-xl font-bold font-mono tracking-tighter hover:text-blue-800 transition cursor-default">YURTİÇİ KARGO</span>
                    </div>
                </div>
            </section>

            {/* PROBLEM / SOLUTION SECTION */}
            <section className="py-24 bg-[#050B14] relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Hala Karışık <span className="text-red-500 line-through decoration-white/30 decoration-4">Excel Dosyaları</span> ve Manuel Takip ile mi Vakit Kaybediyorsunuz?
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed mb-8">
                                Stoklarınız pazaryerlerinde karışıyor, siparişler gecikiyor, maliyetlerinizi net göremiyor musunuz?
                                <br /><br />
                                Manuel süreçler hataya açıktır ve büyümenizi yavaşlatır. <span className="text-white font-medium">OrtakBarkod</span>, tüm bu kaosu düzenli, otomatik bir sisteme dönüştürür.
                            </p>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3 text-red-400/80">
                                    <ShieldCheck size={20} className="text-red-500" />
                                    <span>Hatalı stok takibi yüzünden ceza ödemeyin.</span>
                                </div>
                                <div className="flex items-center gap-3 text-red-400/80">
                                    <ShieldCheck size={20} className="text-red-500" />
                                    <span>Saatlerce süren fatura kesme işlemlerini bitirin.</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual: Excel vs Dashboard */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 to-indigo-500/20 rounded-full blur-3xl opacity-30"></div>

                            {/* Layered Card Effect */}
                            <div className="relative">
                                {/* Back Card (The "Old Way" - Excel) */}
                                <div className="absolute top-0 right-0 w-3/4 h-64 bg-white/5 border border-white/10 rounded-xl p-4 transform rotate-6 scale-90 opacity-40 blur-[1px]">
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    </div>
                                    <div className="space-y-2 opacity-50">
                                        <div className="h-4 bg-white/20 w-full rounded"></div>
                                        <div className="h-4 bg-white/20 w-3/4 rounded"></div>
                                        <div className="h-4 bg-white/20 w-5/6 rounded"></div>
                                    </div>
                                </div>

                                {/* Front Card (The "New Way" - OrtakBarkod) */}
                                <div className="relative bg-[#111827] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-900/20 hover:scale-[1.02] transition duration-500">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">OB</div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Otomatik Senkronizasyon</div>
                                                <div className="text-green-400 text-xs flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Aktif
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                                            <span className="text-gray-400 text-sm">Trendyol Siparişi #9482</span>
                                            <span className="text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded">Stoktan Düşüldü</span>
                                        </div>
                                        <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                                            <span className="text-gray-400 text-sm">Hepsiburada Eşitleme</span>
                                            <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-1 rounded">Tamamlandı</span>
                                        </div>
                                        <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                                            <span className="text-gray-400 text-sm">Kritik Stok Uyarısı</span>
                                            <span className="text-yellow-400 text-xs bg-yellow-500/10 px-2 py-1 rounded">Bildirim Gönderildi</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURE SHOWCASE (ZIG-ZAG) */}
            <section id="features" className="py-32 relative bg-[#0B1120]">
                <div className="max-w-7xl mx-auto px-6 space-y-32">

                    {/* Feature 1: Marketplace & Stock */}
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                                <Globe size={32} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                Tüm Pazaryerleri Tek Merkezde, <br />
                                <span className="text-blue-500">Stoklarınız Anlık Senkronize.</span>
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                Trendyol, Hepsiburada ve diğerlerindeki mağazalarınızı tek bir panelden yönetin.
                                Bir ürün satıldığında, stok tüm platformlarda otomatik güncellenir.
                                Kritik stok uyarıları ile satış kaçırmayın.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Tek tıkla toplu ürün yükleme ve güncelleme.',
                                    'Pazaryerine özel fiyatlandırma.',
                                    'Anlık stok takibi ve kritik stok alarmı.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition duration-700"></div>
                            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <img src="/image_2.png" alt="Pazaryeri Yönetimi" className="w-full h-auto object-cover transform hover:scale-105 transition duration-700" />
                            </div>
                        </div>
                    </div>

                    {/* Feature 2: Order & Cargo */}
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 mb-6">
                                <Package size={32} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                Siparişten Kargoya: <br />
                                <span className="text-purple-500">Hatasız ve Hızlı Gönderim.</span>
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                Gelen tüm siparişler tek ekrana düşer. Barkod okutarak siparişleri hızla doğrulayın,
                                kargo etiketlerini otomatik oluşturun ve müşterilerinize anlık bildirim gönderin.
                                İadeleri kolayca yönetin.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Otomatik fatura ve kargo etiketi oluşturma.',
                                    'Barkod kontrollü paketleme (Hatasız gönderim).',
                                    'Entegre iade ve değişim yönetimi.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition duration-700"></div>
                            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <img src="/image_9.png" alt="Sipariş Yönetimi" className="w-full h-auto object-cover transform hover:scale-105 transition duration-700" />
                            </div>
                        </div>
                    </div>

                    {/* Feature 3: Production & Planning */}
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                                <Layers size={32} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                Üreticiler İçin: <br />
                                <span className="text-green-500">Hammadden Teslimata Tam Kontrol.</span>
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                Sadece al-sat yapmıyor, üretiyor musunuz? Reçetelerinizi oluşturun, üretim emirleri verin,
                                hammadde stoklarını takip edin ve üretim aşamalarını canlı izleyin.
                                Maliyetlerinizi netleştirin.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Dinamik reçete oluşturma ve maliyet hesabı.',
                                    'İş emri takibi ve personel atama.',
                                    'Hammadde ihtiyaç planlama.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition duration-700"></div>
                            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <img src="/image_7.png" alt="Üretim Yönetimi" className="w-full h-auto object-cover transform hover:scale-105 transition duration-700" />
                            </div>
                        </div>
                    </div>

                    {/* Feature 4: Finance Cockpit */}
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="w-16 h-16 bg-pink-600/20 rounded-2xl flex items-center justify-center text-pink-500 mb-6">
                                <BarChart3 size={32} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                İşletmenizin Finansal Sağlığı <br />
                                <span className="text-pink-500">Parmaklarınızın Ucunda.</span>
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                Tahmini değil, gerçek verilerle karar alın. Günlük ciro, net kâr, bekleyen alacaklar ve borçlar...
                                Detaylı finansal raporlarla işletmenizin rotasını net bir şekilde çizin.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Günlük, haftalık ve aylık kâr/zarar analizi.',
                                    'Nakit akışı takibi (Kasa & Banka).',
                                    'Tedarikçi ve müşteri bakiye raporları.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition duration-700"></div>
                            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <img src="/image_5.png" alt="Finansal Raporlama" className="w-full h-auto object-cover transform hover:scale-105 transition duration-700" />
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" className="py-32 relative bg-[#020617]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-indigo-900/5 skew-y-6 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Şeffaf Fiyatlandırma. <span className="text-indigo-400">Sürpriz Maliyet Yok.</span></h2>
                        <p className="text-gray-400 text-lg">Taahhüt yok. Kart bilgisi gerekmez. Ücretsiz deneyin.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <PricingCard
                            name="Başlangıç"
                            price="10.000"
                            features={['2 Kullanıcı', '1.000 Ürün', 'Temel Raporlar', 'E-posta Desteği']}
                            buttonText="Seç"
                        />
                        <PricingCard
                            name="Pro"
                            price="18.000"
                            isPopular
                            features={['10 Kullanıcı', '10.000 Ürün', 'Pazaryeri Entegrasyonu', 'Gelişmiş Raporlar', 'Öncelikli Destek']}
                            buttonText="Başla"
                        />
                        <PricingCard
                            name="Extram"
                            price="50.000"
                            features={['Sınırsız Kullanıcı', 'Limitsiz Ürün', 'Özel SLA', 'API Erişimi', 'Size Özel Geliştirme']}
                            buttonText="İletişime Geç"
                        />
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-32 relative overflow-hidden bg-[#0B1120]">
                <div className="max-w-5xl mx-auto px-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] opacity-20 blur-xl transform rotate-1"></div>
                    <div className="bg-[#111827] border border-white/10 rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition duration-700"></div>

                        <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight relative z-10 leading-tight">
                            İşinizi Büyütmeye <br /> Hazır Mısınız?
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto relative z-10">
                            Binlerce işletme OrtakBarkod ile operasyonlarını dijitalleştirdi. Şimdi sıra sizde.
                            Kredi kartı gerekmeden 14 gün ücretsiz deneyin.
                        </p>

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/sign-up" className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition flex items-center gap-2 group">
                                Ücretsiz Deneme Hesabınızı Oluşturun <ArrowRight className="ml-2 group-hover:translate-x-1 transition" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}

function PricingCard({ name, price, features, isPopular, buttonText = "Seç" }: { name: string, price: string, features: string[], isPopular?: boolean, buttonText?: string }) {
    return (
        <div className={`relative p-8 rounded-3xl border transition duration-500 flex flex-col ${isPopular
            ? 'border-indigo-500 bg-[#0F1629] shadow-2xl shadow-indigo-500/20 scale-105 z-10'
            : 'border-white/5 bg-[#0B1120] text-gray-400 hover:border-white/10'}`}>

            {isPopular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider shadow-lg">
                    En Çok Tercih Edilen
                </div>
            )}

            <h3 className={`text-lg font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-300'}`}>{name}</h3>
            <div className="text-4xl font-black text-white mb-6 flex items-baseline gap-1">
                {price} {price !== 'Teklif' && <span className="text-sm font-medium text-gray-500">₺/ay</span>}
            </div>

            <ul className="space-y-4 mb-8 flex-1">
                {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
                            <Check size={12} strokeWidth={3} />
                        </div>
                        <span className={isPopular ? 'text-gray-300' : 'text-gray-500'}>{f}</span>
                    </li>
                ))}
            </ul>

            <Link href="/sign-up" className={`block w-full py-4 rounded-xl font-bold text-center transition ${isPopular
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25'
                : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>
                {buttonText}
            </Link>
        </div>
    )
}
