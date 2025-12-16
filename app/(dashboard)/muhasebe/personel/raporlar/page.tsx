"use client";

import { useState, useEffect } from 'react';
import { FileText, Calendar, XCircle, CreditCard, Wallet, Landmark, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    getPersonnelPayrollsAction,
    processPayrollPaymentAction
} from '@/app/actions/personnelActions';
import { getFinanceDropdownsAction } from '@/app/actions/financeActions';

export default function PersonnelReportsPage() {
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [payrolls, setPayrolls] = useState<any[]>([]);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
    const [accounts, setAccounts] = useState<{ banks: any[], safes: any[], categories: any[] }>({ banks: [], safes: [], categories: [] });

    // Payment Form
    const [sourceType, setSourceType] = useState<'SAFE' | 'BANK'>('SAFE');
    const [sourceId, setSourceId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [description, setDescription] = useState("");
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        fetchData();
        fetchFinanceData();
    }, [month, year]);

    async function fetchData() {
        setLoading(true);
        try {
            const data = await getPersonnelPayrollsAction(month, year);
            setPayrolls(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Veriler yüklenemedi");
        } finally {
            setLoading(false);
        }
    }

    async function fetchFinanceData() {
        try {
            const data = await getFinanceDropdownsAction();
            // Filter categories for Expense? The action returns all.
            // Assuming categories have type.
            const expenses = data.categories?.filter((c: any) => c.type === 'EXPENSE') || [];

            setAccounts({
                banks: data.banks || [],
                safes: data.safes || [],
                categories: expenses.length > 0 ? expenses : (data.categories || []) // Fallback
            });
        } catch (error) {
            console.error("Finans verisi hatası", error);
        }
    }

    const openPaymentModal = (payroll: any) => {
        setSelectedPayroll(payroll);
        setDescription(`${month}/${year} Maaş Ödemesi: ${payroll.personnel.name}`);
        setIsPaymentModalOpen(true);
        // Reset form
        setSourceId("");
        setCategoryId("");
    };

    const handlePayment = async () => {
        if (!sourceId || !categoryId) {
            toast.error("Ödeme kaynağı ve kategori seçilmelidir.");
            return;
        }

        setProcessingPayment(true);
        const amount = Number(selectedPayroll.net_payable);

        try {
            await processPayrollPaymentAction({
                payrollId: selectedPayroll.id,
                sourceAccountId: Number(sourceId),
                categoryId: Number(categoryId),
                amount: amount,
                description: description,
                paymentDay: new Date().toISOString().split('T')[0]
            });

            toast.success("Maaş ödemesi başarıyla tamamlandı.");
            setIsPaymentModalOpen(false);
            fetchData(); // Refresh list

        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setProcessingPayment(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Ödendi': return <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Ödendi</span>;
            case 'Onaylandı': return <span className="bg-blue-900/30 text-blue-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Onaylandı</span>;
            default: return <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock size={12} /> Taslak</span>;
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-gray-200 p-6 md:p-8 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <FileText className="text-purple-500" size={32} />
                        Personel Raporları & Hakedişler
                    </h1>
                    <p className="text-gray-400 mt-1">Hakedişleri görüntüleyin ve maaş ödemelerini gerçekleştirin.</p>
                </div>

                <div className="flex items-center gap-2 bg-[#1a1d24] p-2 rounded-xl border border-gray-700">
                    <Calendar size={20} className="text-gray-400 ml-2" />
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent text-white font-bold outline-none p-2 rounded hover:bg-gray-800">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}. Ay</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-white font-bold outline-none p-2 rounded hover:bg-gray-800">
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? <div className="text-center py-20 text-gray-500 flex justify-center"><Loader2 className="animate-spin" /></div> :
                payrolls.length === 0 ? (
                    <div className="text-center py-20 bg-[#161f32] rounded-2xl border border-gray-800 border-dashed">
                        <FileText size={48} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-500">Bu dönem için kayıtlı hakediş bulunamadı.</p>
                        <p className="text-xs text-gray-600 mt-2">"Maaş & Mesai" sayfasından hakediş oluşturabilirsiniz.</p>
                    </div>
                ) : (
                    <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#111827] text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Personel</th>
                                    <th className="p-4">Maaş (Net)</th>
                                    <th className="p-4 text-orange-400">Mesai</th>
                                    <th className="p-4 text-green-400">Yemek+Yol</th>
                                    <th className="p-4 text-red-400">Kesintiler</th>
                                    <th className="p-4 text-blue-400 text-lg">Ödenecek</th>
                                    <th className="p-4">Durum</th>
                                    <th className="p-4">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {payrolls.map((payroll) => (
                                    <tr key={payroll.id} className="hover:bg-gray-800/30 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{payroll.personnel.name}</div>
                                            <div className="text-xs text-gray-500">{payroll.personnel.role}</div>
                                        </td>
                                        <td className="p-4 font-mono">{payroll.base_salary}</td>
                                        <td className="p-4 text-orange-400 font-mono">+{payroll.total_overtime_pay}</td>
                                        <td className="p-4 text-green-400 font-mono">+{(payroll.total_food_pay + payroll.total_road_pay).toFixed(2)}</td>
                                        <td className="p-4 text-red-400 font-mono">-{payroll.advance_deduction}</td>
                                        <td className="p-4 font-bold text-lg text-blue-400 font-mono">
                                            {payroll.net_payable} TL
                                        </td>
                                        <td className="p-4">{getStatusBadge(payroll.status)}</td>
                                        <td className="p-4">
                                            {payroll.status !== 'Ödendi' && (
                                                <button
                                                    onClick={() => openPaymentModal(payroll)}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg shadow-blue-900/20 transition flex items-center gap-2"
                                                >
                                                    <CreditCard size={14} /> Maaş Öde
                                                </button>
                                            )}
                                            {payroll.status === 'Ödendi' && (
                                                <span className="text-gray-500 text-xs italic">Ödeme Tamamlandı</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#111827] border-t border-gray-800 font-bold text-white">
                                <tr>
                                    <td colSpan={5} className="p-4 text-right pr-8 text-gray-400 uppercase text-xs">Genel Toplam</td>
                                    <td className="p-4 text-lg text-blue-400 font-mono">
                                        {payrolls.reduce((sum, p) => sum + Number(p.net_payable), 0).toFixed(2)} TL
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedPayroll && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">Maaş Ödemesi Yap</h3>
                                <p className="text-gray-400 mt-1">{selectedPayroll.personnel.name} - {month}/{year}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-500 hover:text-white"><XCircle size={24} /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 text-center">
                                <p className="text-sm text-blue-400 uppercase font-bold mb-1">ÖDENECEK NET TUTAR</p>
                                <p className="text-4xl font-black text-white">{selectedPayroll.net_payable} <span className="text-xl text-gray-500">TL</span></p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Ödeme Kaynağı</label>
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => setSourceType('SAFE')} className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${sourceType === 'SAFE' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>
                                            <Wallet size={16} /> KASA
                                        </button>
                                        <button onClick={() => setSourceType('BANK')} className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${sourceType === 'BANK' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>
                                            <Landmark size={16} /> BANKA
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-[#111318] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                                        value={sourceId} onChange={e => setSourceId(e.target.value)}
                                    >
                                        <option value="">{sourceType === 'SAFE' ? 'Kasa Seçiniz...' : 'Banka Seçiniz...'}</option>
                                        {sourceType === 'SAFE' && accounts.safes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.current_balance} {s.currency})</option>)}
                                        {sourceType === 'BANK' && accounts.banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name} ({b.current_balance} {b.currency})</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Gider Kategorisi</label>
                                    <select
                                        className="w-full bg-[#111318] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                                        value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                    >
                                        <option value="">Kategori Seçiniz...</option>
                                        {accounts.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Açıklama</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111318] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                                        value={description} onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={processingPayment}
                                className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-green-900/20 transition transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingPayment ? 'İşleniyor...' : <><CheckCircle size={20} /> Ödemeyi Onayla</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
