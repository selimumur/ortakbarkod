"use client";

import { useEffect, useState } from 'react';
import { getTenantSubscriptionAction, getPublicBankAccountsAction, createPaymentNotificationAction } from '@/app/actions/paymentActions';
import { useAuth } from '@clerk/nextjs';
import { getPlansAction } from '@/app/actions/planActions';
import { CreditCard, CheckCircle, Shield, Zap, Star, Copy, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionPage() {
    const { orgId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Payment Form
    const [months, setMonths] = useState(12); // Default 1 year
    const [receiptUrl, setReceiptUrl] = useState(''); // Just a text field for now or mock upload
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [subData, bankData, plansData] = await Promise.all([
                getTenantSubscriptionAction(),
                getPublicBankAccountsAction(),
                getPlansAction()
            ]);
            setSubscription(subData);
            setBankAccounts(bankData);
            setPlans(plansData);
        } catch (e) {
            console.error(e);
            toast.error("Bilgiler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) loadData();
    }, [orgId]);

    const handleSelectPlan = (plan: any) => {
        setSelectedPlan(plan);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = async () => {
        if (!months) return toast.error("Süre seçin.");
        if (!receiptUrl && false) return toast.error("Dekont yükleyiniz."); // Optional for now? Or text input.

        setSubmitting(true);
        try {
            // Calculate Logic: If months = 12, use price_yearly, else use monthly price * months
            let amount = 0;
            if (months === 12 && selectedPlan.price_yearly > 0) {
                amount = selectedPlan.price_yearly;
            } else {
                amount = selectedPlan.price * months;
            }

            const res = await createPaymentNotificationAction(amount, 'TRY', selectedPlan.id, months, receiptUrl);
            if (res.success) {
                toast.success("Ödeme bildirimi alındı! Onaylandıktan sonra paketiniz aktif olacak.");
                setIsPaymentModalOpen(false);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to format features for display
    const getPlanFeaturesDisplay = (plan: any) => {
        const list: string[] = [];
        const limits = plan.limits || {};
        const feats = plan.features || {};

        if (limits.users) list.push(`${limits.users} Kullanıcı`);
        if (limits.products) list.push(`${limits.products} Ürün`);
        if (limits.stores) list.push(`${limits.stores} Mağaza`);

        if (feats.marketplace) list.push("Pazaryeri Entegrasyonu");
        if (feats.arbitrage) list.push("Arbitraj Modülü");
        if (feats.advanced_reports) list.push("Gelişmiş Raporlar");
        if (feats.production) list.push("Üretim Modülü");
        if (feats.api_access) list.push("API Erişimi");

        return list;
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

    const currentPlanId = subscription?.plan_id || 'free';
    const remainingDays = subscription?.current_period_end
        ? Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <div className="space-y-8 max-w-6xl mx-auto py-8">

            {/* CURRENT SUBSCRIPTION */}
            <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={150} /></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-white mb-2">Mevcut Abonelik</h2>
                    <div className="flex items-end gap-4">
                        <div className="text-4xl font-black text-blue-400 capitalize">{subscription?.plan_id?.toUpperCase() || 'Ücretsiz / Demo'}</div>
                        <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-bold text-white mb-2">
                            {remainingDays > 0 ? `${remainingDays} GÜN KALDI` : 'SÜRESİ DOLMUŞ'}
                        </div>
                    </div>
                    {subscription?.is_manual && (
                        <p className="text-gray-400 mt-2 text-sm italic">Bu abonelik yönetici tarafından tanımlanmıştır.</p>
                    )}
                </div>
            </div>

            {/* PLANS */}
            <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 px-2">Paket Seçenekleri</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const isCurrent = currentPlanId === plan.id;
                        const featuresList = getPlanFeaturesDisplay(plan);
                        return (
                            <div key={plan.id} className={`bg-white border rounded-2xl p-6 relative transition hover:shadow-xl ${plan.is_popular ? 'border-blue-500 shadow-blue-500/20 shadow-lg' : 'border-gray-200'} ${isCurrent ? 'opacity-70 ring-2 ring-gray-300' : ''}`}>
                                {plan.is_popular && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">EN POPÜLER</div>}
                                <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                                <div className="mt-2 mb-6">
                                    <span className="text-3xl font-black text-gray-900">{plan.price.toLocaleString()} ₺</span>
                                    <span className="text-gray-500 text-sm">/ay</span>
                                    {plan.price_yearly > 0 && (
                                        <div className="text-xs text-green-600 font-bold mt-1">
                                            Yıllık: {plan.price_yearly.toLocaleString()} ₺
                                        </div>
                                    )}
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {featuresList.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                            <CheckCircle size={16} className="text-green-500" /> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2
                                        ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-black text-white hover:bg-gray-800'}`}
                                >
                                    {isCurrent ? 'Mevcut Paket' : 'Seç ve Yükselt'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Abonelik Yükseltme: {selectedPlan.name}</h3>
                                <p className="text-gray-500 text-sm">Havale/EFT ile ödeme yapın.</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* LEFT: BANK INSTRUCTIONS */}
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Info size={16} /> Ödeme Talimatları</h4>
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        Lütfen yandaki hesaplardan birine toplam tutarı gönderin.
                                        Açıklama kısmına <strong>Firma Adınızı</strong> yazmayı unutmayın.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {bankAccounts.map(acc => (
                                        <div key={acc.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition cursor-pointer group" onClick={() => { navigator.clipboard.writeText(acc.iban); toast.success("IBAN Kopyalandı"); }}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-gray-800">{acc.bank_name}</span>
                                                <Copy size={14} className="text-gray-400 group-hover:text-blue-500" />
                                            </div>
                                            <div className="font-mono text-gray-600 text-sm mb-1">{acc.iban}</div>
                                            <div className="text-xs text-gray-400">{acc.account_holder}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* RIGHT: CONFIRMATION FORM */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Süre Seçimi</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setMonths(1)} className={`py-3 px-4 rounded-lg font-bold border ${months === 1 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                                            1 Ay
                                            <div className="text-xs font-normal opacity-70">{selectedPlan.price.toLocaleString()} ₺</div>
                                        </button>
                                        <button onClick={() => setMonths(12)} className={`py-3 px-4 rounded-lg font-bold border ${months === 12 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                                            12 Ay (Yıllık)
                                            <div className="text-xs font-normal opacity-70">
                                                {(selectedPlan.price_yearly || (selectedPlan.price * 12)).toLocaleString()} ₺
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                                    <span className="text-gray-600 font-bold">Toplam Tutar:</span>
                                    <span className="text-2xl font-black text-gray-900">
                                        {(months === 12 ? (selectedPlan.price_yearly || selectedPlan.price * 12) : selectedPlan.price).toLocaleString()} ₺
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Dekont URL (Opsiyonel)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500 text-sm"
                                        placeholder="Dosya linki veya açıklama..."
                                        value={receiptUrl}
                                        onChange={e => setReceiptUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Ödemeyi yaptığınızı bildirmek için butona basın.</p>
                                </div>

                                <button
                                    onClick={handlePaymentSubmit}
                                    disabled={submitting}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-600/20 transition flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Bildiriliyor...' : (
                                        <>
                                            <CheckCircle size={20} /> Ödeme Bildirimi Yap
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
