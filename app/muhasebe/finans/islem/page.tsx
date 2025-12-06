"use client";

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Wallet, User, Building2, Calendar, CreditCard, Banknote, ScrollText, FileText, Bitcoin, Save, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../../../supabase'; // Supabase yolunu kontrol et (../../..)
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function FinancialTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // VERİLER
  const [accounts, setAccounts] = useState<any[]>([]); // Kasalar
  const [contacts, setContacts] = useState<any[]>([]); // Müşteriler veya Tedarikçiler
  
  // FORM DURUMU
  const [transactionType, setTransactionType] = useState<'payment' | 'collection'>('payment'); // payment: Ödeme Yap (Çıkış), collection: Ödeme Al (Giriş)
  const [formData, setFormData] = useState({
    contact_id: "", // Seçilen Müşteri veya Tedarikçi ID
    account_id: "", // Kasa/Banka ID
    amount: "",
    date: new Date().toISOString().split('T')[0],
    method: "Nakit",
    description: ""
  });

  const paymentMethods = [
    { id: "Nakit", icon: <Banknote size={18} />, label: "Nakit" },
    { id: "Kredi Kartı", icon: <CreditCard size={18} />, label: "Kredi Kartı" },
    { id: "Havale/EFT", icon: <Building2 size={18} />, label: "Havale/EFT" },
    { id: "Çek", icon: <ScrollText size={18} />, label: "Çek" },
    { id: "Senet", icon: <FileText size={18} />, label: "Senet" },
    { id: "Kripto", icon: <Bitcoin size={18} />, label: "Kripto" },
  ];

  // 1. Verileri Çek (Kasa ve Kişiler)
  useEffect(() => {
    fetchInitialData();
  }, [transactionType]); // İşlem türü değişince kişi listesini yenile

  async function fetchInitialData() {
    setLoading(true);
    // Kasaları Çek
    const { data: accs } = await supabase.from('financial_accounts').select('*');
    if (accs) setAccounts(accs);

    // Kişileri Çek (Türe göre Müşteri veya Tedarikçi)
    let contactData = [];
    if (transactionType === 'payment') {
      // Ödeme Yapıyorsak -> Tedarikçileri getir
      const { data: sups } = await supabase.from('suppliers').select('id, name, balance');
      contactData = sups || [];
    } else {
      // Tahsilat Alıyorsak -> Müşterileri getir
      const { data: custs } = await supabase.from('customers').select('id, name, balance');
      contactData = custs || [];
    }
    setContacts(contactData);
    setLoading(false);
  }

  // 2. İŞLEMİ KAYDET VE BAKİYELERİ GÜNCELLE
  async function handleSave() {
    if (!formData.contact_id || !formData.account_id || !formData.amount) {
      toast.error("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setLoading(true);
    const amountVal = Number(formData.amount);

    try {
      // A. İşlem Kaydı Oluştur
      const { error: transError } = await supabase.from('financial_transactions').insert({
        type: transactionType === 'payment' ? 'Ödeme' : 'Tahsilat',
        direction: transactionType === 'payment' ? 'OUT' : 'IN', // Para Çıkışı / Girişi
        category: transactionType === 'payment' ? 'Tedarikçi Ödemesi' : 'Müşteri Tahsilatı',
        amount: amountVal,
        description: formData.description,
        date: formData.date,
        payment_method: formData.method,
        account_id: Number(formData.account_id),
        supplier_id: transactionType === 'payment' ? Number(formData.contact_id) : null,
        customer_id: transactionType === 'collection' ? Number(formData.contact_id) : null,
      });

      if (transError) throw transError;

      // B. Kasa Bakiyesini Güncelle
      // Ödeme ise Kasa Azalır (-), Tahsilat ise Kasa Artar (+)
      const selectedAccount = accounts.find(a => a.id === Number(formData.account_id));
      const newAccountBalance = transactionType === 'payment' 
        ? (selectedAccount.balance - amountVal) 
        : (selectedAccount.balance + amountVal);

      await supabase.from('financial_accounts')
        .update({ balance: newAccountBalance })
        .eq('id', Number(formData.account_id));

      // C. Cari (Müşteri/Tedarikçi) Bakiyesini Güncelle
      const selectedContact = contacts.find(c => c.id === Number(formData.contact_id));
      // Mantık: 
      // Tedarikçiye Ödeme Yaparsak -> Borcumuz azalır (Bakiye düşer veya artar, sistemine göre. Genelde Tedarikçi Bakiyesi = Borcumuzdur, azalmalı)
      // Müşteriden Tahsilat Alırsak -> Alacağımız azalır (Bakiye düşer)
      // Buradaki mantık "Bakiye = Risk" ise her iki durumda da bakiye düşmeli.
      // Eğer "Bakiye = Cüzdan" ise (Tedarikçinin bizdeki parası), ödeme yapınca artar.
      // Genelde cari hesapta: Borç ödenince bakiye düşer.
      const newContactBalance = (selectedContact.balance || 0) - amountVal; 

      if (transactionType === 'payment') {
        await supabase.from('suppliers').update({ balance: newContactBalance }).eq('id', Number(formData.contact_id));
      } else {
        await supabase.from('customers').update({ balance: newContactBalance }).eq('id', Number(formData.contact_id));
      }

      toast.success("İşlem başarıyla kaydedildi! Bakiyeler güncellendi.");
      
      // Formu Sıfırla
      setFormData({ ...formData, amount: "", description: "" });
      fetchInitialData(); // Yeni bakiyeleri çek

    } catch (error: any) {
      toast.error("Hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full h-full bg-[#0B1120] text-white font-sans">
      <main className="flex-1 overflow-y-auto h-full p-8">
        
        <div className="max-w-3xl mx-auto">
          {/* BAŞLIK */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Wallet className="text-blue-500" size={32}/> Finansal İşlem
              </h2>
              <p className="text-gray-400 mt-1">Ödeme yapın veya tahsilat girin.</p>
            </div>
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-white">Geri Dön</button>
          </div>

          {/* İŞLEM TÜRÜ SEÇİMİ (DEV BUTONLAR) */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => { setTransactionType('payment'); setFormData({...formData, contact_id: ""}); }}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${transactionType === 'payment' 
                ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-900/20' 
                : 'bg-[#111827] border-gray-800 text-gray-500 hover:border-gray-700'}`}
            >
              <ArrowUpCircle size={40} />
              <span className="font-bold text-lg">ÖDEME YAP</span>
              <span className="text-xs opacity-70">Tedarikçiye veya Gidere</span>
            </button>

            <button 
              onClick={() => { setTransactionType('collection'); setFormData({...formData, contact_id: ""}); }}
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
                    onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
                  >
                    <option value="">Seçiniz...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Bakiye: {c.balance} TL)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Kasa/Banka Seçimi */}
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block uppercase">Kasa / Banka</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <select 
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 pl-10 text-white outline-none focus:border-blue-500 transition appearance-none"
                    value={formData.account_id}
                    onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                  >
                    <option value="">Paranın Kaynağı/Hedefi...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.balance} TL)
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
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
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
                    onClick={() => setFormData({...formData, method: m.id})}
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
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
              {loading ? <RefreshCw className="animate-spin"/> : <CheckCircle />}
              {transactionType === 'payment' ? 'ÖDEMEYİ TAMAMLA' : 'TAHSİLATI KAYDET'}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}