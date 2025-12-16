"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, Building, Settings,
    ShieldAlert, Activity, LifeBuoy, LogOut
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

export default function AdminSidebar() {
    const pathname = usePathname();

    const linkClass = (path: string) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${pathname === path
        ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] border-r border-red-900/20 flex flex-col">

            {/* HEADER */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                        <ShieldAlert size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white">GOD MODE</h1>
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Süper Admin</p>
                    </div>
                </div>
            </div>

            {/* NAV */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                <Link href="/admin" className={linkClass('/admin')}>
                    <LayoutDashboard size={18} />
                    <span>Genel Bakış</span>
                </Link>

                <div className="pt-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4">Platform</div>

                <Link href="/admin/tenants" className={linkClass('/admin/tenants')}>
                    <Building size={18} />
                    <span>Müşteriler (Tenants)</span>
                </Link>
                <Link href="/admin/users" className={linkClass('/admin/users')}>
                    <Users size={18} />
                    <span>Kullanıcılar</span>
                </Link>

                <Link href="/admin/plans" className={linkClass('/admin/plans')}>
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded border border-current text-[10px] font-bold">P</span>
                    <span>Paket Yönetimi</span>
                </Link>
                <Link href="/admin/modules" className={linkClass('/admin/modules')}>
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded border border-current text-[10px] font-bold">M</span>
                    <span>Modül Yönetimi</span>
                </Link>

                <div className="pt-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4">Finans & Destek</div>

                <Link href="/admin/finance/approvals" className={linkClass('/admin/finance/approvals')}>
                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded border border-current text-[10px] font-bold">₺</span>
                    <span>Ödeme Onayları</span>
                </Link>
                <Link href="/admin/settings" className={linkClass('/admin/settings')}>
                    <Settings size={18} />
                    <span>Ayarlar & Bakım</span>
                </Link>
                <Link href="/admin/support" className={linkClass('/admin/support')}>
                    <LifeBuoy size={18} />
                    <span>Destek Merkezi</span>
                </Link>

                <div className="mt-8 pt-4 border-t border-gray-800">
                    <Link href="/admin/system" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${pathname === '/admin/system' ? 'text-green-500 bg-green-900/20' : 'text-gray-600 hover:text-green-500 hover:bg-gray-900'
                        }`}>
                        <Activity size={18} />
                        <span>GOD MODE</span>
                    </Link>
                </div>
            </nav>

            {/* FOOTER */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between">
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                userButtonAvatarBox: "w-10 h-10 border-2 border-red-600/50"
                            }
                        }}
                    />
                    <div className="text-right">
                        <p className="text-xs font-bold text-white">Yönetici</p>
                        <div className="flex items-center gap-1 text-[10px] text-green-500">
                            <Activity size={10} />
                            <span>Sistem Aktif</span>
                        </div>
                    </div>
                </div>
            </div>

        </aside>
    );
}
