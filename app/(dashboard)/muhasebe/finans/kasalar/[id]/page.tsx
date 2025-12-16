"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, Filter, Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getAccountDetailsAction } from '@/app/actions/accountingActions';

export default function SafeDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const router = useRouter();
    const id = params.id;

    const [safe, setSafe] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    async function fetchData() {
        setLoading(true);
        try {
            const data = await getAccountDetailsAction(Number(id));
            setSafe(data.account);
            setTransactions(data.transactions);
        } catch (error: any) {
            console.error("Kasa detayları hatası:", error);
            toast.error("Kasa bilgileri alınamadı: " + error.message);
            router.push('/muhasebe/finans');
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-gray-500"><Loader2 className="animate-spin" /></div>;
    if (!safe) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Hesap bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-[#0f1115] text-gray-200 p-6 md:p-8 animate-in fade-in">
            {/* Header */}
            <div className="mb-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition">
                    <ArrowLeft size={18} /> Geri Dön
                </button>

                <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 bg-[#1a1d24] p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <Wallet size={40} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">{safe.name}</h1>
                            <p className="text-xl text-gray-400 font-medium">Nakit Kasa Hesabı</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-500 uppercase mb-1">GÜNCEL BAKİYE</p>
                        <p className={`text-4xl font-black ${Number(safe.balance) >= 0 ? 'text-white' : 'text-red-500'}`}>
                            {Number(safe.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg text-gray-500">{safe.currency}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Filter size={18} className="text-emerald-500" /> Hareket Geçmişi
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#111827] text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Tarih</th>
                                <th className="p-4">İşlem Türü</th>
                                <th className="p-4">Açıklama</th>
                                <th className="p-4 text-center">Yön</th>
                                <th className="p-4 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {transactions.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-800/30 transition">
                                        <td className="p-4 text-gray-400 font-mono">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {t.transaction_type === 'INCOME' && <ArrowUpCircle size={16} className="text-emerald-500" />}
                                                {t.transaction_type === 'EXPENSE' && <ArrowDownCircle size={16} className="text-red-500" />}
                                                {t.transaction_type === 'TRANSFER' && <RefreshCw size={16} className="text-blue-500" />}
                                                <span className="font-bold text-white">
                                                    {t.transaction_type === 'INCOME' ? 'Gelir' : t.transaction_type === 'EXPENSE' ? 'Gider' : 'Transfer'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {t.description || '-'}
                                            {t.category && <div className="text-xs text-gray-500">{t.category.name}</div>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${t.transaction_type === 'EXPENSE' ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}`}>
                                                {t.transaction_type === 'EXPENSE' ? 'Çıkış' : 'Giriş'}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-bold text-lg font-mono ${t.transaction_type === 'EXPENSE' ? 'text-red-400' : 'text-green-400'}`}>
                                            {t.transaction_type === 'EXPENSE' ? '-' : '+'}{Number(t.amount).toLocaleString('tr-TR')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
