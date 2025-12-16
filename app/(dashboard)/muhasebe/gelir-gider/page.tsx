"use client";

import { useState, useEffect } from 'react';
import {
   Wallet, ArrowUpCircle, ArrowDownCircle, Search,
   Calendar, Trash2, RefreshCw, TrendingUp, TrendingDown,
   CreditCard, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import FinancialTransactionModal from '../finans/components/FinancialTransactionModal';
import { getFilteredTransactionsAction, deleteTransactionAction } from '@/app/actions/accountingActions';

export default function TransactionsPage() {
   const [transactions, setTransactions] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   // İSTATİSTİKLER
   const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

   // FİLTRELER
   const [searchQuery, setSearchQuery] = useState("");
   const [typeFilter, setTypeFilter] = useState("Tümü");
   const [dateRange, setDateRange] = useState(() => {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return {
         start: thirtyDaysAgo.toISOString().split('T')[0],
         end: today.toISOString().split('T')[0]
      };
   });

   // SAYFALAMA
   const [page, setPage] = useState(1);
   const [totalCount, setTotalCount] = useState(0);
   const PAGE_SIZE = 30;

   // MODAL STATE
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('INCOME');

   useEffect(() => {
      fetchData();
   }, [page, dateRange, typeFilter]); // Re-fetch on filter change. Search is manual or debounced ideally.

   // Debounce search?
   useEffect(() => {
      const timer = setTimeout(() => {
         fetchData();
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);


   async function fetchData() {
      setLoading(true);
      try {
         const result = await getFilteredTransactionsAction({
            startDate: dateRange.start,
            endDate: dateRange.end,
            type: typeFilter,
            search: searchQuery,
            page: page,
            pageSize: PAGE_SIZE
         });

         setTransactions(result.data);
         setTotalCount(result.totalCount);
         setStats(result.stats);

      } catch (error: any) {
         console.error("Hata:", error);
         toast.error("Veriler yüklenirken hata oluştu: " + error.message);
      } finally {
         setLoading(false);
      }
   }

   // --- İŞLEM SİLME ---
   async function handleDelete(id: number) {
      if (!confirm("Bu kaydı silmek istediğine emin misin? (Bakiye otomatik olarak geri alınacak)")) return;

      try {
         await deleteTransactionAction(id);
         toast.success("Kayıt silindi ve bakiye güncellendi.");
         fetchData();
      } catch (error: any) {
         toast.error("Hata: " + error.message);
      }
   }

   const openModal = (type: 'INCOME' | 'EXPENSE') => {
      setModalType(type);
      setIsModalOpen(true);
   };

   // Sayfa Değiştirme
   const totalPages = Math.ceil(totalCount / PAGE_SIZE);

   return (
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 animate-in fade-in duration-500">

         {/* BAŞLIK VE HEDEF */}
         <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
               <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2 flex items-center gap-3">
                  Gelir & Gider Yönetimi
               </h1>
               <div className="flex items-center gap-2 text-gray-400">
                  <p>Nakit akışınızı yönetin.</p>
                  <span className="text-gray-600">|</span>
                  <span className="text-xs font-bold border border-gray-700 rounded px-2 py-1">Son 30 Gün Verisi Gösteriliyor (Değiştirmek için filtre kullanın)</span>
               </div>
            </div>

            <div className="flex gap-4">
               <button
                  onClick={() => openModal('INCOME')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/20"
               >
                  <ArrowUpCircle size={20} /> Gelir Ekle
               </button>
               <button
                  onClick={() => openModal('EXPENSE')}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition shadow-lg shadow-rose-900/20"
               >
                  <ArrowDownCircle size={20} /> Gider Ekle
               </button>
            </div>
         </div>

         {/* İSTATİSTİK KARTLARI */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* GELİR */}
            <div className="bg-[#0F172A] border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8 transition group-hover:bg-emerald-500/20"></div>
               <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <TrendingUp size={24} />
                     </div>
                     <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Toplam Gelir ({dateRange.start} - {dateRange.end})</span>
                  </div>
                  <div className="text-3xl font-black text-white">
                     ₺{stats.income.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 text-xs text-emerald-500 font-bold flex items-center gap-1">
                     <ArrowUpCircle size={12} /> Seçili Dönem
                  </div>
               </div>
            </div>

            {/* GİDER */}
            <div className="bg-[#0F172A] border border-rose-500/20 p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-bl-full -mr-8 -mt-8 transition group-hover:bg-rose-500/20"></div>
               <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                        <TrendingDown size={24} />
                     </div>
                     <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Toplam Gider ({dateRange.start} - {dateRange.end})</span>
                  </div>
                  <div className="text-3xl font-black text-white">
                     ₺{stats.expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 text-xs text-rose-500 font-bold flex items-center gap-1">
                     <ArrowDownCircle size={12} /> Seçili Dönem
                  </div>
               </div>
            </div>

            {/* NET */}
            <div className={`bg-[#0F172A] border p-6 rounded-3xl relative overflow-hidden group ${stats.balance >= 0 ? 'border-blue-500/20' : 'border-orange-500/20'}`}>
               <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-8 -mt-8 transition ${stats.balance >= 0 ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}></div>
               <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                     <div className={`p-3 rounded-xl ${stats.balance >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        <Wallet size={24} />
                     </div>
                     <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Net Nakit Akışı</span>
                  </div>
                  <div className="text-3xl font-black text-white">
                     {stats.balance < 0 ? '-' : ''}₺{Math.abs(stats.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${stats.balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                     {stats.balance >= 0 ? 'Kâr Durumu' : 'Nakit Açığı'}
                  </div>
               </div>
            </div>
         </div>

         {/* HAREKET LİSTESİ */}
         <div className="bg-[#0F172A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            {/* TABLO BAŞLIĞI VE FİLTRE */}
            <div className="p-6 border-b border-white/5 flex flex-col xl:flex-row gap-4 justify-between items-center">
               <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                  {/* Tarih Filtresi */}
                  <div className="flex items-center bg-[#020617] p-1 rounded-xl border border-white/10">
                     <input
                        type="date"
                        className="bg-transparent text-white text-xs p-2 outline-none w-32"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                     />
                     <span className="text-gray-500">-</span>
                     <input
                        type="date"
                        className="bg-transparent text-white text-xs p-2 outline-none w-32"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                     />
                  </div>

                  <div className="relative flex-1 md:flex-none md:w-64">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input
                        type="text"
                        placeholder="Açıklama ara..."
                        className="w-full bg-[#020617] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-xs outline-none focus:border-blue-500 transition placeholder:text-gray-600"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                     />
                  </div>

                  <select
                     className="bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500"
                     value={typeFilter}
                     onChange={e => setTypeFilter(e.target.value)}
                  >
                     <option>Tümü</option>
                     <option>Gelir</option>
                     <option>Gider</option>
                     <option>Virman</option>
                  </select>
               </div>

               <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-500 font-bold">
                     Toplam {totalCount} Kayıt
                  </p>
                  {/* PAGINATION */}
                  <div className="flex items-center gap-2">
                     <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                     >
                        {'<'}
                     </button>
                     <span className="text-sm font-bold w-12 text-center text-gray-400">
                        {page} / {totalPages || 1}
                     </span>
                     <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                     >
                        {'>'}
                     </button>
                  </div>

                  <button onClick={() => fetchData()} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition">
                     <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-black/20 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                        <th className="p-6">Tarih</th>
                        <th className="p-6">Kategori / Açıklama</th>
                        <th className="p-6">Hesap / Kaynak</th>
                        <th className="p-6 text-right">Tutar</th>
                        <th className="p-6 text-center">İşlem</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {loading ? (
                        <tr><td colSpan={5} className="p-12 text-center text-gray-500">Yükleniyor...</td></tr>
                     ) : transactions.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                     ) : (
                        transactions.map((t) => (
                           <tr key={t.id} className="group hover:bg-white/5 transition duration-200">
                              <td className="p-6 whitespace-nowrap">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.transaction_type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : t.transaction_type === 'EXPENSE' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                       {t.transaction_type === 'INCOME' ? <ArrowUpCircle size={20} /> : t.transaction_type === 'EXPENSE' ? <ArrowDownCircle size={20} /> : <RefreshCw size={20} />}
                                    </div>
                                    <div>
                                       <p className="text-white font-bold text-sm">{new Date(t.date).toLocaleDateString('tr-TR')}</p>
                                       <p className="text-xs text-gray-500">{new Date(t.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="p-6">
                                 <div className="flex flex-col">
                                    <span className="text-white font-bold text-sm flex items-center gap-2">
                                       {t.category?.name || t.finance_categories?.name || "Kategorisiz"}
                                       <span className={`text-[10px] px-2 py-0.5 rounded border ${t.transaction_type === 'INCOME' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : t.transaction_type === 'EXPENSE' ? 'border-rose-500/30 text-rose-500 bg-rose-500/10' : 'border-blue-500/30 text-blue-500 bg-blue-500/10'}`}>
                                          {t.transaction_type === 'INCOME' ? 'GELİR' : t.transaction_type === 'EXPENSE' ? 'GİDER' : 'VİRMAN'}
                                       </span>
                                    </span>
                                    <span className="text-xs text-gray-400 mt-1">{t.description || "Açıklama yok"}</span>
                                 </div>
                              </td>
                              <td className="p-6">
                                 <div className="flex items-center gap-2 text-sm text-blue-400 font-medium bg-blue-500/10 px-3 py-1.5 rounded-lg w-fit">
                                    <CreditCard size={14} />
                                    {/* Account name logic could be diverse depending on join */}
                                    {t.account?.name || t.financial_accounts?.name || 'Hesap'}
                                 </div>
                              </td>
                              <td className="p-6 text-right">
                                 <span className={`text-lg font-black ${t.transaction_type === 'INCOME' ? 'text-emerald-400' : t.transaction_type === 'EXPENSE' ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {t.transaction_type === 'INCOME' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                 </span>
                              </td>
                              <td className="p-6 text-center">
                                 <button
                                    onClick={() => handleDelete(t.id)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 transition"
                                    title="Sil"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* NEW SHARED MODAL */}
         <FinancialTransactionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={fetchData}
            preSelectedType={modalType}
         />

      </div>
   );
}
