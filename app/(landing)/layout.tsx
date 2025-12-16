import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-indigo-500/30">
            {/* NAVIGATION */}
            <Navbar />

            {/* MAIN CONTENT */}
            <main>
                {children}
            </main>

            {/* FOOTER */}
            <footer className="bg-[#020617] border-t border-white/5 py-16 text-sm">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <Link href="/" className="text-2xl font-black text-white tracking-tighter mb-6 block">OrtakBarkod</Link>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Modern işletmeler için yeni nesil e-ticaret ve stok yönetim platformu.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Ürün</h4>
                            <ul className="space-y-4 text-gray-500">
                                <li><Link href="/#features" className="hover:text-white transition">Özellikler</Link></li>
                                <li><Link href="/#pricing" className="hover:text-white transition">Fiyatlandırma</Link></li>
                                <li><Link href="/ozellikler/stok" className="hover:text-white transition">Stok Takibi</Link></li>
                                <li><Link href="/ozellikler/entegrasyon" className="hover:text-white transition">Entegrasyonlar</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Kurumsal</h4>
                            <ul className="space-y-4 text-gray-500">
                                <li><Link href="/hakkimizda" className="hover:text-white transition">Hakkımızda</Link></li>
                                <li><Link href="/iletisim" className="hover:text-white transition">İletişim</Link></li>
                                <li><Link href="/kariyer" className="hover:text-white transition">Kariyer</Link></li>
                                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Destek</h4>
                            <ul className="space-y-4 text-gray-500">
                                <li><Link href="/yardim" className="hover:text-white transition">Yardım Merkezi</Link></li>
                                <li><Link href="/yasal/kullanim-kosullari" className="hover:text-white transition">Kullanım Şartları</Link></li>
                                <li><Link href="/yasal/gizlilik" className="hover:text-white transition">Gizlilik Politikası</Link></li>
                                <li><Link href="/status" className="hover:text-white transition">Sistem Durumu</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-600">
                        <p>&copy; {new Date().getFullYear()} OrtakBarkod Yazılım A.Ş. Tüm hakları saklıdır.</p>
                        <div className="flex items-center gap-6">
                            {/* Social Icons Placeholder */}
                            <div className="w-5 h-5 bg-gray-800 rounded-full"></div>
                            <div className="w-5 h-5 bg-gray-800 rounded-full"></div>
                            <div className="w-5 h-5 bg-gray-800 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
