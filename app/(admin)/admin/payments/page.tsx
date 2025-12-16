"use client";

import { useEffect, useState } from 'react';
import { getPendingPaymentsAction, approvePaymentAction, rejectPaymentAction } from '@/app/actions/paymentActions';
import { CheckCircle, XCircle, Clock, FileText, Search, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getPendingPaymentsAction();
            setPayments(data || []);
        } catch (e) {
            toast.error("Ödemeler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApprove = async (id: number) => {
        if (!confirm("Bu ödemeyi onaylayıp aboneliği başlatmak istiyor musunuz?")) return;
        setProcessingId(id);
        try {
            const res = await approvePaymentAction(id);
            if (res.success) {
                toast.success("Ödeme onaylandı ve abonelik güncellendi.");
                loadData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: number) => {
        const reason = prompt("Reddetme sebebi:");
        if (!reason) return;

        setProcessingId(id);
        try {
            const res = await rejectPaymentAction(id, reason);
            if (res.success) {
                toast.success("Ödeme reddedildi.");
                loadData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-[#0B1120] border border-white/5 p-6 rounded-2xl">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <CreditCard className="text-green-500" />
                        Ödeme Onayları
                    </h1>
                    <p className="text-gray-400 mt-1">Havale/EFT bildirimi yapan müşterilerin onay bekleyen işlemleri.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2 text-white">
                        <Clock size={16} className="text-yellow-500" />
                        <span className="font-bold">{payments.length} Bekleyen</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-white">Yükleniyor...</div>
            ) : payments.length === 0 ? (
                <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-16 text-center text-gray-500">
                    <CheckCircle size={48} className="mx-auto text-green-500/20 mb-4" />
                    Bekleyen ödeme bildirimi yok. Her şey yolunda!
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {payments.map(p => (
                        <div key={p.id} className="bg-[#0B1120] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-white/10 transition">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                    {p.company_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{p.company_name}</h3>
                                    <p className="text-xs text-gray-500 font-mono mb-2">{p.tenant_id}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-gray-300">
                                            Plan: <strong className="text-white uppercase">{p.plan_id}</strong>
                                        </span>
                                        <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-gray-300">
                                            Süre: <strong className="text-white">{p.months} Ay</strong>
                                        </span>
                                        <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-gray-300">
                                            Yöntem: <strong className="text-white capitalize">{p.payment_method?.replace('_', ' ')}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <div className="text-2xl font-black text-white">{p.amount?.toLocaleString()} {p.currency}</div>
                                <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</div>
                                {p.receipt_url && (
                                    <a href={p.receipt_url} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
                                        <FileText size={12} /> Dekontu Gör
                                    </a>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleReject(p.id)}
                                    disabled={processingId === p.id}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"
                                >
                                    <XCircle size={16} /> Reddet
                                </button>
                                <button
                                    onClick={() => handleApprove(p.id)}
                                    disabled={processingId === p.id}
                                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-green-600/20 flex items-center gap-2"
                                >
                                    {processingId === p.id ? 'İşleniyor...' : (
                                        <>
                                            <CheckCircle size={16} /> Onayla
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
