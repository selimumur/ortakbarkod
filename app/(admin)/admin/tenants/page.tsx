"use client";

import { useEffect, useState } from 'react';
import { getTenantsAction, createManualSubscriptionAction, createManualUserAction } from '@/app/actions/adminActions';
import { toast } from 'sonner';
import { Loader2, Plus, Search, UserPlus } from 'lucide-react';

export default function TenantsPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expiringFilter, setExpiringFilter] = useState("all");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState("");
    const [selectedPlan, setSelectedPlan] = useState("starter");
    const [selectedDuration, setSelectedDuration] = useState("30");

    // Create User Modal State
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        companyName: '',
        fullName: '',
        email: '',
        password: '',
        planId: 'starter',
        durationDays: 14 // Default to 14 Day Trial
    });

    const loadTenants = async () => {
        setLoading(true);
        try {
            const data = await getTenantsAction({
                search: searchTerm,
                status: statusFilter,
                expiringIn: expiringFilter === 'all' ? undefined : expiringFilter as any
            });
            setTenants(data || []);
        } catch (error) {
            toast.error("Kiracılar çekilemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            loadTenants();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, expiringFilter]);

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password || !newUser.companyName) return toast.error("Tüm alanları doldurun.");

        try {
            const toastId = toast.loading("Kullanıcı oluşturuluyor...");
            const res = await createManualUserAction(newUser);
            toast.dismiss(toastId);

            if (res.success) {
                toast.success("Müşteri başarıyla oluşturuldu.");
                setIsCreateUserOpen(false);
                setNewUser({ companyName: '', fullName: '', email: '', password: '', planId: 'starter', durationDays: 30 });
                loadTenants();
            } else {
                toast.error(res.error || "Hata oluştu.");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleManualSub = async () => {
        if (!selectedTenantId) return toast.error("Tenant ID gerekli");

        try {
            const res = await createManualSubscriptionAction(selectedTenantId, selectedPlan, Number(selectedDuration));
            if (res.success) {
                toast.success("Abonelik tanımlandı.");
                setIsModalOpen(false);
                loadTenants();
            } else {
                toast.error(res.error || "Bir hata oluştu.");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Müşteri Yönetimi (Tenants)</h1>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            const toastId = toast.loading("Senkronizasyon yapılıyor...");
                            const { syncClerkUsersAction } = await import('@/app/actions/adminActions');
                            const res = await syncClerkUsersAction();
                            toast.dismiss(toastId);
                            if (res.success) {
                                toast.success(res.message);
                                loadTenants();
                            } else {
                                toast.error(res.error);
                            }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
                        <Loader2 size={16} /> Senkronize Et
                    </button>
                    <button
                        onClick={() => setIsCreateUserOpen(true)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
                        <UserPlus size={16} /> Yeni Müşteri Ekle
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
                        <Plus size={16} /> Manuel Yetki Ver
                    </button>
                </div>
            </div>

            <div className="bg-[#0B1120] border border-white/10 rounded-xl p-4">
                {/* FILTERS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg border border-white/5 w-full">
                        <Search className="text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Firma, ID veya Yetkili Ara..."
                            className="bg-transparent text-sm w-full outline-none text-white placeholder-gray-600"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Status */}
                    <select
                        className="bg-gray-900/50 border border-white/5 text-gray-400 text-sm rounded-lg p-2 outline-none"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme (Trial)</option>
                        <option value="past_due">Gecikmiş</option>
                        <option value="canceled">İptal</option>
                        <option value="detected">Tespit Edilen (Kayıtsız)</option>
                    </select>
                    {/* Expiring Filter */}
                    <select
                        className="bg-gray-900/50 border border-white/5 text-gray-400 text-sm rounded-lg p-2 outline-none"
                        value={expiringFilter}
                        onChange={e => setExpiringFilter(e.target.value)}
                    >
                        <option value="all">Tüm Süreler</option>
                        <option value="10_days">10 Gün Kaldı</option>
                        <option value="30_days">1 Ay Kaldı</option>
                        <option value="expired">Süresi Dolmuş</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-gray-500 uppercase text-xs border-b border-white/10 bg-white/5">
                            <tr>
                                <th className="p-3">Tenant ID</th>
                                <th className="p-3">Firma</th>
                                <th className="p-3">Yetkili</th>
                                <th className="p-3">Plan</th>
                                <th className="p-3">Durum</th>
                                <th className="p-3">Başlangıç</th>
                                <th className="p-3">Bitiş</th>
                                <th className="p-3">Tür</th>
                                <th className="p-3">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={9} className="p-4 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                            ) : tenants.length === 0 ? (
                                <tr><td colSpan={9} className="p-4 text-center">Kayıt bulunamadı.</td></tr>
                            ) : (
                                tenants.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/5 transition">
                                        <td className="p-3 font-mono text-white text-xs text-gray-400">{t.tenant_id}</td>
                                        <td className="p-3 font-bold text-white">{t.company_name}</td>
                                        <td className="p-3 text-xs">
                                            <div className="text-white">{t.contact_name}</div>
                                            <div className="text-gray-500">{t.contact_phone}</div>
                                        </td>
                                        <td className="p-3">
                                            {t.plan_id === 'legacy' ? (
                                                <span className="text-xs italic text-gray-500">Yok</span>
                                            ) : (
                                                <span className="uppercase font-bold text-xs px-2 py-1 rounded bg-gray-800">{t.plan_id}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${t.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                                t.status === 'trial' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' :
                                                    t.status === 'detected' ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' :
                                                        'border-gray-600'
                                                }`}>
                                                {t.status === 'detected' ? 'Tespit Edildi' : t.status === 'trial' ? 'Deneme (Trial)' : t.status}
                                            </span>
                                        </td>
                                        <td className="p-3">{new Date(t.start_date).toLocaleDateString()}</td>
                                        <td className="p-3 text-xs">{t.current_period_end ? new Date(t.current_period_end).toLocaleDateString() : 'Süresiz'}</td>
                                        <td className="p-3">{t.is_manual ? <span className="text-yellow-500 text-xs">Manuel</span> : 'Otomatik'}</td>
                                        <td className="p-3">
                                            {t.status === 'detected' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedTenantId(t.tenant_id);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs px-2 py-1 rounded border border-blue-600/30 transition mr-2"
                                                >
                                                    Aktifleştir
                                                </button>
                                            )}
                                            <a
                                                href={`/admin/tenants/${t.tenant_id}`}
                                                className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded border border-white/10 transition"
                                            >
                                                Yönet
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE USER MODAL */}
            {isCreateUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121826] border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Yeni Müşteri Oluştur (Admin)</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Firma Adı</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                    value={newUser.companyName}
                                    onChange={e => setNewUser({ ...newUser, companyName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Yetkili Ad Soyad</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newUser.fullName}
                                        onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Şifre</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                    placeholder="Müşteriye verilecek şifre"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Paket</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newUser.planId}
                                        onChange={e => setNewUser({ ...newUser, planId: e.target.value })}
                                    >
                                        <option value="starter">Başlangıç</option>
                                        <option value="pro">Pro</option>
                                        <option value="extreme">Extram</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Süre (Gün)</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newUser.durationDays}
                                        onChange={e => setNewUser({ ...newUser, durationDays: Number(e.target.value) })}
                                    >
                                        <option value={14}>14 Gün (Deneme)</option>
                                        <option value={30}>30 Gün</option>
                                        <option value={365}>1 Yıl</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsCreateUserOpen(false)} className="px-4 py-2 rounded hover:bg-white/5 transition text-sm">İptal</button>
                            <button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white font-bold text-sm">Oluştur</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANUAL MANAGE SUBSCRIPTION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121826] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Manuel Abonelik Tanımla</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Tenant ID (Org ID)</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm font-mono"
                                    value={selectedTenantId}
                                    onChange={e => setSelectedTenantId(e.target.value)}
                                    placeholder="org_..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Paket</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={selectedPlan}
                                        onChange={e => setSelectedPlan(e.target.value)}
                                    >
                                        <option value="starter">Başlangıç</option>
                                        <option value="pro">Pro</option>
                                        <option value="extreme">Extram</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Süre (Gün)</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={selectedDuration}
                                        onChange={e => setSelectedDuration(e.target.value)}
                                    >
                                        <option value="7">7 Gün</option>
                                        <option value="14">14 Gün</option>
                                        <option value="30">30 Gün</option>
                                        <option value="365">1 Yıl</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded hover:bg-white/5 transition text-sm">İptal</button>
                            <button onClick={handleManualSub} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold text-sm">Tanımla</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
