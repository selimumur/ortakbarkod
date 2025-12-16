"use client";

import { useState, useEffect } from 'react';
import {
    Landmark, Plus, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import FinancialTransactionModal from '../components/FinancialTransactionModal';
import { getBanksAction, addBankAction } from '@/app/actions/financeActions';

export default function BanksPage() {
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // YENİ BANKA MODALI
    const [isModalOpen, setIsModalOpen] = useState(false);

    // İŞLEM MODALI
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState("");
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

    const [newBank, setNewBank] = useState({
        account_name: "",
        bank_name: "",
        iban: "",
        currency: "TRY",
        opening_balance: 0
    });

    useEffect(() => {
        fetchBanks();
    }, []);

    async function fetchBanks() {
        setLoading(true);
        try {
            const data = await getBanksAction();
            setBanks(data || []);
        } catch (error: any) {
            console.error("Bankalar yüklenirken hata:", error);
            toast.error("Bankalar yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddBank() {
        if (!newBank.account_name || !newBank.bank_name || !newBank.iban) {
            toast.error("Lütfen zorunlu alanları doldurun.");
            return;
        }

        try {
            await addBankAction(newBank);
            toast.success("Banka hesabı eklendi!");
            setIsModalOpen(false);
            setNewBank({ account_name: "", bank_name: "", iban: "", currency: "TRY", opening_balance: 0 });
            // Re-fetch to update UI (Server Action revalidates path but client state needs update or refresh)
            // Since we use client state for list, we should re-fetch or rely on revalidation if we used server component for list.
            // Here we use client list, so fetchBanks() is good.
            fetchBanks();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    const openTransaction = (bankId: string, type: 'INCOME' | 'EXPENSE') => {
        setSelectedBankId(bankId);
        setTransactionType(type);
        setIsTransactionModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Landmark className="text-blue-500" /> Banka Hesapları
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Şirket banka hesaplarınızı yönetin ve bakiyeleri takip edin.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
                >
                    <Plus size={20} /> Yeni Hesap
                </button>
            </div>

            {/* Liste */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-gray-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banks.map((bank) => (
                        <div key={bank.id} className="bg-[#1e293b] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Link href={`/muhasebe/finans/bankalar/${bank.id}`} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white flex items-center justify-center" title="Hareketleri Gör">
                                    <MoreHorizontal size={20} />
                                </Link>
                            </div>

                            <Link href={`/muhasebe/finans/bankalar/${bank.id}`} className="flex items-start gap-4 mb-4 cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-lg transition">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                    <Landmark size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{bank.account_name}</h3>
                                    <p className="text-sm text-gray-500">{bank.bank_name}</p>
                                </div>
                            </Link>

                            <div className="mb-4">
                                <p className="text-xs text-gray-500 font-mono bg-black/20 p-2 rounded truncate">
                                    {bank.iban}
                                </p>
                            </div>

                            <div className="border-t border-white/5 pt-4">
                                <div className="mb-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">GÜNCEL BAKİYE</p>
                                    <p className={`text-2xl font-black ${Number(bank.current_balance) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {Number(bank.current_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-sm">{bank.currency}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => openTransaction(bank.id, 'INCOME')}
                                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition text-xs font-bold"
                                    >
                                        <ArrowDownLeft size={16} /> Gelen Havale
                                    </button>
                                    <button
                                        onClick={() => openTransaction(bank.id, 'EXPENSE')}
                                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition text-xs font-bold"
                                    >
                                        <ArrowUpRight size={16} /> Giden Havale
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {banks.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-[#1e293b]/50 rounded-2xl border border-white/5 border-dashed">
                            Henüz banka hesabı eklenmemiş.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-white mb-6">Yeni Banka Hesabı</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Hesap Adı (Rumuz)</label>
                                <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                    value={newBank.account_name} onChange={e => setNewBank({ ...newBank, account_name: e.target.value })} placeholder="Ör: Garanti Ticari" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Banka Adı</label>
                                <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                    value={newBank.bank_name} onChange={e => setNewBank({ ...newBank, bank_name: e.target.value })} placeholder="Ör: Garanti BBVA" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">IBAN</label>
                                <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                    value={newBank.iban} onChange={e => setNewBank({ ...newBank, iban: e.target.value })} placeholder="TR..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Para Birimi</label>
                                    <select className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white outline-none"
                                        value={newBank.currency} onChange={e => setNewBank({ ...newBank, currency: e.target.value })}>
                                        <option value="TRY">TRY ₺</option>
                                        <option value="USD">USD $</option>
                                        <option value="EUR">EUR €</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Açılış Bakiyesi</label>
                                    <input type="number" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newBank.opening_balance} onChange={e => setNewBank({ ...newBank, opening_balance: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-white font-bold transition">İptal</button>
                                <button onClick={handleAddBank} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-blue-500/20">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* İŞLEM MODALI */}
            <FinancialTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    fetchBanks();
                }}
                preSelectedSourceType="BANK"
                preSelectedSourceId={selectedBankId}
                preSelectedType={transactionType}
            />
        </div>
    );
}
