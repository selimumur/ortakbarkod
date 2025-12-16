"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Briefcase, CreditCard, Clock, Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Server Actions
import {
    getPersonnelByIdAction,
    upsertPersonnelAction,
    getPersonnelAdvancesAction
} from '@/app/actions/personnelActions';

export default function PersonnelDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const isNew = id === 'yeni';

    const [personnel, setPersonnel] = useState<any>({ is_active: true, role: 'Çalışan', work_type: 'Tam Zamanlı' });
    const [advances, setAdvances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('genel');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isNew && id) {
            fetchData();
        } else if (isNew) {
            setLoading(false);
        }
    }, [id, isNew]);

    async function fetchData() {
        setLoading(true);
        try {
            const [pData, advData] = await Promise.all([
                getPersonnelByIdAction(id),
                getPersonnelAdvancesAction(id)
            ]);

            if (pData) {
                setPersonnel(pData);
                setAdvances(advData || []);
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Personel bilgileri alınamadı: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setPersonnel({ ...personnel, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await upsertPersonnelAction(personnel);
            toast.success(isNew ? "Personel başarıyla oluşturuldu." : "Personel bilgileri güncellendi.");

            if (isNew && result?.id) {
                router.replace(`/muhasebe/personel/${result.id}`);
            } else {
                // If update, maybe refresh check
            }
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#0B1120] text-gray-500 flex items-center justify-center"><RefreshCw className="animate-spin mr-2" /> Yükleniyor...</div>;

    if (!personnel.id && !isNew) return <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center">Personel bulunamadı.</div>;

    const TABS = [
        { id: 'genel', label: 'Temel Bilgiler', icon: User },
        { id: 'calisma', label: 'Çalışma Bilgileri', icon: Briefcase },
        { id: 'finans', label: 'Maaş & Finans', icon: CreditCard },
        { id: 'avans', label: 'Avanslar', icon: CreditCard },
        { id: 'gecmis', label: 'İş Geçmişi', icon: Clock },
    ];

    return (
        <div className="min-h-screen bg-[#0B1120] text-gray-200 p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="bg-gray-800 p-3 rounded-xl hover:bg-gray-700 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">{isNew ? 'Yeni Personel' : personnel.name}</h1>
                        <p className="text-gray-400 flex items-center gap-2">
                            <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-xs font-bold uppercase">{personnel.role || 'Yeni'}</span>
                            <span className="text-gray-600">•</span>
                            {personnel.department || 'Departman Seçiniz'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition disabled:opacity-50"
                >
                    <Save size={20} /> {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto mb-8 border-b border-gray-800">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition whitespace-nowrap ${activeTab === tab.id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto md:mx-0">

                {/* TAB: GENEL */}
                {activeTab === 'genel' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                        <section className="bg-[#161f32] p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><User className="text-blue-500" /> Kimlik Bilgileri</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ad Soyad</label>
                                    <input type="text" name="name" value={personnel.name || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">TC Kimlik No</label>
                                    <input type="text" name="tc_no" value={personnel.tc_no || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Doğum Tarihi</label>
                                        <input type="date" name="birth_date" value={personnel.birth_date || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cinsiyet</label>
                                        <select name="gender" onChange={handleChange} value={personnel.gender || ''} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                                            <option value="">Seçiniz</option>
                                            <option value="Erkek">Erkek</option>
                                            <option value="Kadın">Kadın</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#161f32] p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Phone className="text-green-500" /> İletişim Bilgileri</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefon</label>
                                    <input type="text" name="phone" value={personnel.phone || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-Posta</label>
                                    <input type="email" name="email" value={personnel.email || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adres</label>
                                    <textarea name="address" rows={3} value={personnel.address || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"></textarea>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB: ÇALIŞMA */}
                {activeTab === 'calisma' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                        <section className="bg-[#161f32] p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Briefcase className="text-purple-500" /> Görev Bilgileri</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Departman</label>
                                    <select name="department" value={personnel.department || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                                        <option value="">Seçiniz</option>
                                        <option value="Yönetim">Yönetim</option>
                                        <option value="Muhasebe">Muhasebe</option>
                                        <option value="Üretim">Üretim</option>
                                        <option value="Lojistik">Lojistik</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Görevi</label>
                                    <input type="text" name="role" value={personnel.role || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="Örn: Paketleme Uzmanı" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Çalışma Tipi</label>
                                    <select name="work_type" value={personnel.work_type || 'Tam Zamanlı'} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                                        <option value="Tam Zamanlı">Tam Zamanlı</option>
                                        <option value="Yarı Zamanlı">Yarı Zamanlı</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#161f32] p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Clock className="text-orange-500" /> Zamanlama</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">İşe Başlama Tarihi</label>
                                    <input type="date" name="start_date" value={personnel.start_date || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Çıkış Tarihi (Varsa)</label>
                                    <input type="date" name="end_date" value={personnel.end_date || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl mt-4">
                                    <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${personnel.is_active ? 'bg-green-500' : 'bg-gray-600'}`} onClick={() => setPersonnel({ ...personnel, is_active: !personnel.is_active })}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${personnel.is_active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </div>
                                    <span className="font-bold text-sm">Personel Aktif / Çalışıyor</span>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB: FİNANS */}
                {activeTab === 'finans' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                        <section className="bg-[#161f32] p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><CreditCard className="text-green-500" /> Maaş Bilgileri</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Net Maaş</label>
                                        <input type="number" name="net_salary" value={personnel.net_salary || 0} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono text-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Avans Limiti</label>
                                        <input type="number" name="advance_limit" value={personnel.advance_limit || 0} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono text-lg" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IBAN</label>
                                    <input type="text" name="iban" value={personnel.iban || ''} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono" placeholder="TR..." />
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#161f32] p-6 rounded-2xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Clock className="text-yellow-500" /> Ek Ücretler</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Günlük Yemek</label>
                                        <input type="number" name="daily_food_fee" value={personnel.daily_food_fee || 0} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Günlük Yol</label>
                                        <input type="number" name="daily_road_fee" value={personnel.daily_road_fee || 0} onChange={handleChange} className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mesai Çarpanı</label>
                                    <input type="number" step="0.1" name="overtime_rate" placeholder="1.5" className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                                    <p className="text-xs text-gray-500 mt-1">Varsayılan: 1.5 katı</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB: AVANSLAR */}
                {activeTab === 'avans' && (
                    <div className="bg-[#161f32] p-6 rounded-2xl border border-gray-800 animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="text-red-500" /> Avans Geçmişi</h3>
                            {/* TODO: Add Advance Action Button Logic */}
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded text-white font-bold opacity-50 cursor-not-allowed" title="Avans modülü yapım aşamasında">Yeni Avans Ekle</button>
                        </div>
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="text-xs uppercase bg-gray-800/50 text-gray-500">
                                <tr>
                                    <th className="p-3">Tarih</th>
                                    <th className="p-3">Açıklama</th>
                                    <th className="p-3">Tutar</th>
                                    <th className="p-3">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {advances.map(adv => (
                                    <tr key={adv.id}>
                                        <td className="p-3">{new Date(adv.request_date).toLocaleDateString()}</td>
                                        <td className="p-3">{adv.description}</td>
                                        <td className="p-3 text-white font-bold">{adv.amount} TL</td>
                                        <td className="p-3"><span className="bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded text-xs">{adv.status}</span></td>
                                    </tr>
                                ))}
                                {advances.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-600">Kayıt bulunamadı.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    );
}
