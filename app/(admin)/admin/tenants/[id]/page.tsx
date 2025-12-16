"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTenantDetailsAction, manualSubscriptionGrantAction } from '@/app/actions/adminActions';
import { toast } from 'sonner';
import {
    Building2, User, CreditCard, Calendar, Shield, Activity,
    ArrowLeft, Save, Ban, LogIn, Clock, Gift
} from 'lucide-react';

export default function TenantDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Manual Grant Mode
    const [grantMode, setGrantMode] = useState(false);
    const [grantPlan, setGrantPlan] = useState('pro');
    const [grantDays, setGrantDays] = useState(30);
    const [grantNote, setGrantNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getTenantDetailsAction(id as string);
            setData(res);
        } catch (e) {
            console.error(e);
            toast.error("Veriler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleGrant = async () => {
        if (grantDays < 1) return toast.error("Gün sayısı geçersiz.");
        setSubmitting(true);
        try {
            await manualSubscriptionGrantAction(id as string, grantPlan, grantDays, grantNote);
            toast.success("Abonelik manuel olarak tanımlandı.");
            setGrantMode(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-white">Yükleniyor...</div>;
    if (!data) return <div className="p-8 text-red-400">Tenant bulunamadı.</div>;

    const { company, profile, subscription } = data;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 mb-4">
                <ArrowLeft size={16} /> Listeye Dön
            </button>

            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-900/20">
                        {(company.name?.substring(0, 2) || id?.toString().substring(0, 2)).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{company.name || 'Firma Adı Yok'}</h1>
                        <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                            <span className="bg-white/5 px-2 py-0.5 rounded">{id}</span>
                            {subscription?.status === 'active' && <span className="text-green-500 flex items-center gap-1"><Activity size={12} /> Aktif</span>}
                            {subscription?.is_manual && <span className="text-yellow-500 flex items-center gap-1 text-xs border border-yellow-500/20 px-2 rounded-full">Manuel</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-white/10" disabled>
                        <LogIn size={16} /> Panel'e Gir (Yakında)
                    </button>
                    <button className="bg-red-900/20 hover:bg-red-900/40 text-red-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-red-500/20">
                        <Ban size={16} /> Yasakla
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* COLUMN 1: COMPANY & CONTACT */}
                <div className="space-y-6">
                    <div className="bg-[#0B1120] border border-white/10 rounded-xl p-5">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Building2 size={14} /> Firma Bilgileri
                        </h3>
                        {company.name ? (
                            <div className="space-y-3 text-sm">
                                <div><span className="block text-gray-500 text-xs">Unvan</span><span className="text-white font-medium">{company.name}</span></div>
                                <div><span className="block text-gray-500 text-xs">Vergi No</span><span className="text-white">{company.tax_id || '-'}</span></div>
                                <div><span className="block text-gray-500 text-xs">Sektör</span><span className="text-white">{company.sector || '-'}</span></div>
                            </div>
                        ) : <div className="text-gray-500 text-sm italic">Firma bilgisi girilmemiş.</div>}
                    </div>

                    <div className="bg-[#0B1120] border border-white/10 rounded-xl p-5">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User size={14} /> Yetkili Kişi
                        </h3>
                        {profile.id ? (
                            <div className="space-y-3 text-sm">
                                <div className="text-white font-bold">{profile.full_name || 'İsimsiz'}</div>
                                <div><a href={`mailto:${profile.email}`} className="text-blue-400 hover:underline">{profile.email}</a></div>
                                <div><span className="text-white">{profile.phone || '-'}</span></div>
                            </div>
                        ) : <div className="text-gray-500 text-sm italic">Profil bulunamadı.</div>}
                    </div>
                </div>

                {/* COLUMN 2 & 3: SUBSCRIPTION MANAGEMENT */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[#0B1120] border border-white/10 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5"><Shield size={120} /></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                <CreditCard size={20} className="text-purple-400" /> Abonelik Yönetimi
                            </h3>
                            <button
                                onClick={() => setGrantMode(!grantMode)}
                                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded transition flex items-center gap-2 font-bold shadow-lg shadow-purple-900/20">
                                <Gift size={14} /> {grantMode ? 'İptal' : 'Hediye / Manuel Tanımla'}
                            </button>
                        </div>

                        {grantMode ? (
                            <div className="space-y-4 relative z-10 bg-black/20 p-4 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                                <h4 className="text-white font-bold text-sm mb-2">Manuel Yetkilendirme (Hediye/Telafi)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Paket</label>
                                        <select
                                            value={grantPlan}
                                            onChange={e => setGrantPlan(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        >
                                            <option value="starter">Başlangıç</option>
                                            <option value="pro">Pro</option>
                                            <option value="extreme">Extram</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Ek Süre (Gün)</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setGrantDays(30)} className={`flex-1 text-xs border rounded ${grantDays === 30 ? 'bg-white text-black font-bold' : 'text-gray-400 border-gray-700'}`}>30 Gün</button>
                                            <button onClick={() => setGrantDays(365)} className={`flex-1 text-xs border rounded ${grantDays === 365 ? 'bg-white text-black font-bold' : 'text-gray-400 border-gray-700'}`}>1 Yıl</button>
                                            <input type="number" value={grantDays} onChange={e => setGrantDays(Number(e.target.value))} className="w-16 bg-gray-900 border border-gray-700 rounded text-center text-white text-xs" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Not (Opsiyonel)</label>
                                    <input type="text" value={grantNote} onChange={e => setGrantNote(e.target.value)} placeholder="Örn: Telafi amaçlı verildi" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm" />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button onClick={handleGrant} disabled={submitting} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded flex items-center gap-2 text-sm font-bold shadow-lg shadow-green-900/20">
                                        <Save size={16} /> {submitting ? 'İşleniyor...' : 'Tanımla ve Kaydet'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-8 relative z-10">
                                <div>
                                    <span className="block text-gray-500 text-xs mb-1">Mevcut Paket</span>
                                    <div className="text-3xl font-black text-white uppercase tracking-tight">{subscription?.plan_id || 'YOK'}</div>
                                    <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-2 border ${subscription?.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-gray-600 text-gray-400'
                                        }`}>
                                        {subscription?.status || 'Inactive'}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs mb-1">Bitiş Tarihi</span>
                                    <div className="text-xl font-bold text-white flex items-center gap-2">
                                        <Calendar size={18} className="text-gray-400" />
                                        {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Süresiz'}
                                    </div>
                                    {subscription?.current_period_end && (
                                        <div className="text-sm text-gray-400 mt-1">
                                            {Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün kaldı
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#0B1120] border border-white/10 rounded-xl p-5">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Ödeme Geçmişi (Son 5)</h3>
                        <table className="w-full text-left text-xs text-gray-400">
                            <thead className="border-b border-white/5 uppercase">
                                <tr>
                                    <th className="py-2">Tarih</th>
                                    <th className="py-2">Tutar</th>
                                    <th className="py-2">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.payments.length === 0 ? (
                                    <tr><td colSpan={3} className="py-3 text-center italic">Ödeme kaydı yok.</td></tr>
                                ) : (
                                    data.payments.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td className="py-2 font-bold text-white">{p.amount} {p.currency}</td>
                                            <td className="py-2 capitalize">{p.status}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
