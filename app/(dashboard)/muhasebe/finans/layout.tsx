"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Landmark,
    Wallet,
    ScrollText,
    CreditCard,
    Percent,
    FileBarChart
} from 'lucide-react';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const menuItems = [
        { href: '/muhasebe/finans', label: 'Özet', icon: <LayoutDashboard size={18} /> },
        { href: '/muhasebe/finans/bankalar', label: 'Bankalar', icon: <Landmark size={18} /> },
        { href: '/muhasebe/finans/kasalar', label: 'Kasalar', icon: <Wallet size={18} /> },
        { href: '/muhasebe/finans/cek-senet', label: 'Çek & Senet', icon: <ScrollText size={18} /> },
        { href: '/muhasebe/finans/kartlar', label: 'Kredi Kartları', icon: <CreditCard size={18} /> },
        { href: '/muhasebe/finans/krediler', label: 'Krediler', icon: <Percent size={18} /> },
        { href: '/muhasebe/finans/raporlar', label: 'Raporlar', icon: <FileBarChart size={18} /> },
    ];

    return (
        <div className="flex flex-col h-full bg-[#0B1120] text-gray-200">
            {/* Üst Navigasyon Çubuğu */}
            <div className="bg-[#0F172A] border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-none">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-auto p-6 md:p-8">
                {children}
            </div>
        </div>
    );
}
