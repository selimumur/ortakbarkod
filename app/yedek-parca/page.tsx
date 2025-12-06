"use client";

import { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Search, Trash2, CheckCircle, 
  Truck, X, Save, AlertCircle, User, Barcode, 
  MapPin, Phone, Printer, Box, FileText
} from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';

// --- TİP TANIMLAMALARI ---
type SparePartRequest = {
  id: number;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_district: string;
  customer_address: string;
  product_name: string;
  product_code: string;
  part_name: string;
  quantity: number;
  desi: number;
  reason: string;
  responsible_staff: string;
  detailed_description: string;
  status: 'Yeni' | 'Hazırlanıyor' | 'Kargolandı' | 'İptal';
  created_at: string;
};

type OrderItem = {
  name: string;
  product_code?: string;
  quantity: number;
};

// --- ANA COMPONENT ---
export default function SparePartsPage() {
  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // MODAL DURUMLARI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedLabelData, setSelectedLabelData] = useState<SparePartRequest | null>(null);

  // ARAMA VE SEÇİM STATE'LERİ
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [foundOrderItems, setFoundOrderItems] = useState<OrderItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // FORM VERİSİ
  const initialFormState = {
    order_id: "",
    customer_name: "",
    customer_phone: "",
    customer_city: "",
    customer_district: "",
    customer_address: "",
    product_name: "",
    product_code: "",
    part_name: "",
    quantity: 1,
    desi: 1,
    reason: "Kargo Hasarı",
    responsible_staff: "",
    detailed_description: ""
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- BAŞLANGIÇTA VERİLERİ ÇEK ---
  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from('spare_parts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Veri çekme hatası:", error);
    if (data) setRequests(data);
    setLoading(false);
  }

  // --- SİPARİŞ ARAMA FONKSİYONU ---
  async function handleOrderLookup() {
    if (!formData.order_id) {
        toast.error("Lütfen bir sipariş numarası girin.");
        return;
    }

    setIsSearchingOrder(true);
    setFoundOrderItems([]);
    setSelectedItemIndex(null);

    const searchId = formData.order_id.trim();
    
    // Veritabanı sorgusu
    let query = supabase.from('orders').select('*');
    if (!isNaN(Number(searchId))) {
        query = query.eq('id', searchId); // Sayı ise ID'de ara
    } else {
        query = query.eq('order_number', searchId); // Metin ise Sipariş No'da ara
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
        toast.error("Sipariş bulunamadı! ID veya Numarayı kontrol edin.");
        setIsSearchingOrder(false);
        return;
    }

    // Formu Müşteri Bilgileriyle Doldur
    setFormData(prev => ({
        ...prev,
        customer_name: order.customer_name || order.customer || "",
        customer_phone: order.phone || order.customer_phone || "",
        customer_city: order.city || order.shipping_city || "",
        customer_address: order.address || order.shipping_address || ""
    }));

    // Sipariş Kalemlerini (Items) Parse Et
    let items: OrderItem[] = [];
    if (order.items) {
        let rawItems = order.items;
        if (typeof rawItems === 'string') {
            try { rawItems = JSON.parse(rawItems); } catch(e) {}
        }
        
        if (Array.isArray(rawItems)) {
            items = rawItems.map((i: any) => ({
                name: i.name || i.product_name || "Belirsiz Ürün",
                product_code: i.product_code || i.code || "-",
                quantity: i.quantity || 1
            }));
        } else if (typeof rawItems === 'object') {
            items.push({
                name: rawItems.name || "Belirsiz Ürün",
                product_code: rawItems.product_code || "-",
                quantity: rawItems.quantity || 1
            });
        }
    }

    if (items.length > 0) {
        setFoundOrderItems(items);
        toast.success("Sipariş bulundu, lütfen aşağıdan ürünü seçin.");
    } else {
        toast.warning("Sipariş bulundu ancak ürün detayları boş.");
    }
    
    setIsSearchingOrder(false);
  }

  // --- ÜRÜN SEÇME ---
  function selectProduct(item: OrderItem, index: number) {
      setSelectedItemIndex(index);
      setFormData(prev => ({
          ...prev,
          product_name: item.name,
          product_code: item.product_code || "-"
      }));
  }

  // --- KAYDETME ---
  async function handleSave() {
    if (!formData.customer_name || !formData.product_name || !formData.part_name) {
      toast.error("Müşteri, Ürün ve Parça alanları zorunludur.");
      return;
    }

    const { error } = await supabase.from('spare_parts').insert([
      { ...formData, status: 'Yeni' }
    ]);

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      toast.success("Talep başarıyla oluşturuldu!");
      setIsModalOpen(false);
      setFormData(initialFormState); // Formu temizle
      setFoundOrderItems([]);
      setSelectedItemIndex(null);
      fetchRequests();
    }
  }

  // --- DURUM GÜNCELLEME ---
  async function updateStatus(id: number, currentStatus: string) {
    let nextStatus = 'Yeni';
    if (currentStatus === 'Yeni') nextStatus = 'Hazırlanıyor';
    else if (currentStatus === 'Hazırlanıyor') nextStatus = 'Kargolandı';
    else return;

    await supabase.from('spare_parts').update({ status: nextStatus }).eq('id', id);
    fetchRequests();
    toast.success(`Durum güncellendi: ${nextStatus}`);
  }

  // --- SİLME ---
  async function handleDelete(id: number) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    await supabase.from('spare_parts').delete().eq('id', id);
    fetchRequests();
    toast.success("Kayıt silindi.");
  }

  // --- ETİKET AÇMA ---
  function openLabelModal(request: SparePartRequest) {
      setSelectedLabelData(request);
      setIsLabelModalOpen(true);
  }

  // --- FİLTRELEME ---
  const filteredRequests = requests.filter(r => 
    (r.customer_name && r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.order_id && r.order_id.includes(searchTerm))
  );

  return (
    <div className="p-8 bg-[#0B1120] min-h-screen text-gray-200">
      
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wrench className="text-orange-500" /> Yedek Parça & Kargo Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Siparişlerden gelen hasar taleplerini yönet ve kargo etiketi bas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition shadow-lg shadow-orange-900/20"
        >
          <Plus size={20} /> Yeni Talep Aç
        </button>
      </div>

      {/* ARAMA ÇUBUĞU */}
      <div className="mb-6 bg-[#111827] p-4 rounded-xl border border-gray-800 flex items-center gap-3">
        <Search className="text-gray-500" />
        <input 
          type="text" 
          placeholder="Listede ara: Sipariş No veya Müşteri Adı..." 
          className="bg-transparent border-none outline-none text-white w-full placeholder-gray-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLO */}
      <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#1F2937] text-gray-200 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Sipariş / Müşteri</th>
                <th className="px-6 py-4">Ürün & Parça</th>
                <th className="px-6 py-4">Kargo Bilgisi</th>
                <th className="px-6 py-4 text-center">Desi</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredRequests.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/50 transition">
                  {/* SİPARİŞ & MÜŞTERİ */}
                  <td className="px-6 py-4">
                      <div className="text-orange-400 font-mono text-xs mb-1 bg-orange-900/10 px-2 py-0.5 rounded w-fit">#{item.order_id}</div>
                      <div className="text-white font-medium">{item.customer_name}</div>
                  </td>
                  {/* ÜRÜN & PARÇA */}
                  <td className="px-6 py-4">
                    <div className="text-gray-300 text-xs mb-1">{item.product_name}</div>
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-white bg-gray-700 px-2 rounded text-xs">{item.quantity}x</span>
                       <span className="text-white font-bold">{item.part_name}</span>
                    </div>
                  </td>
                  {/* KARGO */}
                  <td className="px-6 py-4 text-xs">
                     <div className="flex items-center gap-1 mb-1 text-gray-300"><Phone size={12}/> {item.customer_phone || "-"}</div>
                     <div className="flex items-center gap-1 text-gray-400"><MapPin size={12}/> {item.customer_city || "?"}</div>
                  </td>
                  {/* DESİ */}
                  <td className="px-6 py-4 text-center">
                     <span className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-white font-mono text-xs">
                        {item.desi}
                     </span>
                  </td>
                  {/* DURUM BUTONU */}
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => updateStatus(item.id, item.status)}
                      className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold border 
                        ${item.status === 'Yeni' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          item.status === 'Hazırlanıyor' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                          'bg-green-500/10 text-green-400 border-green-500/20'}`}
                    >
                      {item.status}
                    </button>
                  </td>
                  {/* İŞLEMLER */}
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openLabelModal(item)}
                      className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition"
                      title="Kargo Etiketi Yazdır"
                    >
                      <Printer size={16}/>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition">
                        <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                 <tr><td colSpan={6} className="text-center py-10 text-gray-500">Henüz kayıt yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- YENİ TALEP MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] my-4">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#161f32] rounded-t-2xl">
               <h3 className="text-white font-bold text-lg flex items-center gap-2"><Plus className="text-orange-500"/> Yeni Parça Talebi</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* SOL KOLON: SİPARİŞ & ÜRÜN */}
              <div className="space-y-6">
                 {/* Sipariş Sorgu */}
                 <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20">
                    <label className="text-xs text-blue-400 font-bold block mb-2 uppercase tracking-wider">Adım 1: Siparişi Getir</label>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 bg-[#111827] border border-gray-600 rounded-lg p-3 text-white outline-none font-mono"
                          value={formData.order_id}
                          onChange={e => setFormData({...formData, order_id: e.target.value})}
                          placeholder="Sipariş No / ID"
                          onKeyDown={(e) => e.key === 'Enter' && handleOrderLookup()}
                        />
                        <button onClick={handleOrderLookup} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-bold">
                           {isSearchingOrder ? "..." : "Bul"}
                        </button>
                    </div>
                 </div>

                 {/* Ürün Listesi */}
                 {foundOrderItems.length > 0 && (
                    <div className="space-y-2">
                       <label className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Adım 2: Ürünü Seç</label>
                       <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {foundOrderItems.map((item, idx) => (
                             <div 
                               key={idx} onClick={() => selectProduct(item, idx)}
                               className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition
                                  ${selectedItemIndex === idx 
                                    ? 'bg-orange-500/20 border-orange-500 text-white' 
                                    : 'bg-[#111827] border-gray-700 hover:border-gray-500 text-gray-400'}`}
                             >
                                <div>
                                    <div className="font-bold text-sm">{item.name}</div>
                                    <div className="text-xs opacity-60 mt-1">{item.product_code} (x{item.quantity})</div>
                                </div>
                                {selectedItemIndex === idx && <CheckCircle size={18} className="text-orange-500"/>}
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              {/* SAĞ KOLON: PARÇA & KARGO DETAYLARI */}
              <div className="space-y-4">
                 
                 {/* Parça Detayları */}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">Lazım Olan Parça</label>
                        <input type="text" className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none" 
                          value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})} placeholder="Örn: Ayak"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">Adet</label>
                        <input type="number" min="1" className="w-full bg-[#111827] border border-gray-700 rounded-lg p-3 text-white text-center font-bold focus:border-orange-500 outline-none" 
                          value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}/>
                    </div>
                 </div>

                 {/* Kargo Detayları */}
                 <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                    <label className="text-xs text-orange-400 font-bold block mb-3 flex items-center gap-1 uppercase tracking-wider">
                        <Truck size={14}/> Kargo & İletişim
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Müşteri Adı</label>
                            <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-sm" 
                              value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Telefon</label>
                            <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-sm" 
                              value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} placeholder="0555..."/>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                         <div className="col-span-1">
                            <label className="text-[10px] text-gray-500 block mb-1">Şehir</label>
                            <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-sm" 
                              value={formData.customer_city} onChange={e => setFormData({...formData, customer_city: e.target.value})}/>
                         </div>
                         <div className="col-span-1">
                            <label className="text-[10px] text-gray-500 block mb-1">İlçe</label>
                            <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-sm" 
                              value={formData.customer_district} onChange={e => setFormData({...formData, customer_district: e.target.value})}/>
                         </div>
                         <div className="col-span-1">
                            <label className="text-[10px] text-gray-500 block mb-1 font-bold text-orange-400">Desi</label>
                            <input type="number" min="1" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-center font-bold" 
                              value={formData.desi} onChange={e => setFormData({...formData, desi: Number(e.target.value)})}/>
                         </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Açık Adres</label>
                        <textarea className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-sm h-16 resize-none"
                           value={formData.customer_address} onChange={e => setFormData({...formData, customer_address: e.target.value})}></textarea>
                    </div>
                 </div>
                 
                 {/* Kaydet Butonu */}
                 <button 
                   onClick={handleSave} 
                   className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-900/30 transition mt-2 flex justify-center items-center gap-2"
                 >
                   <Save size={18}/> Kaydı Oluştur
                 </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ETİKET YAZDIRMA MODALI --- */}
      {isLabelModalOpen && selectedLabelData && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white text-black rounded-lg w-full max-w-md p-6 relative">
                 <button onClick={() => setIsLabelModalOpen(false)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500"><X size={24}/></button>
                 
                 {/* ETİKET TASARIMI */}
                 <div id="print-area" className="border-2 border-black p-4 font-sans">
                     <div className="border-b-2 border-black pb-2 mb-2 flex justify-between items-center">
                        <h2 className="text-xl font-bold">YEDEK PARÇA</h2>
                        <span className="text-xs font-bold border border-black px-2 py-1">Desi: {selectedLabelData.desi}</span>
                     </div>
                     
                     <div className="mb-4">
                        <p className="text-xs text-gray-600 uppercase">Alıcı:</p>
                        <p className="font-bold text-lg">{selectedLabelData.customer_name}</p>
                        <p className="text-sm">{selectedLabelData.customer_phone}</p>
                        <p className="text-sm mt-1">{selectedLabelData.customer_address}</p>
                        <p className="font-bold mt-1">{selectedLabelData.customer_district} / {selectedLabelData.customer_city}</p>
                     </div>

                     <div className="border-t-2 border-dashed border-gray-400 pt-2 mb-4">
                        <p className="text-xs text-gray-600 uppercase">İçerik:</p>
                        <p className="font-bold">{selectedLabelData.quantity} x {selectedLabelData.part_name}</p>
                        <p className="text-xs text-gray-500">{selectedLabelData.product_name}</p>
                     </div>

                     <div className="flex justify-center my-4">
                        {/* Temsili Barkod */}
                        <div className="text-center">
                            <div className="h-12 bg-black w-48 mx-auto mb-1"></div>
                            <p className="text-xs font-mono">{selectedLabelData.order_id}-SP-{selectedLabelData.id}</p>
                        </div>
                     </div>

                     <div className="text-[10px] text-center text-gray-500 mt-2">
                        OrtakBarkod Gönderi Sistemi
                     </div>
                 </div>

                 <button 
                   onClick={() => window.print()} 
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded mt-4 flex justify-center items-center gap-2 print:hidden"
                 >
                   <Printer size={20}/> Yazdır
                 </button>
             </div>
         </div>
      )}

    </div>
  );
}