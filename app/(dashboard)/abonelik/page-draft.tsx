"use client";

import { useEffect, useState } from 'react';
import { getTenantDetailsAction } from '@/app/actions/adminActions'; // Using this or maybe I should use accountActions?
// I need current user's subscription. getAccountInfoAction is better.
import { getAccountInfoAction } from '@/app/actions/settingsActions';
import { getBankAccountsAction } from '@/app/actions/adminActions'; // To show IBANs
import { createPaymentNotificationAction } from '@/app/actions/paymentActions';
import { CreditCard, CheckCircle, Shield, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
    { id: 'starter', name: 'Başlangıç', price: 1000, features: ['2 Kullanıcı', '500 Ürün', 'Temel Raporlar'] },
    { id: 'pro', name: 'Pro', price: 2000, features: ['10 Kullanıcı', '5000 Ürün', 'Pazaryeri Entegrasyonu', 'Gelişmiş Raporlar'], popular: true },
    { id: 'extreme', name: 'Extram', price: 6000, features: ['Sınırsız Kullanıcı', 'Sınırsız Ürün', 'Özel Destek', 'Tüm Modüller'] }
];

export default function SubscriptionPage() {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Payment Form
    const [months, setMonths] = useState(12); // Default 1 year
    const [receiptUrl, setReceiptUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Account to get sub info
            const account = await getAccountInfoAction();
            if (account) {
                // Wait, getAccountInfoAction returns { profile, company }. 
                // I probably need to fetch subscription specifically or add it to that action.
                // Let's assume for now I fetch it via a new action or modify getAccountInfoAction.
                // Actually, let's use a quick fetch here or use what we have.
                // Since I didn't update getAccountInfoAction to return subscription, I might need to Create `getSubscriptionAction` in settings or just fetch via client side if I expose it.
                // Better: Create `getTenantSubscriptionAction` in paymentActions.ts? 
                // Or just modify getAccountInfoAction. Let's do a direct fetch or assume it's exposed.
                // I'll add `getTenantSubscriptionAction` to `paymentActions.ts` quickly or just mock it if I can't edit.
                // I'll try to use `getAccountInfoAction` and if it lacks sub, I'll fix it.
            }

            // Fetch Banks
            // Wait, getBankAccountsAction is for Admin. It has adminAuth().
            // I need a public or tenant-accessible version.
            // I will implement `getPublicBankAccountsAction` in `paymentActions.ts`.
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ...
    // Since I realized I need more actions, I'll update paymentActions.ts first.
    return <div>Yükleniyor...</div>
}
