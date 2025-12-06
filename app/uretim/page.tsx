"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Database, Factory, Plus, Trash2, Search, ArrowRight, 
  Package, CheckCircle2, RefreshCw, X, AlertTriangle, Loader2 
} from 'lucide-react';
// Import yolu
import MaterialManager from '../../components/uretim/MaterialManager';
import Link from 'next/link';
import { supabase } from '../supabase';
import { toast } from 'sonner';

export default function ProductionDataCenter() {
  const [activeTab, setActiveTab] = useState("planning");
  
  // DATA STATES
  const [pendingGroups, setPendingGroups] = useState<any[]>([]); 
  const [workOrders, setWorkOrders] = useState<any[]>([]); 
  
  // ÜRÜN ARAMA & SEÇİM STATES
  const [products, setProducts] = useState<any[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const searchLock = useRef(false); // Arama Kilidi (Seçim yapıldığında tekrar aramasın diye)
  
  // UI STATES
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
      search: "",
      marketplace: "Tümü",
      statuses: ["Yeni", "Hazırlanıyor"]
  });

  // Manuel Emir Modalı
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ product_id: 0, quantity: 1, note: "" });
  const [modalSearch, setModalSearch] = useState("");

  useEffect(() => {
      fetchData();
  }, []);

  // Filtreler değişince tetikle
  useEffect(() => {
      if (activeTab === 'planning') fetchPendingOrders();
  }, [filters]); 

  // --- CANLI ÜRÜN ARAMA (AKILLI) ---
  useEffect(() => {
      if (!isModalOpen) return;

      // Eğer kilitliyse (yani kullanıcı listeden seçtiyse) arama yapma ve kilidi aç
      if (searchLock.current) {
          searchLock.current = false;
          return;
      }

      const timer = setTimeout(() => {
          performProductSearch(modalSearch);
      }, 300); 

      return () => clearTimeout(timer);
  }, [modalSearch, isModalOpen]);

  async function performProductSearch(term: string) {
      // Boşsa arama yapma
      if (!term.trim()) {
          setProducts([]);
          return;
      }

      setIsSearchingProducts(true);
      try {
          let query = supabase
              .from('master_products')
              .select('id, name, code, stock')
              .limit(20); // İlk 20 sonucu getir

          query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);

          const { data, error } = await query;
          if (error) throw error;
          setProducts(data || []);
      } catch (error) {
          console.error("Arama hatası:", error);
      } finally {
          setIsSearchingProducts(false);
      }
  }

  async function fetchData() {
      setLoading(true);
      await Promise.all([fetchPendingOrders(), fetchWorkOrders()]);
      setLoading(false);
  }

  // --- 1. SİPARİŞLERİ ÇEK VE GRUPLA ---
  async function fetchPendingOrders() {
      try {
          let query = supabase
              .from('orders')
              .select('*')
              .eq('production_status', 'Bekliyor'); 

          if (filters.statuses.length > 0) query = query.in('status', filters.statuses);
          if (filters.marketplace !== "Tümü") query = query.eq('platform', filters.marketplace);
          
          if (filters.search) {
              query = query.or(`first_product_name.ilike.%${filters.search}%,first_product_code.ilike.%${filters.search}%`);
          }

          const { data, error } = await query.order('order_date', { ascending: true });

          if (data) {
              const grouped = data.reduce((acc: any, order: any) => {
                  const code = order.first_product_code || order.product_code || "KOD_YOK";
                  const name = order.first_product_name || order.product_name || "İsimsiz Ürün";
                  
                  if (!acc[code]) {
                      acc[code] = {
                          product_code: code,
                          product_name: name,
                          total_quantity: 0,
                          order_ids: [],
                          platforms: new Set(),
                          customer_names: []
                      };
                  }
                  
                  const qty = Number(order.product_count || order.total_quantity || 1);
                  acc[code].total_quantity += qty;
                  acc[code].order_ids.push(order.id);
                  acc[code].platforms.add(order.platform || "Diğer");
                  
                  if (acc[code].customer_names.length < 2) { 
                      acc[code].customer_names.push(order.customer_name);
                  }
                  
                  return acc;
              }, {});

              const groupArray = Object.values(grouped).map((g: any) => ({
                  ...g,
                  platforms: Array.from(g.platforms)
              }));

              setPendingGroups(groupArray);
          }
      } catch (e) {
          console.error("Hata:", e);
      }
  }

  // --- 2. İŞ EMİRLERİNİ ÇEK ---
  async function fetchWorkOrders() {
      const { data } = await supabase
          .from('work_orders')
          .select('*, master_products(name, code)')
          .neq('status', 'Tamamlandı')
          .order('created_at', { ascending: false });
      if (data) setWorkOrders(data);
  }

  // --- İŞLEM: GRUBU ÜRETİME GÖNDER ---
  async function createWorkOrderFromPending(group: any) {
      const toastId = toast.loading("İş emri oluşturuluyor...");

      try {
          const { data: product } = await supabase
              .from('master_products')
              .select('id')
              .eq('code', group.product_code)
              .single();

          let targetProductId = product?.id;

          if (!targetProductId) {
              const { data: newProd, error: createError } = await supabase.from('master_products').insert([{
                  name: group.product_name,
                  code: group.product_code,
                  stock: 0
              }]).select().single();
              
              if (createError) throw new Error("Ürün kartı hatası.");
              targetProductId = newProd.id;
          }

          const { error: woError } = await supabase.from('work_orders').insert([{
              product_id: targetProductId,
              quantity: group.total_quantity,
              status: 'Planlandı',
              priority: 'Normal',
              notes: `${group.order_ids.length} sipariş birleştirildi.`,
              due_date: new Date().toISOString()
          }]);

          if (woError) throw woError;

          await supabase
              .from('orders')
              .update({ production_status: 'Üretimde' })
              .in('id', group.order_ids);

          toast.success("Hatta Gönderildi!", { id: toastId });
          fetchData(); 

      } catch (error: any) {
          toast.error(error.message, { id: toastId });
      }
  }

  // --- İŞLEM: MANUEL EMİR ---
  async function createManualOrder() {
      if (!newOrder.product_id || newOrder.quantity < 1) return toast.error("Ürün seçimi yapınız.");

      const { error } = await supabase.from('work_orders').insert([{
          product_id: newOrder.product_id,
          quantity: newOrder.quantity,
          status: 'Planlandı',
          priority: 'Normal',
          notes: newOrder.note || "Manuel",
          due_date: new Date().toISOString()
      }]);

      if (error) toast.error("Hata: " + error.message);
      else {
          toast.success("İş emri oluşturuldu.");
          setIsModalOpen(false);
          setNewOrder({ product_id: 0, quantity: 1, note: "" });
          setModalSearch(""); // Aramayı temizle
          fetchWorkOrders();
      }
  }

  async function cancelWorkOrder(id: number) {
      if(!confirm("İptal edilsin mi?")) return;
      await supabase.from('work_orders').delete().eq('id', id);
      toast.success("Silindi.");
      fetchWorkOrders();
  }

  // ÜRÜN SEÇME FONKSİYONU (DÜZELTİLEN KISIM)
  const handleSelectProduct = (p: any) => {
      setNewOrder({ ...newOrder, product_id: p.id });
      searchLock.current = true; // KİLİTLE: Tekrar arama yapmasın
      setModalSearch(p.name); // İSMİ KUTUYA YAZ
      setProducts([]); // LİSTEYİ KAPAT
  };

  const toggleStatusFilter = (status: string) => {
      setFilters(prev => {
          const exists = prev.statuses.includes(status);
          const newStatuses = exists 
              ? prev.statuses.filter(s => s !== status) 
              : [...prev.statuses, status];
          return { ...prev, statuses: newStatuses };
      });
  };

  return (
    <div className="w-full h-full bg-[#0B1120] p-6 overflow-y-auto">
      <header className="mb-6 flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Database className="text-blue-500" /> Üretim Planlama
            </h1>
            <p className="text-gray-400 text-sm mt-1">Sipariş havuzunu yönet ve iş emirleri oluştur.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={fetchData} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Yenile
            </button>
            <Link href="/uretim/hat" className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition">
                <Factory size={18}/> SAHA EKRANI
            </Link>
        </div>
      </header>

      <div className="flex gap-4 mb-6 border-b border-gray-800 pb-1">
          <button onClick={() => setActiveTab("planning")} className={`px-4 py-2 border-b-2 font-bold text-sm transition ${activeTab === 'planning' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Planlama</button>
          <button onClick={() => setActiveTab("materials")} className={`px-4 py-2 border-b-2 font-bold text-sm transition ${activeTab === 'materials' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Hammadde</button>
      </div>

      {activeTab === "planning" && (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
              {/* SOL: SİPARİŞ HAVUZU */}
              <div className="flex-1 bg-[#111827] border border-gray-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-gray-800 bg-gray-900/80">
                      <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-white flex items-center gap-2">
                              <Package size={18} className="text-purple-500"/> Sipariş Havuzu
                              <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-0.5 rounded-full">{pendingGroups.length} Grup</span>
                          </h3>
                      </div>
                      
                      <div className="space-y-2">
                          <div className="relative">
                              <Search className="absolute left-2.5 top-2 text-gray-500" size={14}/>
                              <input type="text" placeholder="Siparişlerde Ara..." className="w-full bg-[#0B1120] border border-gray-700 rounded-lg pl-8 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                  value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                          </div>
                          <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                              {['Yeni', 'Hazırlanıyor'].map(st => (
                                  <button key={st} onClick={() => toggleStatusFilter(st)} className={`px-2 py-1 rounded text-[10px] border whitespace-nowrap ${filters.statuses.includes(st) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#0B1120] border-gray-700 text-gray-400'}`}>{st}</button>
                              ))}
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {pendingGroups.length === 0 ? (
                          <div className="text-center py-10 text-gray-500"><CheckCircle2 className="mx-auto mb-2 opacity-20" size={32}/><p className="text-xs">Bekleyen sipariş yok.</p></div>
                      ) : (
                          pendingGroups.map((group, idx) => (
                              <div key={idx} className="bg-[#1F2937] p-3 rounded-xl border border-gray-700 hover:border-purple-500/50 transition flex justify-between items-center">
                                  <div className="flex-1 min-w-0 pr-2">
                                      <h4 className="font-bold text-white text-sm truncate" title={group.product_name}>{group.product_name}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-1.5 rounded">{group.product_code}</span>
                                          <span className="text-[10px] bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded font-bold">{group.total_quantity} Adet</span>
                                      </div>
                                  </div>
                                  <button onClick={() => createWorkOrderFromPending(group)} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg shadow-lg flex flex-col items-center gap-1 min-w-[50px]">
                                      <ArrowRight size={16}/> <span className="text-[8px] font-bold">ÜRET</span>
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* SAĞ: ÜRETİM HATTI */}
              <div className="flex-1 bg-[#111827] border border-gray-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <Factory size={18} className="text-green-500"/> İş Emirleri
                          <span className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded-full">{workOrders.length} Aktif</span>
                      </h3>
                      <button onClick={() => setIsModalOpen(true)} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-gray-700">+ Manuel</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                      <table className="w-full text-left text-sm text-gray-400">
                          <thead className="bg-[#1F2937] text-xs uppercase font-bold sticky top-0 z-10">
                              <tr><th className="p-4">Ürün</th><th className="p-4 text-center">Adet</th><th className="p-4">Durum</th><th className="p-4 text-right">Sil</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                              {workOrders.map(order => (
                                  <tr key={order.id} className="hover:bg-gray-800/30 transition">
                                      <td className="p-4">
                                          <div className="font-bold text-white text-xs">{order.master_products?.name || "Bilinmeyen"}</div>
                                          <div className="text-[10px] text-gray-500">{order.master_products?.code}</div>
                                      </td>
                                      <td className="p-4 text-center font-bold text-white">{order.quantity}</td>
                                      <td className="p-4"><span className="px-2 py-1 rounded text-[10px] font-bold bg-gray-700 text-gray-300">{order.status}</span></td>
                                      <td className="p-4 text-right"><button onClick={() => cancelWorkOrder(order.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14}/></button></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === "materials" && <MaterialManager />}

      {/* MODAL: MANUEL EMİR (DÜZELTİLDİ) */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#1F2937] w-full max-w-md rounded-2xl border border-gray-700 p-6 shadow-2xl">
                  <h3 className="text-white font-bold text-lg mb-4">Manuel Emir</h3>
                  
                  <div className="space-y-4">
                      {/* ÜRÜN ARAMA KUTUSU */}
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Ürün Ara (Canlı)</label>
                          <div className="relative">
                              <Search size={16} className="absolute left-3 top-2.5 text-gray-500"/>
                              <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded p-2 pl-9 text-white text-xs outline-none focus:border-blue-500" 
                                  placeholder="Barkod veya Ad Yaz..." 
                                  value={modalSearch} 
                                  onChange={e=>setModalSearch(e.target.value)}
                              />
                              {isSearchingProducts && <Loader2 size={14} className="absolute right-3 top-3 text-blue-500 animate-spin"/>}
                          </div>
                          
                          {/* ARAMA SONUÇLARI LİSTESİ */}
                          {products.length > 0 && (
                              <div className="max-h-40 overflow-y-auto mt-1 border border-gray-700 rounded-lg bg-[#0d131f] custom-scrollbar shadow-lg absolute w-[calc(100%-3rem)] z-20">
                                  {products.map(p => (
                                      <div key={p.id} onClick={() => handleSelectProduct(p)} 
                                          className="p-2.5 text-xs cursor-pointer hover:bg-blue-600 hover:text-white border-b border-gray-800 text-gray-300 transition flex justify-between items-center">
                                          <span className="truncate pr-2 font-medium">{p.name}</span>
                                          <span className="font-mono text-[9px] opacity-70 bg-black/30 px-1 rounded">{p.code}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                          {modalSearch && products.length === 0 && !isSearchingProducts && (
                              <div className="text-xs text-gray-500 mt-1 italic">Sonuç bulunamadı.</div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs text-gray-400">Adet</label><input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white" value={newOrder.quantity} onChange={e=>setNewOrder({...newOrder, quantity: Number(e.target.value)})}/></div>
                          <div><label className="text-xs text-gray-400">Not</label><input type="text" className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white" value={newOrder.note} onChange={e=>setNewOrder({...newOrder, note: e.target.value})}/></div>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                          <button onClick={()=>setIsModalOpen(false)} className="flex-1 bg-gray-700 text-white py-2 rounded text-xs">İptal</button>
                          <button onClick={createManualOrder} className="flex-1 bg-green-600 text-white py-2 rounded text-xs">Oluştur</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}