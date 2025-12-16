"use client";

import { useEffect, useState } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, Landmark,
    ArrowUpRight, ArrowDownLeft, CreditCard, Loader2
} from 'lucide-react';
import { getAccountingDashboardDataAction } from '@/app/actions/accountingActions';
import { toast } from 'sonner';

export default function FinanceDashboard() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>({
        totalBankBalance: 0,
        totalSafeBalance: 0,
        recentTransactions: []
    });

    useEffect(() => {
        fetchSummary();
    }, []);

    async function fetchSummary() {
        setLoading(true);
        try {
            const data = await getAccountingDashboardDataAction();
            const bankAccounts = data.accounts.filter((a: any) => a.type === 'bank');
            const cashAccounts = data.accounts.filter((a: any) => a.type === 'cash');

            const totalBank = bankAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0);
            const totalCash = cashAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0);

            setSummary({
                totalBankBalance: totalBank,
                totalSafeBalance: totalCash,
                recentTransactions: data.recentTransactions || []
            });
        } catch (error: any) {
            console.error(error);
            toast.error("Finansal veriler yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const Widget = ({ title, amount, icon, color, subText }: any) => (
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-white/5 ${color} bg-opacity-20`}>{icon}</div>
                    <span className="text-gray-400 text-sm font-bold uppercase">{title}</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                    ₺{amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                {subText && <p className="text-xs text-gray-500 mt-2">{subText}</p>}
            </div>
        </div>
    );

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#0f1115] text-white"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-2xl font-black text-white mb-6">Finansal Genel Bakış</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <Widget
                    title="Toplam Banka Varlığı"
                    amount={summary.totalBankBalance}
                    icon={<Landmark size={32} />}
                    color="text-blue-500"
                    subText="Tüm banka hesapları"
                />
                <Widget
                    title="Kasa (Nakit)"
                    amount={summary.totalSafeBalance}
                    icon={<Wallet size={32} />}
                    color="text-green-500"
                    subText="Merkez ve şube kasaları"
                />
            </div>

            {/* Son Hareketler Tablosu */}
            <div className="bg-[#1e293b] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg">Son Finansal Hareketler</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#111827] text-gray-200 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4">Tarih</th>
                                <th className="p-4">Tip</th>
                                <th className="p-4">Açıklama</th>
                                <th className="p-4 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {summary.recentTransactions.map((t: any) => (
                                <tr key={t.id} className="hover:bg-white/5 transition">
                                    <td className="p-4 font-mono text-gray-500">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.transaction_type === 'INCOME' ? 'bg-green-500/10 text-green-500' :
                                            t.transaction_type === 'EXPENSE' ? 'bg-red-500/10 text-red-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {t.transaction_type === 'INCOME' ? 'GELİR' :
                                                t.transaction_type === 'EXPENSE' ? 'GİDER' : 'VİRMAN'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300">{t.description || '-'}</td>
                                    <td className={`p-4 text-right font-bold ${t.transaction_type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </td>
                                </tr>
                            ))}
                            {summary.recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 italic">Henüz işlem kaydı bulunmuyor.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
