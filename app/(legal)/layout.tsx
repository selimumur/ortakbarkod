import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Simple Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-gray-900">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                            <ShieldCheck size={18} />
                        </div>
                        OrtakBarkod <span className="text-gray-400 font-normal">Yasal</span>
                    </Link>
                    <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1">
                        <ArrowLeft size={16} /> Ana Sayfaya Dön
                    </Link>
                </div>
            </header>

            {/* Content Wrapper */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 md:p-12">
                    {children}
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-gray-200 bg-white py-12 mt-12">
                <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} OrtakBarkod Yazılım A.Ş. Tüm hakları saklıdır.</p>
                    <div className="flex justify-center gap-6 mt-4">
                        <Link href="/yasal/gizlilik" className="hover:text-gray-900">Gizlilik</Link>
                        <Link href="/yasal/kullanim-kosullari" className="hover:text-gray-900">Kullanım Koşulları</Link>
                        <Link href="/yasal/kvkk" className="hover:text-gray-900">KVKK</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
