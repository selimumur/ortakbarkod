"use client";

import { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Search, Filter, Calendar, Save, X, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabase';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]); // Kasa/Banka Listesi
  const [loading, setLoading] = useState(false);
  
  // İSTATİSTİKLER
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

  // FİLTRELER
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");

  // YENİ İŞLEM FORMU
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "Gider", // veya Gelir
    category: "",
    amount: "",
    description: "",
    account_id: "",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // 1. Hareketleri Çek
    const { data: trans } = await supabase
        .from('financial_transactions')
        .select('*, financial_accounts(name)')
        .order('date', { ascending: false });
    
    // 2. Hesapları Çek (Dropdown için)
    const { data: accs } = await supabase.from('financial_accounts').select('*');

    if (trans) {
        setTransactions(trans);
        // Toplamları Hesapla
        const inc = trans.filter(t => t.type === 'Gelir').reduce((a, b) => a + b.amount, 0);
        const exp = trans.filter(t => t.type === 'Gider').reduce((a, b) => a + b.amount, 0);
        setStats({ income: inc, expense: exp, balance: inc - exp });
    }
    if (accs) setAccounts(accs);
    
    setLoading(false);
  }

  // --- İŞLEM KAYDETME VE BAKİYE GÜNCELLEME ---
  async function handleSave() {
    if (!formData.amount || !formData.account_id || !formData.category) return toast.error("Lütfen zorunlu alanları doldurun.");
    
    const amount = Number(formData.amount);
    const accountId = Number(formData.account_id);

    // 1. İşlemi Kaydet
    const { error: transError } = await supabase.from('financial_transactions').insert({
        type: formData.type,
        category: formData.category,
        amount: amount,
        description: formData.description,
        account_id: accountId,
        date: formData.date
    });

    if (transError) return toast.error("Kayıt hatası: " + transError.message);

    // 2. Hesap Bakiyesini Güncelle (Kritik Nokta!)
    // Gelirse ekle, Giderse çıkar
    const selectedAccount = accounts.find(a => a.id === accountId);
    if (selectedAccount) {
        const newBalance = formData.type === 'Gelir' 
            ? selectedAccount.balance + amount 
            : selectedAccount.balance - amount;
        
        await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', accountId);
    }

    toast.success("İşlem kaydedildi ve bakiye güncellendi!");
    setIsModalOpen(false);
    setFormData({ type: "Gider", category: "", amount: "", description: "", account_id: "", date: new Date().toISOString().split('T')[0] });
    fetchData();
  }

  // --- İŞLEM SİLME (DİKKAT: Bakiyeyi geri almaz, sadece kaydı siler - Basitlik için) ---
  async function handleDelete(id: number) {
      if(!confirm("Bu kaydı silmek istediğine emin misin? (Bakiye otomatik düzelmez, manuel düzeltmen gerekir)")) return;
      await supabase.from('financial_transactions').delete().eq('id', id);
      toast.success("Kayıt silindi.");
      fetchData();
  }

  // Filtreleme
  const filteredList = transactions.filter(t => {
      const matchType = typeFilter === "Tümü" || t.type === typeFilter;
      const matchSearch = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || t.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
  });

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full">
        <header className="px-8 py-6 border-b border-gray-800/50 bg-[#0B1120] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wallet className="text-blue-500"/> Gelir & Gider</h2>
            <p className="text-gray-500 text-sm mt-1">Kasa hareketleri ve masraf yönetimi</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition">
             <Plus size={18}/> Yeni İşlem Ekle
          </button>
        </header>

        <div className="p-8">
           
           {/* ÖZET KARTLAR */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center justify-between">
                 <div><p className="text-gray-400 text-xs font-bold uppercase">TOPLAM GELİR</p><h3 className="text-2xl font-black text-green-400">+₺{stats.income.toLocaleString()}</h3></div>
                 <div className="p-3 bg-green-900/20 rounded-full"><ArrowUpCircle className="text-green-500" size={32}/></div>
              </div>
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center justify-between">
                 <div><p className="text-gray-400 text-xs font-bold uppercase">TOPLAM GİDER</p><h3 className="text-2xl font-black text-red-500">-₺{stats.expense.toLocaleString()}</h3></div>
                 <div className="p-3 bg-red-900/20 rounded-full"><ArrowDownCircle className="text-red-500" size={32}/></div>
              </div>
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center justify-between">
                 <div><p className="text-gray-400 text-xs font-bold uppercase">NET NAKİT AKIŞI</p><h3 className={`text-2xl font-black ${stats.balance >= 0 ? 'text-white' : 'text-orange-500'}`}>₺{stats.balance.toLocaleString()}</h3></div>
                 <div className="p-3 bg-blue-900/20 rounded-full"><Wallet className="text-blue-500" size={32}/></div>
              </div>
           </div>

           {/* FİLTRE VE TABLO */}
           <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex gap-4">
                 <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                    <input type="text" placeholder="Açıklama veya kategori ara..." className="w-full bg-[#0f1623] border border-gray-700 rounded-lg pl-9 py-2 text-sm text-white outline-none focus:border-blue-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
                 <select className="bg-[#0f1623] border border-gray-700 rounded-lg px-3 text-sm text-white outline-none" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option>Tümü</option><option>Gelir</option><option>Gider</option>
                 </select>
                 <button onClick={fetchData} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"><RefreshCw size={18} className={loading?"animate-spin":""}/></button>
              </div>

              <table className="w-full text-left text-sm text-gray-400">
                 <thead className="bg-[#0f1623] text-gray-300 font-bold uppercase text-[10px]">
                    <tr><th className="px-6 py-4">Tarih</th><th>Tür</th><th>Kategori</th><th>Açıklama</th><th>Hesap</th><th className="text-right">Tutar</th><th className="px-6 py-4 text-right">İşlem</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800/50">
                    {filteredList.map((t) => (
                       <tr key={t.id} className="hover:bg-[#1F2937]/50 transition">
                          <td className="px-6 py-4 text-xs">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'Gelir' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {t.type.toUpperCase()}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-white">{t.category}</td>
                          <td className="px-6 py-4 text-xs">{t.description}</td>
                          <td className="px-6 py-4 text-xs font-mono text-blue-400">{t.financial_accounts?.name || "-"}</td>
                          <td className={`px-6 py-4 text-right font-bold ${t.type === 'Gelir' ? 'text-green-400' : 'text-red-400'}`}>
                             {t.type === 'Gelir' ? '+' : '-'}₺{t.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-500"><Trash2 size={16}/></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              {filteredList.length === 0 && <div className="p-10 text-center text-gray-500">Kayıt bulunamadı.</div>}
           </div>
        </div>

        {/* MODAL */}
        {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold text-lg">Yeni İşlem Ekle</h3>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
                 </div>
                 <div className="space-y-4">
                    {/* Tür Seçimi */}
                    <div className="flex bg-[#0f1623] p-1 rounded-lg">
                       {["Gider", "Gelir"].map(type => (
                          <button key={type} onClick={() => setFormData({...formData, type})} className={`flex-1 py-2 text-sm font-bold rounded transition ${formData.type === type ? (type === 'Gelir' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'text-gray-400 hover:text-white'}`}>
                             {type}
                          </button>
                       ))}
                    </div>

                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Tarih</label>
                       <input type="date" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Kategori</label>
                       <select className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                           <option value="">Seçiniz...</option>
                           {formData.type === 'Gider' ? (
                               <>
                                 <option>Hammadde Alışı</option><option>Kira</option><option>Elektrik/Su</option><option>Yemek/Mutfak</option><option>Personel Maaş</option><option>Vergi/SGK</option><option>Kargo Ödemesi</option><option>Diğer</option>
                               </>
                           ) : (
                               <>
                                 <option>Ürün Satışı</option><option>Hizmet Geliri</option><option>Yatırım</option><option>Diğer</option>
                               </>
                           )}
                       </select>
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Tutar (TL)</label>
                       <input type="number" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none font-bold" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Hangi Hesaptan/Kasadan?</label>
                       <select className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                           <option value="">Seçiniz...</option>
                           {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Mevcut: {a.balance} TL)</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Açıklama</label>
                       <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none" placeholder="Örn: A4 Kağıt alımı" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                 </div>
                 <div className="mt-6">
                    <button onClick={handleSave} className={`w-full py-3 rounded-lg text-white font-bold shadow-lg transition ${formData.type === 'Gelir' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                       KAYDET
                    </button>
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}