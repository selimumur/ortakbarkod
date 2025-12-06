"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation'; 
import { 
  ArrowLeft, Phone, Mail, MapPin, Building, Wallet, Calendar, 
  Printer, Download, Loader2, FileText, Banknote, RefreshCw
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  date: string;
  type: 'invoice' | 'transaction';
  category: string;
  description: string;
  amount: number;
  direction: 'IN' | 'OUT';
  doc_no?: string;
}

export default function CariDetayPage() {
  const router = useRouter();
  const params = useParams();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false); // Hesaplama durumu
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // ID PARSE
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const typeChar = rawId ? rawId.split('-')[0] : null; 
  const realId = rawId ? rawId.split('-')[1] : null; 
  const isCustomer = typeChar === 'c';

  useEffect(() => {
    if (realId) {
      fetchCariDetails();
    }
  }, [realId]);

  async function fetchCariDetails() {
    setLoading(true);
    try {
      if (!realId) return;

      const table = isCustomer ? 'customers' : 'suppliers';
      const { data: profileData } = await supabase.from(table).select('*').eq('id', realId).single();
      setProfile(profileData);

      // Finansal İşlemler
      const transColumn = isCustomer ? 'customer_id' : 'supplier_id';
      const { data: transData } = await supabase.from('financial_transactions').select('*').eq(transColumn, realId);

      // Faturalar
      const { data: invoiceData } = await supabase.from('invoices').select('*').eq('contact_id', realId);

      const mergedHistory: HistoryItem[] = [];

      // İşlemleri Listeye Ekle
      if (transData) {
        transData.forEach((t: any) => {
          mergedHistory.push({
            id: `tr-${t.id}`,
            date: t.date,
            type: 'transaction',
            category: t.type === 'Tahsilat' ? 'Tahsilat' : 'Ödeme',
            description: t.description || 'İşlem',
            amount: Number(t.amount),
            direction: t.direction,
            doc_no: '-'
          });
        });
      }

      // Faturaları Listeye Ekle
      if (invoiceData) {
        invoiceData.forEach((inv: any) => {
          let cat = inv.invoice_type === 'sales' ? 'Satış Faturası' : 'Alış Faturası';
          // Görselleştirme için:
          // Satış Faturası = Bize Para Gelmeli (IN/Alacak)
          // Alış Faturası = Bizden Para Çıkmalı (OUT/Borç)
          // NOT: Bu sadece listede yeşil/kırmızı göstermek içindir.
          let dir: 'IN' | 'OUT' = inv.invoice_type === 'sales' ? 'IN' : 'OUT';

          mergedHistory.push({
            id: `inv-${inv.id}`,
            date: inv.issue_date,
            type: 'invoice',
            category: cat,
            description: inv.note || 'Fatura',
            amount: Number(inv.total_amount),
            direction: dir,
            doc_no: inv.invoice_no
          });
        });
      }

      // Tarihe göre sırala
      mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(mergedHistory);

    } catch (error: any) {
      toast.error("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- BAKİYE DÜZELTME SİHİRBAZI ---
  // Tüm geçmişi tarar, gerçek bakiyeyi bulur ve veritabanına yazar.
  async function fixBalance() {
    if (!realId || !profile) return;
    setRecalculating(true);

    try {
        let calculatedBalance = 0;

        // 1. Faturaların Toplamı
        const { data: invoices } = await supabase.from('invoices').select('*').eq('contact_id', realId);
        
        // 2. Ödemelerin Toplamı
        const transColumn = isCustomer ? 'customer_id' : 'supplier_id';
        const { data: transactions } = await supabase.from('financial_transactions').select('*').eq(transColumn, realId);

        // HESAPLAMA MANTIĞI:
        // Müşteri için: (Satış Faturaları) - (Tahsilatlar)
        // Tedarikçi için: (Alış Faturaları) - (Ödemeler)
        
        let totalDebt = 0; // Borçlandıkları (Faturalar)
        let totalPaid = 0; // Ödedikleri (Tahsilatlar)

        invoices?.forEach(inv => {
           // Satış faturası ise müşterinin borcu artar
           // Alış faturası ise bizim borcumuz artar (Tedarikçi bakiyesi)
           totalDebt += Number(inv.total_amount);
        });

        transactions?.forEach(tr => {
            // Tahsilat veya Ödeme bakiyeyi düşürür
            // (Müşteri öderse borcu düşer, Biz ödersek borcumuz düşer)
            totalPaid += Number(tr.amount);
        });

        // Yeni Bakiye (Kalan Borç)
        calculatedBalance = totalDebt - totalPaid;

        // Veritabanını Güncelle
        const table = isCustomer ? 'customers' : 'suppliers';
        await supabase.from(table).update({ balance: calculatedBalance }).eq('id', realId);

        // Arayüzü Güncelle
        setProfile({ ...profile, balance: calculatedBalance });
        toast.success(`Bakiye yeniden hesaplandı: ₺${calculatedBalance.toLocaleString()}`);

    } catch (error: any) {
        toast.error("Hesaplama hatası: " + error.message);
    } finally {
        setRecalculating(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (!rawId) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>;
  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Yükleniyor...</div>;
  if (!profile) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white">Kayıt bulunamadı.</div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans p-4 md:p-8">
      
      {/* ÜST BAŞLIK */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={20} /> Listeye Dön
        </button>
        <div className="flex gap-2">
           <button onClick={fixBalance} disabled={recalculating} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition border border-blue-500/30">
             {recalculating ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
             Bakiyeyi Düzelt
           </button>
           <button onClick={handlePrint} className="bg-[#1f2937] hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition">
             <Printer size={16}/> Yazdır
           </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 1. KART: PROFİL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-start justify-between relative z-10 gap-4">
                <div className="flex gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg ${isCustomer ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}`}>
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded border ${isCustomer ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-400'}`}>
                      {isCustomer ? 'Müşteri Hesabı' : 'Tedarikçi Hesabı'}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => router.push('/muhasebe/finans/islem')}
                  className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                >
                  <Wallet size={18}/> {isCustomer ? 'Tahsilat Al' : 'Ödeme Yap'}
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 relative z-10">
                <div className="flex items-center gap-3 text-gray-400 bg-[#0f1623] p-3 rounded-xl border border-gray-800"><Phone size={18}/> <span>{profile.phone || '-'}</span></div>
                <div className="flex items-center gap-3 text-gray-400 bg-[#0f1623] p-3 rounded-xl border border-gray-800"><Mail size={18}/> <span>{profile.email || '-'}</span></div>
             </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center items-center text-center relative overflow-hidden">
             <div className={`absolute inset-0 opacity-5 ${isCustomer ? 'bg-green-500' : 'bg-red-500'}`}></div>
             <p className="text-gray-400 uppercase text-sm font-bold tracking-wider mb-2">NET BAKİYE</p>
             <h2 className={`text-4xl font-black mb-2 ${
               (profile.balance || 0) > 0 ? (isCustomer ? 'text-green-400' : 'text-red-400') : 'text-gray-400'
             }`}>
               ₺{Math.abs(profile.balance || 0).toLocaleString()}
             </h2>
             <p className="text-xs text-gray-500 px-4">
               {profile.balance === 0 ? "Bakiye Yok" : (isCustomer ? "Alacağımız Var" : "Borcumuz Var")}
             </p>
          </div>
        </div>

        {/* 2. TABLO: HAREKETLER */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Building className="text-gray-500"/> Hesap Ekstresi
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="p-4">Tarih</th>
                  <th className="p-4">İşlem</th>
                  <th className="p-4">Açıklama</th>
                  <th className="p-4 text-right">Borç (Fatura)</th>
                  <th className="p-4 text-right">Alacak (Ödeme)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {history.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Kayıt yok.</td></tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-800/30 transition">
                      <td className="p-4 text-gray-300 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-500"/>
                          {new Date(item.date).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                           {item.type === 'invoice' ? <FileText size={16} className="text-blue-500"/> : <Banknote size={16} className="text-green-500"/>}
                           <span className={item.type === 'invoice' ? 'text-blue-400' : 'text-gray-300'}>{item.category}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400">
                        {item.type === 'invoice' ? <span className="text-white font-mono text-xs bg-gray-800 px-2 py-1 rounded">{item.doc_no}</span> : item.description}
                      </td>
                      
                      {/* GÖRSELLEŞTİRME MANTIĞI: Fatura Borçlandırır, Ödeme Alacaklandırır */}
                      <td className="p-4 text-right">
                        {/* BORÇ SÜTUNU (FATURA TUTARI) */}
                        {item.type === 'invoice' ? <span className="text-red-400 font-bold">₺{item.amount.toLocaleString()}</span> : <span className="text-gray-700">-</span>}
                      </td>
                      <td className="p-4 text-right">
                         {/* ALACAK SÜTUNU (ÖDEME TUTARI) */}
                        {item.type === 'transaction' ? <span className="text-green-400 font-bold">₺{item.amount.toLocaleString()}</span> : <span className="text-gray-700">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}