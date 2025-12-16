"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Filter, Plus, Search, MapPin, Briefcase, Calendar, Phone, ArrowRight, User } from 'lucide-react';
import { getPersonnelAction } from '@/app/actions/personnelActions';

export default function PersonnelListPage() {
    const [personnel, setPersonnel] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState("Tümü");
    const [filterDept, setFilterDept] = useState("Tümü");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchPersonnel();
    }, []);

    async function fetchPersonnel() {
        setLoading(true);
        try {
            const data = await getPersonnelAction();
            if (data) setPersonnel(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const filteredPersonnel = personnel.filter(p => {
        const matchRole = filterRole === "Tümü" || p.role === filterRole;
        const matchDept = filterDept === "Tümü" || p.department === filterDept;
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.phone && p.phone.includes(searchTerm));
        return matchRole && matchDept && matchSearch;
    });

    const roles = Array.from(new Set(personnel.map(p => p.role).filter(Boolean)));
    const depts = Array.from(new Set(personnel.map(p => p.department).filter(Boolean)));

    return (
        <div className="min-h-screen bg-[#0B1120] text-gray-200 p-6 md:p-8 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="text-blue-500" size={32} />
                        Personel Yönetimi
                    </h1>
                    <p className="text-gray-400 mt-1">Takım arkadaşlarınızı yönetin, maaş ve izinleri takip edin.</p>
                </div>
                <Link href="/muhasebe/personel/yeni" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all hover:scale-105">
                    <Plus size={20} /> Yeni Personel Ekle
                </Link>
            </div>

            {/* Sub Menu Links */}
            <div className="flex flex-wrap gap-4 mb-8 text-sm font-bold border-b border-gray-800 pb-1">
                <Link href="/muhasebe/personel" className="px-4 py-2 text-blue-400 border-b-2 border-blue-500 bg-blue-900/10 rounded-t-lg">Personel Listesi</Link>
                <Link href="/muhasebe/personel/maas-mesai" className="px-4 py-2 text-gray-500 hover:text-white transition">Maaş & Mesai</Link>
                <Link href="/muhasebe/personel/avans" className="px-4 py-2 text-gray-500 hover:text-white transition">Avans Yönetimi</Link>
                <Link href="/muhasebe/personel/raporlar" className="px-4 py-2 text-gray-500 hover:text-white transition">Hak Edişler</Link>
            </div>

            {/* Filters */}
            <div className="bg-[#1f2937]/50 p-4 rounded-2xl border border-gray-800 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="İsim veya telefon ara..."
                        className="w-full bg-[#111827] border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:border-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto">
                    <select
                        className="bg-[#111827] border border-gray-700 text-gray-300 px-4 py-3 rounded-xl outline-none focus:border-blue-500"
                        value={filterRole} onChange={e => setFilterRole(e.target.value)}
                    >
                        <option value="Tümü">Tüm Görevler</option>
                        {roles.map((r: any) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                        className="bg-[#111827] border border-gray-700 text-gray-300 px-4 py-3 rounded-xl outline-none focus:border-blue-500"
                        value={filterDept} onChange={e => setFilterDept(e.target.value)}
                    >
                        <option value="Tümü">Tüm Departmanlar</option>
                        {depts.map((d: any) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
            ) : filteredPersonnel.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/30">
                    <Users size={64} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500">Kayıtlı personel bulunamadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPersonnel.map(p => (
                        <div key={p.id} className="bg-[#161f32] border border-gray-800 hover:border-gray-600 rounded-2xl p-6 shadow-xl relative group transition-all">
                            <div className="absolute top-4 right-4">
                                <span className={`w-3 h-3 rounded-full inline-block ${p.is_active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                {p.photo_url ? (
                                    <img src={p.photo_url} alt={p.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-700" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 border-2 border-gray-700">
                                        <User size={32} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                                    <span className="text-blue-400 text-sm font-medium bg-blue-900/20 px-2 py-0.5 rounded">{p.role || 'Belirtilmemiş'}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <Briefcase size={16} className="text-gray-600" />
                                    <span>{p.department || 'Departman Yok'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <MapPin size={16} className="text-gray-600" />
                                    <span className="truncate">{p.address || 'Adres Girilmemiş'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <Phone size={16} className="text-gray-600" />
                                    <span>{p.phone || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <Calendar size={16} className="text-gray-600" />
                                    <span>Giriş: {p.start_date ? new Date(p.start_date).toLocaleDateString('tr-TR') : '-'}</span>
                                </div>
                            </div>

                            <Link
                                href={`/muhasebe/personel/${p.id}`}
                                className="w-full bg-[#1F2937] hover:bg-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                            >
                                Detay Görüntüle <ArrowRight size={16} />
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
