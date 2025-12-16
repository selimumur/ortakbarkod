"use client";

import { useEffect, useState } from 'react';
import { getTenantsAction } from '@/app/actions/adminActions';
import { Loader2, Search, Shield, Building, Ban, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Since we use Clerk, we don't have a direct 'users' table sync yet.
// We will display TENANTS (Organizations) as the primary entities here.
export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch Tenants as proxies for "Admin Users"
                const data = await getTenantsAction();
                setUsers(data || []);
            } catch (error) {
                toast.error("Kullanıcılar yüklenemedi.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = users.filter(u => u.tenant_id.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Global Kullanıcı Yönetimi</h1>
            <p className="text-gray-400 text-sm">
                Not: Şu an sadece Organizasyon Sahipleri (Tenantlar) listelenmektedir.
                Alt kullanıcılar Clerk panelinden yönetilmektedir.
            </p>

            {/* SEARCH */}
            <div className="bg-[#0B1120] border border-white/10 rounded-xl flex items-center px-4 p-2">
                <Search className="text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="Organizasyon ID ile ara..."
                    className="bg-transparent border-none outline-none text-white text-sm p-2 w-full"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* TABLE */}
            <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-black/20 text-gray-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="p-4">Organizasyon (User)</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4">Plan</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center">Kullanıcı bulunamadı.</td></tr>
                        ) : (
                            filtered.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5 transition group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                                {u.tenant_id.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white font-mono">{u.tenant_id}</p>
                                                <p className="text-xs text-gray-500">Organizasyon Sahibi</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="flex items-center gap-1 text-xs bg-gray-800 px-2 py-1 rounded border border-gray-700 w-fit">
                                            <Shield size={10} /> Admin
                                        </span>
                                    </td>
                                    <td className="p-4 text-white">
                                        <div className="flex items-center gap-2">
                                            <Building size={14} className="text-gray-500" />
                                            <span className="uppercase">{u.plan_id}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${u.status === 'active' ? 'text-green-400 bg-green-900/20' :
                                                u.status === 'detected' ? 'text-orange-400 bg-orange-900/20' :
                                                    'text-gray-400 bg-gray-900/20'
                                            }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition">
                                            <button title="Detay" className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Lock size={16} /></button>
                                            <button title="Banla" className="p-2 hover:bg-red-600 rounded-lg text-gray-400 hover:text-white bg-red-500/10 border border-red-500/20"><Ban size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
