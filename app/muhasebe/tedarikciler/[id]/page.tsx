"use client";

import { useState, useEffect } from 'react';
import { Building2, Phone, Mail, ArrowLeft, FileText, Wallet, ArrowUpRight, ArrowDownRight, Plus, X, Save, RefreshCw, Eye, Edit, Trash2, Banknote, CreditCard, Landmark, ScrollText, Bitcoin, CheckCircle } from 'lucide-react';
import { supabase } from '../../../supabase'; 
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id; 

  const [supplier, setSupplier] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]); 
  const [accounts, setAccounts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // MODALLAR
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  
  // SEÇİLİ İŞLEM VERİLERİ
  const [selectedItem, setSelectedItem] = useState<any>(null); 
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]); 
  
  // ÖDEME FORMU
  const [payment, setPayment] = useState({ 
      amount: "", 
      date: new Date().toISOString().split('T')[0], 
      account_id: "", 
      method: "Nakit", 
      description: "" 
  });

  // DÜZENLEME FORMU
  const [editForm, setEditForm] = useState({ id: 0, amount: 0, date: "", description: "", type: "" });

  const paymentMethods = [
      { id: "Nakit", icon: <Banknote size={16}/>, label: "Nakit" },
      { id: "Kredi Kartı", icon: <CreditCard size={16}/>, label: "Kredi Kartı" },
      { id: "Havale/EFT", icon: <Landmark size={16}/>, label: "Havale/EFT" },
      { id: "Çek", icon: <ScrollText size={16}/>, label: "Çek" },
      { id: "Senet", icon: <FileText size={16}/>, label: "Senet" },
      { id: "Kripto", icon: <Bitcoin size={16}/>, label: "Kripto" },
  ];

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    
    // 1. Tedarikçi ve Hesaplar
    const { data: sup } = await supabase.from('suppliers').select('*').eq('id', id).single();
    const { data: accs } = await supabase.from('financial_accounts').select('*');
    
    if (sup) setSupplier(sup);
    if (accs) setAccounts(accs);

    // 2. Hareketler (Fatura + Ödeme)
    const { data: invoices } = await supabase.from('purchase_invoices').select('*').eq('supplier_id', id);
    const { data: payments } = await supabase.from('financial_transactions')
        .select('*, financial_accounts(name)')
        .eq('supplier_id', id)
        .eq('type', 'Ödeme'); 

    const combined = [
        ...(invoices || []).map((i: any) => ({ 
            ...i, source: 'invoice', type: 'Fatura', date: i.issue_date, amount: i.total_amount, desc: `Fatura: ${i.invoice_no}`, original_id: i.id 
        })),
        ...(payments || []).map((p: any) => ({ 
            ...p, source: 'payment', type: 'Ödeme', date: p.date, amount: p.amount, desc: p.description, original_id: p.id 
        }))
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

    setMovements(combined);
    setLoading(false);
  }

  // --- ÖDEME YAPMA İŞLEMİ ---
  async function handlePayment() {
      if (!payment.amount) return toast.error("Tutar giriniz");
      if (!payment.account_id && payment.method !== 'Çek' && payment.method !== 'Senet') return toast.error("Kasa/Banka seçiniz");
      
      const amount = Number(payment.amount);
      const accountId = payment.account_id ? Number(payment.account_id) : null;

      const finalDesc = `${payment.method} ile Ödeme - ${payment.description}`;

      // 1. İşlemi Kaydet
      const { error: transError } = await supabase.from('financial_transactions').insert({
          type: 'Ödeme',
          category: `Tedarikçi Ödemesi (${payment.method})`,
          amount: amount,
          description: finalDesc,
          date: payment.date,
          account_id: accountId,
          supplier_id: Number(id) 
      });

      if (transError) return toast.error("Hata: " + transError.message);

      // 2. Kasa Bakiyesini Düş
      if (accountId) {
          const account = accounts.find(a => a.id === accountId);
          if (account) {
              await supabase.from('financial_accounts').update({ balance: account.balance - amount }).eq('id', accountId);
          }
      }

      // 3. Tedarikçi Bakiyesini Güncelle
      const newBalance = (supplier.balance || 0) + amount;
      await supabase.from('suppliers').update({ balance: newBalance }).eq('id', id);

      toast.success("Ödeme başarıyla işlendi!");
      setIsPayModalOpen(false);
      setPayment({ amount: "", date: new Date().toISOString().split('T')[0], account_id: "", method: "Nakit", description: "" });
      fetchData();
  }

  // --- DETAY GÖR ---
  async function openDetail(item: any) {
      setSelectedItem(item);
      if (item.source === 'invoice') {
          const { data: items } = await supabase.from('purchase_invoice_items').select('*, raw_materials(name, unit)').eq('invoice_id', item.original_id);
          setInvoiceItems(items || []);
      }
      setIsDetailModalOpen(true);
  }

  // --- DÜZENLE ---
  function openEdit(item: any) {
      if (item.source === 'invoice') return toast.info("Faturaları düzenlemek için silip tekrar giriniz.");
      setSelectedItem(item);
      setEditForm({ 
          id: item.original_id, amount: item.amount, date: item.date.split('T')[0], description: item.description, type: item.source 
      });
      setIsEditModalOpen(true);
  }

  async function handleUpdate() {
      const oldAmount = selectedItem.amount;
      const newAmount = Number(editForm.amount);
      const diff = newAmount - oldAmount; 

      await supabase.from('financial_transactions').update({
          amount: newAmount, date: editForm.date, description: editForm.description
      }).eq('id', editForm.id);

      await supabase.from('suppliers').update({ balance: supplier.balance + diff }).eq('id', id);
      
      if (selectedItem.account_id) {
          const acc = accounts.find(a => a.id === selectedItem.account_id);
          if(acc) await supabase.from('financial_accounts').update({ balance: acc.balance - diff }).eq('id', acc.id);
      }

      toast.success("Kayıt güncellendi");
      setIsEditModalOpen(false);
      fetchData();
  }

  // --- SİLME ---
  async function handleDelete(item: any) {
      if(!confirm("Bu işlemi silmek istediğine emin misin? Bakiyeler geri alınacak.")) return;

      if (item.source === 'payment') {
          await supabase.from('financial_transactions').delete().eq('id', item.original_id);
          await supabase.from('suppliers').update({ balance: supplier.balance - item.amount }).eq('id', id);
          if (item.account_id) {
              const acc = accounts.find(a => a.id === item.account_id);
              if(acc) await supabase.from('financial_accounts').update({ balance: acc.balance + item.amount }).eq('id', acc.id);
          }
      } 
      else if (item.source === 'invoice') {
          await supabase.from('purchase_invoices').delete().eq('id', item.original_id);
          await supabase.from('suppliers').update({ balance: supplier.balance + item.amount }).eq('id', id);
      }
      toast.success("İşlem geri alındı.");
      fetchData();
  }

  if (loading) return <div className="w-full h-full flex items-center justify-center bg-[#0B1120] text-gray-500"><RefreshCw className="animate-spin mr-2"/> Yükleniyor...</div>;

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full">
        
        {/* HEADER */}
        <header className="px-8 py-6 border-b border-gray-800/50 bg-[#0B1120] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
            <div>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Building2 className="text-blue-500"/> {supplier?.name}</h2>
               <div className="flex gap-4 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><Phone size={12}/> {supplier?.phone || "-"}</span>
                  <span className="flex items-center gap-1"><Mail size={12}/> {supplier?.email || "-"}</span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
              <div className="text-right">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GÜNCEL BAKİYE</p>
                 <p className={`text-3xl font-black ${supplier.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    ₺{supplier.balance.toLocaleString()}
                 </p>
                 <p className="text-[10px] text-gray-500">{supplier.balance < 0 ? "Borçluyuz" : "Alacaklıyız"}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                 <Wallet size={18}/> ÖDEME YAP
              </button>
          </div>
        </header>

        <div className="p-8">
           {/* ÖZET KARTLAR */}
           <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                 <div className="p-3 bg-blue-900/20 rounded-lg text-blue-500"><FileText size={24}/></div>
                 <div><p className="text-gray-400 text-xs font-bold uppercase">Toplam Fatura</p><h3 className="text-2xl font-bold text-white">{movements.filter(m=>m.type==='Fatura').length}</h3></div>
              </div>
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                 <div className="p-3 bg-red-900/20 rounded-lg text-red-500"><ArrowDownRight size={24}/></div>
                 <div><p className="text-gray-400 text-xs font-bold uppercase">Toplam Borç</p><h3 className="text-2xl font-bold text-white">₺{movements.filter(m=>m.type==='Fatura').reduce((a,b)=>a+b.amount,0).toLocaleString()}</h3></div>
              </div>
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                 <div className="p-3 bg-green-900/20 rounded-lg text-green-500"><ArrowUpRight size={24}/></div>
                 <div><p className="text-gray-400 text-xs font-bold uppercase">Toplam Ödenen</p><h3 className="text-2xl font-bold text-white">₺{movements.filter(m=>m.type==='Ödeme').reduce((a,b)=>a+b.amount,0).toLocaleString()}</h3></div>
              </div>
           </div>

           {/* HAREKET TABLOSU */}
           <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-[#161f32] flex justify-between items-center">
                 <h3 className="text-white font-bold flex items-center gap-2"><FileText size={18}/> Hesap Hareketleri (Ekstre)</h3>
                 <button onClick={fetchData} className="text-gray-400 hover:text-white"><RefreshCw size={16}/></button>
              </div>
              <table className="w-full text-left text-sm text-gray-400">
                 <thead className="bg-[#0f1623] text-gray-300 font-bold uppercase text-[10px]">
                    <tr><th className="px-6 py-4">Tarih</th><th>İşlem Türü</th><th>Açıklama</th><th className="text-right">Tutar</th><th className="px-6 py-4 text-right">İşlemler</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800/50">
                    {movements.map((m, i) => (
                       <tr key={i} className="hover:bg-[#1F2937]/50 transition group">
                          <td className="px-6 py-4 text-xs font-mono text-white">{new Date(m.date).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-xs font-bold border ${m.type === 'Fatura' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                {m.type.toUpperCase()}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-white">
                              {m.desc} 
                              <span className="text-gray-500 text-xs ml-2">
                                  {m.financial_accounts ? `(${m.financial_accounts.name})` : ''}
                              </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold text-base ${m.type === 'Fatura' ? 'text-red-400' : 'text-green-400'}`}>
                             {m.type === 'Fatura' ? '-' : '+'}₺{m.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openDetail(m)} className="text-blue-400 hover:text-white" title="Detay"><Eye size={16}/></button>
                             {m.type === 'Ödeme' && <button onClick={() => openEdit(m)} className="text-yellow-500 hover:text-white" title="Düzenle"><Edit size={16}/></button>}
                             <button onClick={() => handleDelete(m)} className="text-red-500 hover:text-white" title="Sil"><Trash2 size={16}/></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              {movements.length === 0 && <div className="p-12 text-center text-gray-500">Hareket yok.</div>}
           </div>
        </div>

        {/* --- ÖDEME MODALI --- */}
        {isPayModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                 <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><Wallet size={20} className="text-green-500"/> Ödeme Girişi</h3>
                    <button onClick={() => setIsPayModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
                 </div>
                 
                 <div className="space-y-4">
                    {/* Ödeme Yöntemi Seçimi */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1.5 font-bold">ÖDEME YÖNTEMİ</label>
                        <div className="grid grid-cols-3 gap-2">
                            {paymentMethods.map(method => (
                                <button 
                                    key={method.id}
                                    onClick={() => setPayment({...payment, method: method.id})}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition ${payment.method === method.id ? 'bg-green-600 text-white border-green-500' : 'bg-[#0f1623] border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    {method.icon}
                                    <span className="mt-1">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5 font-bold">KAYNAK HESAP (KASA/BANKA)</label>
                       <select className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500" value={payment.account_id} onChange={e => setPayment({...payment, account_id: e.target.value})}>
                          <option value="">Hesap Seçiniz...</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Mevcut: {a.balance} TL)</option>)}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs text-gray-500 block mb-1.5 font-bold">TUTAR (TL)</label>
                           <input type="number" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-green-400 font-black text-lg outline-none focus:border-green-500" placeholder="0.00" value={payment.amount} onChange={e => setPayment({...payment, amount: e.target.value})} />
                        </div>
                        <div>
                           <label className="text-xs text-gray-500 block mb-1.5 font-bold">TARİH</label>
                           <input type="date" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500" value={payment.date} onChange={e => setPayment({...payment, date: e.target.value})} />
                        </div>
                    </div>

                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5 font-bold">AÇIKLAMA</label>
                       <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500" placeholder="Örn: Şubat ayı hammadde ödemesi" value={payment.description} onChange={e => setPayment({...payment, description: e.target.value})} />
                    </div>
                 </div>

                 <div className="mt-6 pt-4 border-t border-gray-800">
                    <button onClick={handlePayment} className="w-full bg-green-600 hover:bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95">
                        <CheckCircle size={18}/> ÖDEMEYİ ONAYLA
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* DETAY MODALI */}
        {isDetailModalOpen && selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95">
                    <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X/></button>
                    <h3 className="text-white font-bold text-lg mb-1">{selectedItem.type === 'Fatura' ? 'Fatura Detayı' : 'Ödeme Detayı'}</h3>
                    <p className="text-xs text-gray-500 mb-4">{new Date(selectedItem.date).toLocaleDateString('tr-TR')}</p>
                    
                    {selectedItem.type === 'Fatura' ? (
                        <div className="bg-[#0f1623] rounded-lg border border-gray-800 overflow-hidden">
                            <div className="p-2 bg-gray-800 text-[10px] text-gray-400 font-bold flex justify-between px-4">
                                <span>MALZEME</span>
                                <span>TUTAR</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {invoiceItems.map((item, i) => (
                                    <div key={i} className="flex justify-between p-3 border-b border-gray-800 text-sm hover:bg-gray-800/30">
                                        <div>
                                            <p className="text-white font-medium">{item.raw_materials?.name}</p>
                                            <p className="text-gray-400">{item.quantity} {item.raw_materials?.unit} x ₺{item.unit_price}</p>
                                        </div>
                                        <span className="text-white font-bold">₺{item.total_price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-gray-900 text-right border-t border-gray-800">
                                <span className="text-xs text-gray-400 mr-2">GENEL TOPLAM:</span>
                                <span className="text-lg font-black text-white">₺{selectedItem.amount.toLocaleString()}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#0f1623] p-4 rounded-xl border border-gray-800 text-sm space-y-3">
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-500">Tutar</span>
                                <span className="text-green-400 font-bold text-xl">₺{selectedItem.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ödeme Yöntemi</span>
                                <span className="text-white">{selectedItem.category}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Kaynak Hesap</span>
                                <span className="text-blue-400 font-mono">{selectedItem.financial_accounts?.name}</span>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg text-gray-300 text-xs italic mt-2">
                                "{selectedItem.desc}"
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* DÜZENLEME MODALI */}
        {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-white font-bold text-lg mb-4">Ödemeyi Düzenle</h3>
                    <div className="space-y-4">
                        <input type="number" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white font-bold" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} />
                        <input type="date" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                        <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                        <div className="flex gap-2">
                            <button onClick={handleUpdate} className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-bold">GÜNCELLE</button>
                            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-bold">İPTAL</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}