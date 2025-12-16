"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Trash2, Plus, Pen } from 'lucide-react';
import { toast } from 'sonner';
import { getBankAccountsAction, upsertBankAccountAction, deleteBankAccountAction } from '@/app/actions/adminActions';

export default function BankAccountsSettings() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);

    const [formData, setFormData] = useState({
        bank_name: '',
        iban: '',
        account_holder: '',
        branch_code: '',
        currency: 'TRY'
    });

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const data = await getBankAccountsAction();
            setAccounts(data || []);
        } catch (e) {
            toast.error("Banka hesapları yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const handleEdit = (acc: any) => {
        setEditingAccount(acc);
        setFormData({
            bank_name: acc.bank_name,
            iban: acc.iban,
            account_holder: acc.account_holder,
            branch_code: acc.branch_code || '',
            currency: acc.currency || 'TRY'
        });
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingAccount(null);
        setFormData({ bank_name: '', iban: 'TR', account_holder: '', branch_code: '', currency: 'TRY' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.bank_name || !formData.iban || !formData.account_holder) return toast.error("Zorunlu alanları doldurun.");

        try {
            const payload = editingAccount ? { ...formData, id: editingAccount.id } : formData;
            const res = await upsertBankAccountAction(payload);
            if (res.success) {
                toast.success(editingAccount ? "Güncellendi" : "Eklendi");
                setIsModalOpen(false);
                loadAccounts();
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bu hesabı silmek istediğinize emin misiniz?")) return;
        try {
            const res = await deleteBankAccountAction(id);
            if (res.success) {
                toast.success("Silindi");
                loadAccounts();
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <CreditCard size={20} className="text-blue-500" />
                        Banka Hesapları (Havale/EFT)
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">Ödeme ekranında müşterilere gösterilecek hesaplar.</p>
                </div>
                <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                    <Plus size={14} /> Yeni Ekle
                </button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="text-gray-500 text-sm text-center py-4">Yükleniyor...</div>
                ) : accounts.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">Henüz banka hesabı eklenmemiş.</div>
                ) : (
                    accounts.map(acc => (
                        <div key={acc.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-white">{acc.bank_name} <span className="text-xs font-normal text-gray-500 mx-1">({acc.currency})</span></h4>
                                <div className="text-sm text-gray-400 font-mono mt-1">{acc.iban}</div>
                                <div className="text-xs text-gray-500 mt-1">{acc.account_holder}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(acc)} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"><Pen size={14} /></button>
                                <button onClick={() => handleDelete(acc.id)} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-red-400 transition"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121826] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">{editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Banka Adı</label>
                                <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm" value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} placeholder="Örn: Garanti BBVA" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Hesap Sahibi</label>
                                <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm" value={formData.account_holder} onChange={e => setFormData({ ...formData, account_holder: e.target.value })} placeholder="Şirket Ünvanı" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">IBAN</label>
                                <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm font-mono" value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Şube Kodu</label>
                                    <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm" value={formData.branch_code} onChange={e => setFormData({ ...formData, branch_code: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 mb-1">Para Birimi</label>
                                    <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded hover:bg-white/5 transition text-sm">İptal</button>
                            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold text-sm">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
