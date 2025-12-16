"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, MapPin, Building, Wallet, Calendar,
  Printer, Download, Loader2, FileText, Banknote, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getCustomerByIdAction,
  getCustomerMovementsAction,
  recalculateCustomerBalanceAction
} from '@/app/actions/customerActions';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  date: string;
  type: 'invoice' | 'transaction';
  category: string;
  description: string;
  amount: number;
  direction: 'IN' | 'OUT';
  doc_no?: string;
  account_name?: string;
}

export default function CariDetayPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // ID PARSE
  // Handle both "c-123" format or just "123" depending on routing. 
  // Code seemed to expect "c-123".
  const rawId = params.id;
  const typeChar = rawId ? rawId.split('-')[0] : null;
  const realId = rawId ? rawId.split('-')[1] : rawId; // Fallback if no prefix
  // const isCustomer = typeChar === 'c'; // We are in 'cariler', usually Customers.

  useEffect(() => {
    if (realId) {
      fetchCariDetails();
    }
  }, [realId]);

  async function fetchCariDetails() {
    setLoading(true);
    try {
      if (!realId) return;

      const [prof, movs] = await Promise.all([
        getCustomerByIdAction(realId),
        getCustomerMovementsAction(realId)
      ]);

      if (!prof) throw new Error("Müşteri bulunamadı");
      setProfile(prof);

      const mergedHistory: HistoryItem[] = [];

      // Transactions (Payments/Collections)
      if (movs.payments) {
        movs.payments.forEach((t: any) => {
          mergedHistory.push({
            id: `tr-${t.id}`,
            date: t.date,
            type: 'transaction',
            category: t.transaction_type === 'INCOME' ? 'Tahsilat' : 'İade/Ödeme',
            description: t.description || 'İşlem',
            amount: Number(t.amount),
            direction: t.transaction_type === 'INCOME' ? 'IN' : 'OUT', // Collections are IN (Money In)
            doc_no: '-',
            account_name: t.account?.name
          });
        });
      }

      // Invoices
      if (movs.invoices) {
        movs.invoices.forEach((inv: any) => {
          let cat = inv.invoice_type === 'SALES' ? 'Satış Faturası' : 'İade Faturası';
          // Sales Invoice: We want money -> 'IN' logic for green/red coloring context?
          // If strict ledger: 
          // Sales: Debit Customer (Borç).
          // Collection: Credit Customer (Alacak).
          // UI asks: "Borç (Fatura)" vs "Alacak (Ödeme)" columns.

          mergedHistory.push({
            id: `inv-${inv.id}`,
            date: inv.issue_date,
            type: 'invoice',
            category: cat,
            description: inv.description || 'Fatura',
            amount: Number(inv.total_amount),
            direction: 'OUT', // Placeholder, handled in table columns
            doc_no: inv.invoice_no
          });
        });
      }

      // Sort Date Desc
      mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(mergedHistory);

    } catch (error: any) {
      toast.error("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fixBalance() {
    if (!realId) return;
    setRecalculating(true);
    try {
      const newBal = await recalculateCustomerBalanceAction(realId);
      setProfile((prev: any) => ({ ...prev, balance: newBal }));
      toast.success(`Bakiye güncellendi: ₺${newBal.toLocaleString()}`);
    } catch (error: any) {
      toast.error("Güncelleme hatası: " + error.message);
    } finally {
      setRecalculating(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Yükleniyor...</div>;
  if (!profile) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Kayıt bulunamadı.</div>;

  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-sans p-4 md:p-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/muhasebe/cariler"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={20} /> Listeye Dön
        </Link>
        <div className="flex gap-2">
          <button onClick={fixBalance} disabled={recalculating} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition border border-blue-500/30">
            {recalculating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Bakiyeyi Düzelt
          </button>
          <button onClick={handlePrint} className="bg-[#1f2937] hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition">
            <Printer size={16} /> Yazdır
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. KART: PROFİL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#1a1d24] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start justify-between relative z-10 gap-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded border border-blue-500/30 bg-blue-500/10 text-blue-400">
                    Müşteri Hesabı
                  </span>
                </div>
              </div>

              <a
                href={`/muhasebe/finans/islem?type=income&contact_id=${profile.id}`}
                className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition"
              >
                <Wallet size={18} /> Tahsilat Al
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 relative z-10">
              <div className="flex items-center gap-3 text-gray-400 bg-[#111318] p-3 rounded-xl border border-gray-800"><Phone size={18} /> <span>{profile.phone || '-'}</span></div>
              <div className="flex items-center gap-3 text-gray-400 bg-[#111318] p-3 rounded-xl border border-gray-800"><Mail size={18} /> <span>{profile.email || '-'}</span></div>
            </div>
          </div>

          <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center items-center text-center relative overflow-hidden">
            <p className="text-gray-400 uppercase text-sm font-bold tracking-wider mb-2">NET BAKİYE</p>
            <h2 className={`text-4xl font-black mb-2 ${(profile.balance || 0) > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
              ₺{Math.abs(profile.balance || 0).toLocaleString()}
            </h2>
            <p className="text-xs text-gray-500 px-4">
              {(profile.balance || 0) > 0 ? "Alacağımız Var" : "Bakiye Yok / Sıfır"}
            </p>
          </div>
        </div>

        {/* 2. TABLO: HAREKETLER */}
        <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Building size={20} className="text-gray-500" /> Hesap Ekstresi
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="p-4">Tarih</th>
                  <th className="p-4">İşlem</th>
                  <th className="p-4">Açıklama</th>
                  <th className="p-4 text-right">Borç (Satış)</th>
                  <th className="p-4 text-right">Alacak (Tahsilat)</th>
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
                          <Calendar size={14} className="text-gray-500" />
                          {new Date(item.date).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {item.type === 'invoice' ? <FileText size={16} className="text-blue-500" /> : <Banknote size={16} className="text-emerald-500" />}
                          <span className={item.type === 'invoice' ? 'text-blue-400' : 'text-gray-300'}>{item.category}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400">
                        {item.type === 'invoice' ?
                          <span className="text-white font-mono text-xs bg-gray-800 px-2 py-1 rounded">{item.doc_no}</span>
                          :
                          <span>{item.description} {item.account_name && <span className="text-gray-600 text-xs">({item.account_name})</span>}</span>
                        }
                      </td>

                      <td className="p-4 text-right">
                        {/* BORÇ SÜTUNU (FATURA TUTARI) */}
                        {item.type === 'invoice' ? <span className="text-red-400 font-bold">₺{item.amount.toLocaleString()}</span> : <span className="text-gray-700">-</span>}
                      </td>
                      <td className="p-4 text-right">
                        {/* ALACAK SÜTUNU (ÖDEME TUTARI) */}
                        {item.type === 'transaction' ? <span className="text-emerald-400 font-bold">₺{item.amount.toLocaleString()}</span> : <span className="text-gray-700">-</span>}
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