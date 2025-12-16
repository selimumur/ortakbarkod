"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Plus, CheckCircle2, XCircle, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    getAdvancesAction,
    createAdvanceAction,
    updateAdvanceStatusAction,
    getPersonnelAction
} from '@/app/actions/personnelActions';
import { getFinanceDropdownsAction } from '@/app/actions/financeActions';

export default function PersonnelAdvancesPage() {
    // Data State
    const [advances, setAdvances] = useState<any[]>([]);
    const [personnelList, setPersonnelList] = useState<any[]>([]);
    const [safes, setSafes] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedPersonnel, setSelectedPersonnel] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    // Finance Form State
    const [sourceType, setSourceType] = useState<'SAFE' | 'BANK'>('SAFE');
    const [sourceId, setSourceId] = useState("");
    const [categoryId, setCategoryId] = useState("");

    useEffect(() => {
        fetchData();
        fetchDropdowns();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const data = await getAdvancesAction();
            setAdvances(data);
        } catch (error: any) {
            console.error(error);
            toast.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    async function fetchDropdowns() {
        try {
            const [pData, fData] = await Promise.all([
                getPersonnelAction(),
                getFinanceDropdownsAction()
            ]);
            setPersonnelList(pData);
            if (fData) {
                setSafes(fData.safes);
                setBanks(fData.banks);
                // Filter expense categories
                setCategories(fData.categories.filter((c: any) => c.type === 'EXPENSE'));
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPersonnel || !amount || !sourceId || !categoryId) {
            toast.error("Personel, Tutar, Kaynak ve Kategori seçimi zorunludur.");
            return;
        }

        try {
            await createAdvanceAction({
                personnelId: Number(selectedPersonnel),
                amount: Number(amount),
                description: description,
                sourceType: sourceType,
                sourceId: Number(sourceId),
                categoryId: Number(categoryId)
            });

            toast.success("Avans verildi ve finansal işlem kaydedildi.");
            setAmount("");
            setDescription("");
            fetchData(); // Refresh list
        } catch (error: any) {
            console.error(error);
            toast.error("Hata: " + error.message);
        }
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await updateAdvanceStatusAction(id, status);
            toast.success(`Durum güncellendi: ${status}`);
            fetchData();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1120] text-gray-200 p-6 md:p-8 animate-in fade-in">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <CreditCard className="text-orange-500" size={32} />
                Avans Yönetimi
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Sol: Yeni Avans Formu */}
                <div className="lg:col-span-1">
                    <div className="bg-[#161f32] p-6 rounded-2xl border border-gray-800 sticky top-6 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="bg-blue-600 rounded-md p-0.5" size={20} /> Yeni Avans Ver
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Personel Seç</label>
                                <select
                                    className="w-full bg-[#111827] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                    value={selectedPersonnel} onChange={e => setSelectedPersonnel(e.target.value)}
                                >
                                    <option value="">Seçiniz...</option>
                                    {personnelList.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tutar (TL)</label>
                                <input
                                    type="number" className="w-full bg-[#111827] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none font-bold text-lg"
                                    value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                                    step="0.01"
                                />
                            </div>

                            {/* Payment Source Selection */}
                            <div className="pt-4 border-t border-gray-800">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ödeme Kaynağı</label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => { setSourceType('SAFE'); setSourceId(""); }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${sourceType === 'SAFE' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        KASA
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setSourceType('BANK'); setSourceId(""); }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${sourceType === 'BANK' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        BANKA
                                    </button>
                                </div>
                                <select
                                    className="w-full bg-[#111827] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm"
                                    value={sourceId} onChange={e => setSourceId(e.target.value)}
                                >
                                    <option value="">{sourceType === 'SAFE' ? 'Kasa Seçiniz...' : 'Banka Seçiniz...'}</option>
                                    {sourceType === 'SAFE' && safes.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.balance || 0} {s.currency})</option>
                                    ))}
                                    {sourceType === 'BANK' && banks.map(b => (
                                        <option key={b.id} value={b.id}>{b.name || b.account_name} ({b.balance || 0} {b.currency})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gider Kategorisi</label>
                                <select
                                    className="w-full bg-[#111827] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm"
                                    value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                >
                                    <option value="">Kategori Seçiniz...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Açıklama</label>
                                <textarea
                                    className="w-full bg-[#111827] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                    rows={3}
                                    value={description} onChange={e => setDescription(e.target.value)} placeholder="Örn: Ay sonu kesilecek..."
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition transform active:scale-95">
                                Avansı Onayla ve Öde
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sağ: Liste */}
                <div className="lg:col-span-2">
                    <div className="bg-[#161f32] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1f2937]/50">
                            <h3 className="font-bold text-white">Son Hareketler</h3>
                            <button onClick={fetchData} className="text-sm text-gray-400 hover:text-white">Yenile</button>
                        </div>
                        <div className="divide-y divide-gray-800">
                            {loading ? <div className="p-10 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Yükleniyor...</div> :
                                advances.length === 0 ? <div className="p-10 text-center text-gray-500">Kayıt yok.</div> :
                                    advances.map(adv => (
                                        <div key={adv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/30 transition">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{adv.personnel?.name} <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 rounded ml-2">{adv.personnel?.role}</span></div>
                                                    <div className="text-xs text-gray-400 flex gap-2">
                                                        <span>{new Date(adv.request_date).toLocaleDateString('tr-TR')}</span>
                                                        <span>•</span>
                                                        <span>{adv.description}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <span className="block font-bold text-red-400 text-lg">- {Number(adv.amount).toLocaleString()} TL</span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${adv.status === 'Ödendi' ? 'bg-green-900/30 text-green-500' :
                                                        adv.status === 'Bekliyor' ? 'bg-yellow-900/30 text-yellow-500' :
                                                            'bg-gray-700 text-gray-400'
                                                        }`}>{adv.status}</span>
                                                </div>

                                                {adv.status === 'Bekliyor' && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => updateStatus(adv.id, 'Ödendi')} className="p-2 hover:bg-green-900/30 text-green-500 rounded-lg" title="Öde"><CheckCircle2 size={18} /></button>
                                                        <button onClick={() => updateStatus(adv.id, 'Reddedildi')} className="p-2 hover:bg-red-900/30 text-red-500 rounded-lg" title="Reddet"><XCircle size={18} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            }
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
