"use client";

import { useState, useEffect } from 'react';
import {
    Percent, Plus, Landmark, PieChart, ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import FinancialTransactionModal from '../components/FinancialTransactionModal';
import { getLoansAction, addLoanAction, getLoanInstallmentsAction, payLoanInstallmentAction, getBanksAction } from '@/app/actions/financeActions';

export default function LoansPage() {
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [banks, setBanks] = useState<any[]>([]);

    // Detay Modalı
    const [selectedLoan, setSelectedLoan] = useState<any>(null);
    const [installments, setInstallments] = useState<any[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Taksit Ödeme Modalı
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<any>(null);


    const [newLoan, setNewLoan] = useState({
        bank_id: "",
        loan_type: "Ticari Kredi",
        principal_amount: "",
        interest_rate: "", // Aylık %
        installment_count: "12",
        start_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [loanData, bankData] = await Promise.all([
                getLoansAction(),
                getBanksAction()
            ]);
            setLoans(loanData || []);
            setBanks(bankData || []);
        } catch (error: any) {
            console.error(error);
            toast.error("Veriler yüklenirken hata: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddLoan() {
        if (!newLoan.bank_id || !newLoan.principal_amount) {
            toast.error("Banka ve tutar zorunludur.");
            return;
        }

        try {
            await addLoanAction(newLoan);
            toast.success("Kredi ve ödeme planı oluşturuldu!");
            setIsModalOpen(false);
            setNewLoan({ bank_id: "", loan_type: "Ticari Kredi", principal_amount: "", interest_rate: "", installment_count: "12", start_date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    async function openLoanDetails(loan: any) {
        setSelectedLoan(loan);
        try {
            const data = await getLoanInstallmentsAction(loan.id);
            setInstallments(data || []);
            setIsDetailModalOpen(true);
        } catch (error: any) {
            console.error(error);
            toast.error("Detaylar alınamadı: " + error.message);
        }
    }

    function openPayInstallment(installment: any) {
        setSelectedInstallment(installment);
        setIsPaymentModalOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Percent className="text-orange-500" /> Kredi Yönetimi
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Banka kredilerinizi, ödeme planlarını ve kalan borçları takip edin.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-orange-900/20"
                >
                    <Plus size={20} /> Yeni Kredi Kullan
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loans.map((loan) => {
                        return (
                            <div key={loan.id} className="bg-[#1e293b] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                                            <Landmark size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{loan.banks?.bank_name}</h3>
                                            <p className="text-sm text-gray-500">{loan.loan_type}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${loan.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                        {loan.status === 'ACTIVE' ? 'AKTİF' : 'BİTTİ'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Ana Para</p>
                                        <p className="font-black text-white text-lg">{Number(loan.principal_amount).toLocaleString('tr-TR')} ₺</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Toplam Geri Ödeme</p>
                                        <p className="font-bold text-gray-300">{Number(loan.total_amount).toLocaleString('tr-TR')} ₺</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 uppercase">Aylık Taksit (Ort.)</p>
                                        <p className="font-bold text-orange-400">
                                            {(Number(loan.total_amount) / Number(loan.installment_count)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => openLoanDetails(loan)}
                                    className="w-full bg-black/20 hover:bg-black/40 py-3 rounded-xl text-gray-400 hover:text-white transition flex items-center justify-center gap-2 text-sm font-bold"
                                >
                                    Detaylar ve Ödeme Planı <ChevronRight size={16} />
                                </button>
                            </div>
                        );
                    })}

                    {loans.length === 0 && (
                        <div className="col-span-full py-16 text-center text-gray-500 bg-[#1e293b]/50 rounded-2xl border border-white/5 border-dashed flex flex-col items-center">
                            <PieChart size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Aktif kredi kaydı bulunamadı.</p>
                        </div>
                    )}
                </div>
            )}

            {/* YENİ KREDİ MODALI */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-6">Yeni Kredi Kullanımı</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Banka</label>
                                <select className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                    value={newLoan.bank_id} onChange={e => setNewLoan({ ...newLoan, bank_id: e.target.value })}>
                                    <option value="">Seçiniz...</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Kredi Türü</label>
                                    <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newLoan.loan_type} onChange={e => setNewLoan({ ...newLoan, loan_type: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Kullanım Tarihi</label>
                                    <input type="date" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newLoan.start_date} onChange={e => setNewLoan({ ...newLoan, start_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Ana Para Tutarı (₺)</label>
                                <input type="number" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white text-lg font-bold"
                                    value={newLoan.principal_amount} onChange={e => setNewLoan({ ...newLoan, principal_amount: e.target.value })} placeholder="0.00" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Aylık Faiz Oranı (%)</label>
                                    <input type="number" step="0.01" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newLoan.interest_rate} onChange={e => setNewLoan({ ...newLoan, interest_rate: e.target.value })} placeholder="Ör: 2.49" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Vade (Ay)</label>
                                    <input type="number" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newLoan.installment_count} onChange={e => setNewLoan({ ...newLoan, installment_count: e.target.value })} placeholder="12" />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-white font-bold transition">İptal</button>
                                <button onClick={handleAddLoan} className="flex-1 bg-orange-600 hover:bg-orange-500 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-orange-500/20">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAY & ÖDEME PLANI MODALI */}
            {isDetailModalOpen && selectedLoan && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-4xl border border-white/10 shadow-2xl h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">{selectedLoan.loan_type} - Ödeme Planı</h3>
                                <p className="text-gray-400 text-sm mt-1">{selectedLoan.banks?.bank_name} • %{selectedLoan.interest_rate} Faiz</p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full text-white transition"><Plus className="rotate-45" /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-[#111827] text-gray-400 text-xs uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="p-4">Taksit</th>
                                        <th className="p-4">Vade Tarihi</th>
                                        <th className="p-4">Ana Para</th>
                                        <th className="p-4">Faiz</th>
                                        <th className="p-4">Toplam Taksit</th>
                                        <th className="p-4">Kalan Ana Para</th>
                                        <th className="p-4">Durum</th>
                                        <th className="p-4 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {installments.map((inst) => (
                                        <tr key={inst.id} className="hover:bg-white/5 transition group">
                                            <td className="p-4 text-gray-500 font-mono">#{inst.installment_no}</td>
                                            <td className="p-4 text-white font-mono">{new Date(inst.due_date).toLocaleDateString('tr-TR')}</td>
                                            <td className="p-4 text-gray-400">{Number(inst.principal_part).toLocaleString('tr-TR')} ₺</td>
                                            <td className="p-4 text-gray-400">{Number(inst.interest_part).toLocaleString('tr-TR')} ₺</td>
                                            <td className="p-4 font-bold text-white">{Number(inst.amount).toLocaleString('tr-TR')} ₺</td>
                                            <td className="p-4 text-gray-500">{Number(inst.remaining_balance).toLocaleString('tr-TR')} ₺</td>
                                            <td className="p-4">
                                                {inst.status === 'PAID' ? (
                                                    <span className="flex items-center gap-1 text-green-500 font-bold text-xs"><CheckCircle2 size={14} /> ÖDENDİ</span>
                                                ) : inst.status === 'OVERDUE' ? (
                                                    <span className="flex items-center gap-1 text-red-500 font-bold text-xs"><AlertCircle size={14} /> GECİKTİ</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-yellow-500 font-bold text-xs"><Clock size={14} /> BEKLİYOR</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {inst.status !== 'PAID' && (
                                                    <button
                                                        onClick={() => openPayInstallment(inst)}
                                                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-orange-500/10"
                                                    >
                                                        ÖDE
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ÖDEME MODALI (Transaction Modal Wrapper) */}
            {isPaymentModalOpen && selectedInstallment && (
                <FinancialTransactionModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={async () => {
                        try {
                            // Update Status
                            await payLoanInstallmentAction(selectedInstallment.id, selectedLoan.id, 0, "");

                            toast.success("Taksit ödemesi başarılı!");

                            // Re-fetch details
                            const data = await getLoanInstallmentsAction(selectedLoan.id);
                            setInstallments(data || []);

                        } catch (err: any) {
                            toast.error("Hata: " + err.message);
                        }
                    }}
                    preSelectedType='EXPENSE'
                    preSelectedSourceType='BANK' // Default bank, but user can change
                    initialAmount={selectedInstallment.amount.toString()}
                    initialDescription={`Kredi Taksit Ödemesi: ${selectedLoan.loan_type} (#${selectedInstallment.installment_no})`}
                />
            )}

        </div>
    );
}
