"use client";

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Phone, Mail, FileText, Trash2, Edit, Save, RefreshCw, X, Wallet, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SuppliersPage() {
  const router = useRouter(); // Sayfa yönlendirmesi için
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal ve Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Düzenleme modunda mıyız?
  const [formData, setFormData] = useState({ id: 0, name: "", contact_person: "", phone: "", email: "", tax_number: "", balance: 0 });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
    if (data) setSuppliers(data);
    setLoading(false);
  }

  // --- İŞLEMLER ---
  
  // Modal Açma (Ekleme veya Düzenleme)
  const openModal = (supplier: any = null) => {
      if (supplier) {
          // Düzenleme Modu: Var olan verileri forma doldur
          setFormData(supplier);
          setIsEditing(true);
      } else {
          // Yeni Ekleme Modu: Formu sıfırla
          setFormData({ id: 0, name: "", contact_person: "", phone: "", email: "", tax_number: "", balance: 0 });
          setIsEditing(false);
      }
      setIsModalOpen(true);
  };

  async function handleSave() {
      if (!formData.name) return toast.error("Firma adı zorunludur.");

      setLoading(true);
      const payload = {
          name: formData.name,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          tax_number: formData.tax_number,
          balance: Number(formData.balance)
      };

      let error;
      if (isEditing) {
          // Güncelleme
          const { error: e } = await supabase.from('suppliers').update(payload).eq('id', formData.id);
          error = e;
      } else {
          // Yeni Ekleme
          const { error: e } = await supabase.from('suppliers').insert(payload);
          error = e;
      }

      setLoading(false);
      if (!error) {
          toast.success(isEditing ? "Tedarikçi güncellendi" : "Tedarikçi eklendi");
          setIsModalOpen(false);
          fetchSuppliers();
      } else {
          toast.error("Hata oluştu: " + error.message);
      }
  }

  async function handleDelete(id: number) {
      if (!confirm("Bu tedarikçiyi ve tüm geçmişini silmek istediğine emin misin?")) return;
      await supabase.from('suppliers').delete().eq('id', id);
      toast.success("Tedarikçi silindi.");
      fetchSuppliers();
  }

  // --- FİLTRELEME ---
  const filteredSuppliers = suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // İstatistikler
  const totalDebt = suppliers.reduce((acc, s) => acc + (s.balance < 0 ? Math.abs(s.balance) : 0), 0);
  const totalSuppliers = suppliers.length;

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full">
        
        {/* BAŞLIK */}
        <header className="px-8 py-6 border-b border-gray-800/50 bg-[#0B1120] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Building2 className="text-green-500"/> Tedarikçi Yönetimi</h2>
            <p className="text-gray-500 text-sm mt-1">Hammadde ve hizmet alınan firmalar</p>
          </div>
          <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition">
             <Plus size={18}/> Yeni Tedarikçi
          </button>
        </header>

        <div className="p-8">
           
           {/* ÖZET KARTLAR */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                 <div className="p-3 bg-blue-500/10 rounded-lg"><Building2 size={24} className="text-blue-500"/></div>
                 <div><p className="text-gray-400 text-xs uppercase font-bold">Kayıtlı Firma</p><h3 className="text-2xl font-bold text-white">{totalSuppliers}</h3></div>
              </div>
              <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                 <div className="p-3 bg-red-500/10 rounded-lg"><Wallet size={24} className="text-red-500"/></div>
                 <div><p className="text-gray-400 text-xs uppercase font-bold">Toplam Borç</p><h3 className="text-2xl font-bold text-red-400">₺{totalDebt.toLocaleString()}</h3></div>
              </div>
           </div>

           {/* LİSTE */}
           <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                 <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                    <input type="text" placeholder="Firma ara..." className="w-full bg-[#0f1623] border border-gray-700 rounded-lg pl-9 py-2 text-sm text-white outline-none focus:border-blue-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
                 <button onClick={fetchSuppliers} className="text-gray-400 hover:text-white"><RefreshCw size={18} className={loading?"animate-spin":""}/></button>
              </div>

              <table className="w-full text-left text-sm text-gray-400">
                 <thead className="bg-[#0f1623] text-gray-300 font-bold uppercase text-[10px]">
                    <tr>
                        <th className="px-6 py-4">Firma Adı</th>
                        <th className="px-6 py-4">Yetkili / İletişim</th>
                        <th className="px-6 py-4">Vergi No</th>
                        <th className="px-6 py-4 text-right">Güncel Bakiye</th>
                        <th className="px-6 py-4 text-right">İşlem</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800/50">
                    {filteredSuppliers.map((s) => (
                       <tr key={s.id} className="hover:bg-[#1F2937]/50 transition group">
                          <td className="px-6 py-4">
                             {/* İSME TIKLAYINCA DETAYA GİT */}
                             <div 
                                onClick={() => router.push(`/muhasebe/tedarikciler/${s.id}`)}
                                className="font-bold text-white cursor-pointer hover:text-blue-400 hover:underline decoration-dotted flex items-center gap-2 w-fit"
                             >
                                {s.name} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                             </div>
                             <div className="text-xs text-gray-500">ID: #{s.id}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                             <div className="text-white font-medium mb-1">{s.contact_person || "-"}</div>
                             <div className="flex items-center gap-2"><Phone size={12}/> {s.phone}</div>
                             <div className="flex items-center gap-2"><Mail size={12}/> {s.email}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{s.tax_number || "-"}</td>
                          <td className="px-6 py-4 text-right">
                             <span className={`font-bold text-base ${s.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                ₺{Number(s.balance).toLocaleString()}
                             </span>
                             <div className="text-[10px] text-gray-500">{s.balance < 0 ? "Borçluyuz" : "Alacaklıyız"}</div>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                             {/* DÜZENLEME BUTONU */}
                             <button onClick={() => openModal(s)} className="p-2 bg-gray-800 hover:bg-blue-600 hover:text-white rounded transition" title="Düzenle">
                                <Edit size={14}/>
                             </button>
                             <button onClick={() => handleDelete(s.id)} className="p-2 bg-gray-800 hover:bg-red-600 hover:text-white rounded transition" title="Sil">
                                <Trash2 size={14}/>
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              {filteredSuppliers.length === 0 && <div className="p-10 text-center text-gray-500">Kayıt bulunamadı.</div>}
           </div>
        </div>

        {/* EKLEME/DÜZENLEME MODALI */}
        {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                 <div className="flex justify-between items-center p-5 border-b border-gray-800">
                    <h3 className="text-white font-bold flex items-center gap-2"><Building2 size={20} className="text-blue-500"/> {isEditing ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                 </div>
                 <div className="p-6 space-y-4">
                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Firma Unvanı</label>
                       <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-xs text-gray-500 block mb-1.5">Yetkili Kişi</label>
                          <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                       </div>
                       <div>
                          <label className="text-xs text-gray-500 block mb-1.5">Telefon</label>
                          <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-xs text-gray-500 block mb-1.5">E-Posta</label>
                          <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                       </div>
                       <div>
                          <label className="text-xs text-gray-500 block mb-1.5">Vergi No / TCKN</label>
                          <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-white text-sm" value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} />
                       </div>
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 block mb-1.5">Başlangıç Bakiyesi (TL)</label>
                       <div className="relative">
                          <input type="number" className={`w-full bg-[#0f1623] border border-gray-700 rounded-lg p-2.5 text-sm font-bold outline-none ${Number(formData.balance) < 0 ? 'text-red-500' : 'text-green-500'}`} value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} />
                          <p className="text-[10px] text-gray-500 mt-1 absolute right-2 top-2.5 pointer-events-none">(- Borç / + Alacak)</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition">İptal</button>
                    <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-2">
                       {loading ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>} Kaydet
                    </button>
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}