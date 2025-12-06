"use client";

import { useState, useEffect } from 'react';
import { Shield, Lock, Link as LinkIcon, Plus, X, Store, CheckCircle, RefreshCw, ShoppingBag, Flower2, Globe, Trash2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { toast } from 'sonner';

export default function IntegrationsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Form verisi (Store Name eklendi)
  const [formData, setFormData] = useState({ 
    storeName: "", 
    supplierId: "", 
    apiKey: "", 
    apiSecret: "" 
  });

  const platforms = [
    { name: 'Trendyol', icon: <Store size={32} className="text-orange-500" />, color: 'border-orange-500/20 bg-orange-500/5', status: 'Aktif' },
    { name: 'Hepsiburada', icon: <ShoppingBag size={32} className="text-orange-600" />, color: 'border-orange-600/20 bg-orange-600/5', status: 'Aktif' },
    { name: 'N11', icon: <div className="font-bold text-red-600 text-xl px-2">n11</div>, color: 'border-red-600/20 bg-red-600/5', status: 'Yakında' },
    { name: 'Çiçeksepeti', icon: <Flower2 size={32} className="text-blue-500" />, color: 'border-blue-500/20 bg-blue-500/5', status: 'Aktif' },
    { name: 'WooCommerce', icon: <Globe size={32} className="text-purple-500" />, color: 'border-purple-500/20 bg-purple-500/5', status: 'Aktif' },
    { name: 'Shopify', icon: <ShoppingBag size={32} className="text-green-500" />, color: 'border-green-500/20 bg-green-500/5', status: 'Yakında' }
  ];

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    // marketplace_connections değil, accounts tablosunu kullanıyoruz
    const { data } = await supabase.from('marketplace_accounts').select('*').order('created_at', { ascending: false });
    if (data) setAccounts(data);
  }

  const openModal = (platformName: string) => {
    setSelectedPlatform(platformName);
    // Her zaman boş form aç (Yeni mağaza eklemek için)
    setFormData({ storeName: "", supplierId: "", apiKey: "", apiSecret: "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if(!formData.storeName || !formData.apiKey) {
        toast.error("Mağaza Adı ve API Key zorunludur.");
        return;
    }

    setLoading(true);
    const newAccount = {
        platform: selectedPlatform,
        store_name: formData.storeName,
        supplier_id: formData.supplierId,
        api_key: formData.apiKey,
        api_secret: formData.apiSecret,
        is_active: true
    };

    const { error } = await supabase.from('marketplace_accounts').insert([newAccount]);

    if (error) {
        toast.error("Hata: " + error.message);
    } else {
        toast.success(`${selectedPlatform} mağazası eklendi.`);
        setIsModalOpen(false);
        fetchAccounts();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Mağaza bağlantısını silmek istiyor musunuz?")) return;
      const { error } = await supabase.from('marketplace_accounts').delete().eq('id', id);
      if(!error) {
          toast.success("Silindi.");
          fetchAccounts();
      }
  };

  return (
    <div className="w-full h-full bg-[#0B1120] p-8 overflow-y-auto">
      {/* BAŞLIK */}
      <header className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-end">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <Shield className="text-blue-500"/> Entegrasyon Merkezi
            </h2>
            <p className="text-gray-400 text-sm mt-2 max-w-2xl">
               Pazaryeri mağazalarınızı buradan bağlayın. Aynı platformdan birden fazla mağaza ekleyebilirsiniz.
            </p>
         </div>
         <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#111827] px-3 py-1.5 rounded-lg border border-gray-800">
             <Lock size={12} className="text-green-500"/>
             <span>Veriler şifreli saklanır.</span>
         </div>
      </header>

      {/* 1. KARTLAR: YENİ MAĞAZA SEÇİMİ */}
      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-500"/> Yeni Mağaza Ekle</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
         {platforms.map((p) => (
            <div key={p.name} className={`bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition group relative overflow-hidden ${p.status === 'Yakında' ? 'opacity-50' : ''}`}>
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl border ${p.color}`}>
                     {p.icon}
                  </div>
                  {p.status === 'Aktif' && (
                     <button onClick={() => openModal(p.name)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg">
                        <Plus size={20} />
                     </button>
                  )}
               </div>
               <h4 className="text-lg font-bold text-white">{p.name}</h4>
            </div>
         ))}
      </div>

      {/* 2. LİSTE: BAĞLI MAĞAZALAR */}
      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-green-500"/> Bağlı Mağazalarım ({accounts.length})</h3>
      <div className="space-y-3">
         {accounts.map((acc) => (
             <div key={acc.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800">
                        {platforms.find(p=>p.name===acc.platform)?.icon || <Store className="text-gray-500"/>}
                     </div>
                     <div>
                         <h4 className="text-white font-bold text-sm">{acc.store_name}</h4>
                         <p className="text-xs text-gray-500">{acc.platform} • {acc.supplier_id}</p>
                     </div>
                 </div>
                 <button onClick={() => handleDelete(acc.id)} className="p-2 text-gray-500 hover:text-red-500 transition"><Trash2 size={18}/></button>
             </div>
         ))}
         {accounts.length === 0 && <p className="text-gray-500 text-sm italic">Henüz mağaza eklenmemiş.</p>}
      </div>

      {/* MODAL */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#111827] border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
               <div className="bg-gray-900/50 p-6 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-white font-bold text-lg">{selectedPlatform} Bağla</h3>
                  <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                      <label className="text-xs text-gray-400 block mb-1.5">Mağaza Takma Adı (Örn: Trendyol-1)</label>
                      <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 block mb-1.5">Satıcı ID (Supplier ID)</label>
                     <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} />
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 block mb-1.5">API Key</label>
                     <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} />
                  </div>
                  {selectedPlatform !== 'Çiçeksepeti' && (
                     <div>
                        <label className="text-xs text-gray-400 block mb-1.5">API Secret</label>
                        <input type="password" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" value={formData.apiSecret} onChange={e => setFormData({...formData, apiSecret: e.target.value})} />
                     </div>
                  )}
               </div>
               <div className="p-5 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/30">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition">İptal</button>
                  <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-2">
                     {loading ? <RefreshCw size={14} className="animate-spin"/> : <LinkIcon size={14}/>} 
                     {loading ? 'Bağlanıyor...' : 'Bağlantıyı Kur'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}