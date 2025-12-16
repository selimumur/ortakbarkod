'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-2xl font-black tracking-tighter flex items-center gap-2 group">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <div className="absolute inset-0 bg-indigo-500 rounded-lg rotate-0 group-hover:rotate-6 transition duration-300 opacity-25 blur-md"></div>
                        <span className="relative z-10 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                        </span>
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">OrtakBarkod</span>
                    <span className="ml-2 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full tracking-wider uppercase">BETA</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                    <Link href="#features" className="hover:text-white transition hover:scale-105 transform">Özellikler</Link>
                    <Link href="#solutions" className="hover:text-white transition hover:scale-105 transform">Çözümler</Link>
                    <Link href="#pricing" className="hover:text-white transition hover:scale-105 transform">Fiyatlandırma</Link>
                    <Link href="/iletisim" className="hover:text-white transition hover:scale-105 transform">İletişim</Link>
                </div>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/sign-in" className="text-sm font-bold text-gray-300 hover:text-white transition">Giriş Yap</Link>
                    <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition shadow-lg shadow-blue-500/25 flex items-center gap-2 group border border-blue-500/50">
                        Ücretsiz Dene <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white p-2"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-20 left-0 w-full bg-[#020617] border-b border-white/5 p-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <Link
                        href="#features"
                        className="text-gray-400 font-medium hover:text-white transition"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Özellikler
                    </Link>
                    <Link
                        href="#pricing"
                        className="text-gray-400 font-medium hover:text-white transition"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Fiyatlar
                    </Link>
                    <Link
                        href="/yasal/gizlilik"
                        className="text-gray-400 font-medium hover:text-white transition"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Güvenlik
                    </Link>
                    <hr className="border-white/5" />
                    <Link
                        href="/sign-in"
                        className="text-white font-bold text-lg hover:text-indigo-400 transition"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Giriş Yap
                    </Link>
                    <Link
                        href="/sign-up"
                        className="bg-white text-black w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Ücretsiz Dene <ArrowRight size={18} />
                    </Link>
                </div>
            )}
        </nav>
    );
}
