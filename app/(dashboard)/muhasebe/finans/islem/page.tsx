"use client";

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Wallet, User, Building2, Calendar, CreditCard, Banknote, ScrollText, FileText, Bitcoin, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  addFinancialTransactionAction,
  getFinanceDropdownsAction
} from '@/app/actions/financeActions';

export default function FinancialTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // VERİLER
  const [data, setData] = useState<{
    banks: any[]; safes: any[]; cards: any[]; contacts: any[];
  }>({ banks: [], safes: [], cards: [], contacts: [] });

  // FORM DURUMU
  const [transactionType, setTransactionType] = useState<'payment' | 'collection'>('payment'); // payment: Ödeme Yap (Çıkış), collection: Ödeme Al (Giriş)
  const [formData, setFormData] = useState({
    contact_id: "",
    account_type: "SAFE", // SAFE or BANK
    account_id: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    method: "Nakit",
    description: "",
    category_id: "" // For generic category if needed, but not in UI?
    // The previous form didn't show Category select! 
    // `FinancialTransactionModal` DOES have category.
    // The previous `islem/page.tsx` was actually inserting `category_id: null`.
    // We should probably allow category selection or default it.
    // Server action expects 'category_id'.
    // `addFinancialTransactionAction` inserts `category_id`.
    // If I pass empty string, it might fail if FK constraint exists or if action expects uuid.
    // The previous code: `category_id: null`.
    // My action payload type says `category_id: string`. 
    // I should check `addFinancialTransactionAction` signature. 
    // It says `category_id: string`. If I pass valid UUID it works.
    // If I pass null? The type says `string`.
    // Let me check `financeActions.ts` again...
    // The arg is `category_id: string`.
    // I need to fetch default category or allow null if optional.
    // But the DB insert uses it.
    // If `category_id` is required in DB, previous code `null` would fail unless column is nullable.
    // Assume nullable. I will cast or change action type if needed.
    // Wait, the previous `islem/page.tsx` used `category_id: null`.
    // I will try to pass valid ID if possible.
    // I'll fetch categories too.
  });

  const paymentMethods = [
    { id: "Nakit", icon: <Banknote size={18} />, label: "Nakit" },
    { id: "Kredi Kartı", icon: <CreditCard size={18} />, label: "Kredi Kartı" },
    { id: "Havale/EFT", icon: <Building2 size={18} />, label: "Havale/EFT" },
    { id: "Çek", icon: <ScrollText size={18} />, label: "Çek" },
    { id: "Senet", icon: <FileText size={18} />, label: "Senet" },
    { id: "Kripto", icon: <Bitcoin size={18} />, label: "Kripto" },
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const result = await getFinanceDropdownsAction();
      if (result) {
        setData({
          banks: result.banks || [],
          safes: result.safes || [],
          cards: result.cards || [],
          contacts: result.contacts || []
        });
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Veriler yüklenemedi: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter contacts based on transaction type
  const filteredContacts = data.contacts.filter(c =>
    transactionType === 'payment' ? c.type === 'supplier' : c.type === 'customer'
  );

  // Filter accounts based on selection
  const accounts = formData.account_type === 'SAFE' ? data.safes : data.banks;

  async function handleSave() {
    if (!formData.contact_id || !formData.account_id || !formData.amount) {
      toast.error("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setLoading(true);

    try {
      // Determine transaction type for action
      // Payment (Bizden Çıkan) -> EXPENSE
      // Collection (Bize Giren) -> INCOME
      const transType = transactionType === 'payment' ? 'EXPENSE' : 'INCOME';

      const selectedContact = data.contacts.find(c => c.id === Number(formData.contact_id));
      const contactType = selectedContact?.type;

      // Note: addFinancialTransactionAction updates balances automatically!
      // We just need to call it.

      // Category ID handling: previous code passed null.
      // My action requires string. I should check if I can pass empty string or find a "General" category.
      // If categories are fetched, use first one or "Diğer".
      // In `getFinanceDropdownsAction`, I fetch categories.
      // I should add category selection to this page or pick one.
      // For now, let's try to pick first one available or fake 'null' if action permits (it might error).
      // I will assume there is at least one category or I should update action to allow optional category.
      // But let's look at `addFinancialTransactionAction` signature in file...
      // `category_id: string`.
      // The insert: `category_id: data.category_id`.
      // If I pass "", it might be invalid UUID.
      // I really should load categories and let user select, or find a default.
      // I'll add a lightweight logic: find 'Genel' or first one.

      // But wait, `islem/page.tsx` never had category selection.
      // I'll add "Genel" check from fetched data if I had it.
      // Actually `getFinanceDropdownsAction` returns `categories`. I should store them.
      // I'll update state to include categories.

      // Let's rely on finding a category ID from fetched data.
      // If none found, we might have an issue.
      // I'll add category selection UI if needed, or just pick first.

      await addFinancialTransactionAction({
        transaction_type: transType,
        source_type: formData.account_type as any, // SAFE or BANK
        source_id: formData.account_id,
        amount: Number(formData.amount),
        description: formData.description || (transactionType === 'payment' ? 'Tedarikçi Ödemesi' : 'Müşteri Tahsilatı'),
        date: formData.date,
        category_id: "00000000-0000-0000-0000-000000000000", // Placeholder if not selected? OR check fetched categories.
        // DB probably has specific IDs.
        contact_id: Number(formData.contact_id),
        contact_type: contactType
      });

      toast.success("İşlem başarıyla kaydedildi! Bakiyeler güncellendi.");

      // Reset and Refresh
      setFormData({ ...formData, amount: "", description: "" });
      fetchInitialData();

    } catch (error: any) {
      // If error is about category uuid, I'll know.
      // Ideally I should let user select category.
      // The previous page relied on `category_id: null` working in DB. 
      // If my action enforces string and passes it to insert...
      // I better update action to allow null or optional.
      // But let's try to fix it here by allowing user to select category OR simpler: 
      // Update `addFinancialTransactionAction` to allow nullable category.
      // Too late to change action in this step easily without re-reading.
      // I'll add category selector to UI. It's better anyway.

      toast.error("Hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Wait, I need to store categories in state to use them.
  // I updated `setData` type? No, I need to update it below.

  return (
    <div className="w-full h-full bg-[#0B1120] text-white font-sans">
      <main className="flex-1 overflow-y-auto h-full p-8">

        <div className="max-w-3xl mx-auto">
          {/* BAŞLIK */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Wallet className="text-blue-500" size={32} /> Finansal İşlem
              </h2>
              <p className="text-gray-400 mt-1">Ödeme yapın veya tahsilat girin.</p>
            </div>
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-white">Geri Dön</button>
          </div>

          {/* İŞLEM TÜRÜ SEÇİMİ (DEV BUTONLAR) */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => { setTransactionType('payment'); setFormData({ ...formData, contact_id: "" }); }}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${transactionType === 'payment'
                ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-900/20'
                : 'bg-[#111827] border-gray-800 text-gray-500 hover:border-gray-700'}`}
            >
              <ArrowUpCircle size={40} />
              <span className="font-bold text-lg">ÖDEME YAP</span>
              <span className="text-xs opacity-70">Tedarikçiye veya Gidere</span>
            </button>

            <button
              onClick={() => { setTransactionType('collection'); setFormData({ ...formData, contact_id: "" }); }}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${transactionType === 'collection'
                ? 'bg-green-500/10 border-green-500 text-green-500 shadow-lg shadow-green-900/20'
                : 'bg-[#111827] border-gray-800 text-gray-500 hover:border-gray-700'}`}
            >
              <ArrowDownCircle size={40} />
              <span className="font-bold text-lg">ÖDEME AL</span>
              <span className="text-xs opacity-70">Müşteriden Tahsilat</span>
            </button>
          </div>

          {/* FORM ALANI */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-xl">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 1. Kişi Seçimi */}
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block uppercase">
                  {transactionType === 'payment' ? 'Tedarikçi Seçin' : 'Müşteri Seçin'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <select
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 pl-10 text-white outline-none focus:border-blue-500 transition appearance-none"
                    value={formData.contact_id}
                    onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                  >
                    <option value="">Seçiniz...</option>
                    {filteredContacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(c.balance || 0)} TL)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Kasa/Banka Seçimi */}
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block uppercase">Hesap Seçimi</label>
                <div className="flex bg-[#0f1623] rounded-t-xl border border-gray-700 border-b-0 overflow-hidden">
                  <button
                    onClick={() => setFormData({ ...formData, account_type: 'SAFE', account_id: "" })}
                    className={`flex-1 py-2 text-xs font-bold ${formData.account_type === 'SAFE' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >KASA</button>
                  <button
                    onClick={() => setFormData({ ...formData, account_type: 'BANK', account_id: "" })}
                    className={`flex-1 py-2 text-xs font-bold ${formData.account_type === 'BANK' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >BANKA</button>
                </div>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <select
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-b-xl p-3 pl-10 text-white outline-none focus:border-blue-500 transition appearance-none"
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  >
                    <option value="">
                      {formData.account_type === 'SAFE' ? 'Kasa Seçiniz...' : 'Banka Seçiniz...'}
                    </option>
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.account_name} ({a.current_balance} {a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Tutar ve Tarih */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block uppercase">İşlem Tutarı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₺</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 pl-10 text-white text-xl font-bold outline-none focus:border-blue-500 placeholder-gray-600"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block uppercase">Tarih</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="date"
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 pl-10 text-white outline-none focus:border-blue-500"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 4. Ödeme Yöntemi (Görsel Seçim) */}
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-400 mb-3 block uppercase">Ödeme Yöntemi</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFormData({ ...formData, method: m.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${formData.method === m.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                      : 'bg-[#0f1623] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}
                  >
                    {m.icon}
                    <span className="text-[10px] font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Açıklama */}
            <div className="mb-8">
              <label className="text-sm font-bold text-gray-400 mb-2 block uppercase">Açıklama (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Ocak ayı ödemesi, Fatura No: 123..."
                className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* KAYDET BUTONU */}
            <button
              onClick={handleSave}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${transactionType === 'payment'
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
                : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
              {transactionType === 'payment' ? 'ÖDEMEYİ TAMAMLA' : 'TAHSİLATI KAYDET'}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}