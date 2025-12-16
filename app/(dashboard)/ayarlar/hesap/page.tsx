"use client";

import { useState, useEffect } from 'react';
import {
    User, Building2, Shield,
    Save, Camera, Mail, Phone, MapPin, Globe, Loader2,
    Lock, Smartphone, LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useClerk } from "@clerk/nextjs";
import { getAccountInfoAction, updateProfileAction, updateCompanyInfoAction } from '@/app/actions/settingsActions';

export default function AccountSettingsPage() {
    const { signOut } = useClerk();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'security'>('profile');

    // User Profile Data
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        phone: '',
        department: '',
        avatar_url: ''
    });

    // Company Data
    const [company, setCompany] = useState({
        name: '',
        tax_office: '',
        tax_number: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        sector: '',
        social_media: { instagram: '', linkedin: '' }
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const data = await getAccountInfoAction();
            if (data.profile) {
                setProfile({
                    full_name: data.profile.full_name || '',
                    email: data.profile.email || '',
                    phone: data.profile.phone || '',
                    department: data.profile.department || '',
                    avatar_url: data.profile.avatar_url || ''
                });
            }
            if (data.company) {
                setCompany({
                    name: data.company.name || '',
                    tax_office: data.company.tax_office || '',
                    tax_number: data.company.tax_number || '',
                    address: data.company.address || '',
                    phone: data.company.phone || '',
                    email: data.company.email || '',
                    website: data.company.website || '',
                    sector: data.company.sector || '',
                    social_media: data.company.social_media || { instagram: '', linkedin: '' }
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Bilgiler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile() {
        setSaving(true);
        try {
            await updateProfileAction({
                full_name: profile.full_name,
                phone: profile.phone,
                department: profile.department
            });
            toast.success("Profil bilgileriniz güncellendi.");
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveCompany() {
        setSaving(true);
        try {
            await updateCompanyInfoAction(company);
            toast.success("Şirket bilgileri güncellendi.");
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors font-medium text-sm
            ${activeTab === id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Yükleniyor...</div>;

    return (
        <div className="md:p-8 p-4 min-h-screen bg-[#0B1120] text-white">
            <header className="mb-10 max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/20 rounded-full border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                    <User size={14} /> Hesap & Profil
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
                    Hesap Ayarları
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                    Kişisel profilinizi, şirket fatura bilgilerinizi ve hesap güvenliğinizi buradan yönetin.
                </p>
            </header>

            <div className="max-w-5xl mx-auto bg-[#111827] border border-gray-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="flex border-b border-gray-800 overflow-x-auto">
                    <TabButton id="profile" label="Profilim" icon={User} />
                    <TabButton id="company" label="Şirket Bilgileri" icon={Building2} />
                    <TabButton id="security" label="Güvenlik" icon={Shield} />
                </div>

                <div className="p-8 min-h-[400px]">

                    {/* --- PROFILE TAB --- */}
                    {activeTab === 'profile' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-6">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-[#111827]">
                                        {profile.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'ME'}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={24} className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{profile.full_name || 'İsimsiz Kullanıcı'}</h3>
                                    <p className="text-gray-400">{profile.department || 'Yönetici'}</p>
                                    <p className="text-xs text-gray-500 mt-1">{profile.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Ad Soyad</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                        placeholder="Adınız Soyadınız"
                                        value={profile.full_name}
                                        onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Departman / Unvan</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                        placeholder="Örn: E-Ticaret Müdürü"
                                        value={profile.department}
                                        onChange={e => setProfile({ ...profile, department: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">E-Posta (Değiştirilemez)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                        <input
                                            type="email"
                                            disabled
                                            className="w-full bg-[#0B1120] border border-gray-800 rounded-xl p-3 pl-10 text-gray-400 cursor-not-allowed"
                                            value={profile.email}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Telefon</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                        <input
                                            type="tel"
                                            className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 pl-10 text-white focus:border-blue-500 outline-none transition-colors"
                                            placeholder="+90 5XX XXX XX XX"
                                            value={profile.phone}
                                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-transform hover:scale-105"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Profili Güncelle
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- COMPANY TAB --- */}
                    {activeTab === 'company' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                                <Building2 className="text-yellow-500 shrink-0 mt-1" size={24} />
                                <div>
                                    <h4 className="font-bold text-yellow-500">Fatura Bilgileri</h4>
                                    <p className="text-sm text-yellow-200/70 mt-1">
                                        Bu bilgiler e-fatura kesiminde ve pazaryeri entegrasyonlarında gönderici bilgisi olarak kullanılacaktır.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Şirket Resmi Unvanı</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="ABC Bilişim San. Tic. Ltd. Şti."
                                        value={company.name}
                                        onChange={e => setCompany({ ...company, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Vergi Dairesi</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                        value={company.tax_office}
                                        onChange={e => setCompany({ ...company, tax_office: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Vergi Numarası / TCKN</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none font-mono"
                                        placeholder="XXXXXXXXXX"
                                        value={company.tax_number}
                                        onChange={e => setCompany({ ...company, tax_number: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Şirket Adresi (Merkez)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                        <textarea
                                            rows={2}
                                            className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 pl-10 text-white focus:border-blue-500 outline-none resize-none"
                                            placeholder="Mahalle, Cadde, No, İlçe/İl"
                                            value={company.address}
                                            onChange={e => setCompany({ ...company, address: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Kurumsal Telefon</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                        value={company.phone}
                                        onChange={e => setCompany({ ...company, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Web Sitesi</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                        <input
                                            type="url"
                                            className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 pl-10 text-white focus:border-blue-500 outline-none"
                                            placeholder="https://"
                                            value={company.website}
                                            onChange={e => setCompany({ ...company, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Sektör</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Örn: Tekstil, Gıda"
                                        value={company.sector}
                                        onChange={e => setCompany({ ...company, sector: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <h5 className="text-gray-500 font-bold text-xs uppercase mb-3 border-b border-white/5 pb-2">Sosyal Medya</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Instagram</label>
                                            <input
                                                type="text"
                                                className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                                placeholder="@kullaniciadi"
                                                value={company.social_media.instagram}
                                                onChange={e => setCompany({ ...company, social_media: { ...company.social_media, instagram: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">LinkedIn</label>
                                            <input
                                                type="text"
                                                className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                                placeholder="linkedin.com/company/..."
                                                value={company.social_media.linkedin}
                                                onChange={e => setCompany({ ...company, social_media: { ...company.social_media, linkedin: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSaveCompany}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-transform hover:scale-105"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Şirket Bilgilerini Kaydet
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- SECURITY TAB --- */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-xl text-center">
                                <h4 className="font-bold text-red-500 text-lg mb-2">Güvenlik Ayarları</h4>
                                <p className="text-gray-400 mb-6">Şifre değiştirme ve 2FA işlemleri için lütfen sistem yöneticinizle iletişime geçin veya e-posta doğrulama bağlantısını kullanın.</p>

                                <div className="flex flex-col md:flex-row justify-center gap-4">
                                    <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold transition-colors">
                                        <Lock size={18} /> Şifre Sıfırla
                                    </button>
                                    <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold transition-colors">
                                        <Smartphone size={18} /> İki Faktörlü Doğrulama (Yakında)
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-800 pt-6 mt-6">
                                <h4 className="font-bold text-white mb-4">Oturum Yönetimi</h4>
                                <button onClick={handleSignOut} className="w-full text-left p-4 bg-gray-800/30 border border-gray-800 hover:border-red-500/50 rounded-xl flex justify-between items-center group transition-colors">
                                    <div>
                                        <div className="font-bold text-white group-hover:text-red-400">Çıkış Yap</div>
                                        <div className="text-xs text-gray-500">Oturumunuzu sonlandırır.</div>
                                    </div>
                                    <LogOut size={20} className="text-gray-600 group-hover:text-red-500" />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
