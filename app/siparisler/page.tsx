"use client";

import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Barcode, RefreshCw, Search, X, MapPin, Store, ChevronDown, Loader2, Flower2, ShoppingBag, Filter, ExternalLink, Calendar, User, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import Link from 'next/link';

// Platform Renk ve İkon Tanımları
const PLATFORM_CONFIG: any = {
  'Trendyol': { color: 'bg-orange-500', text: 'text-orange-500', icon: <Store size={12}/> },
  'Hepsiburada': { color: 'bg-orange-700', text: 'text-orange-700', icon: <Store size={12}/> },
  'N11': { color: 'bg-red-600', text: 'text-red-600', icon: <Store size={12}/> },
  'WooCommerce': { color: 'bg-purple-600', text: 'text-purple-600', icon: <Store size={12}/> },
  'Çiçeksepeti': { color: 'bg-blue-500', text: 'text-blue-500', icon: <Flower2 size={12}/> },
  'Shopify': { color: 'bg-green-500', text: 'text-green-500', icon: <ShoppingBag size={12}/> }
};

export default function OrderManagement() {
  // --- STATE YÖNETİMİ ---
  const [orders, setOrders] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]); // Kayıtlı Mağazalar
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // UI Kontrolleri
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);

  // Filtreler
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Tümü"); 
  const [selectedStoreId, setSelectedStoreId] = useState("Tümü"); // Mağaza Filtresi

  const tabs = ["Tümü", "Yeni", "Hazırlanıyor", "Kargoda", "Teslim Edildi", "İptal/İade"];

  // --- VERİ ÇEKME (BAŞLANGIÇ) ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    // 1. Önce Mağazaları (Accounts) Çek
    const { data: accData } = await supabase.from('marketplace_accounts').select('*').order('created_at');
    if (accData) setAccounts(accData);

    // 2. Sonra Siparişleri Çek
    fetchOrdersFromDb();
  }

  async function fetchOrdersFromDb() {
    const { data } = await supabase.from('orders').select('*').order('order_date', { ascending: false });
    if (data) setOrders(data);
  }

  // --- SENKRONİZASYON: TÜM MAĞAZALAR ---
  async function syncAllMarketplaces() {
    setLoading(true);
    setIsSyncMenuOpen(false);

    if (accounts.length === 0) {
        toast.error("Hiç mağaza bağlı değil. Ayarlar sayfasından ekleyiniz.");
        setLoading(false);
        return;
    }

    const loadingToast = toast.loading(`${accounts.length} mağaza taranıyor...`);
    let totalNew = 0;
    let errorCount = 0;
    
    // Her kayıtlı mağaza için döngü
    for (const acc of accounts) {
        try {
            // API'ye account_id ile istek atıyoruz
            const res = await fetch(`/api/${acc.platform.toLowerCase()}?account_id=${acc.id}`).then(r => r.json());
            
            if (res.success && res.orders && res.orders.length > 0) {
                // Gelen siparişlere store_id eklenmiş durumda, DB'ye yazıyoruz
                const { error } = await supabase.from('orders').upsert(res.orders);
                if (!error) {
                    totalNew += res.orders.length;
                } else {
                    console.error(`${acc.store_name} DB Hatası:`, error);
                }
            }
        } catch (e) {
            console.error(`${acc.store_name} API Hatası:`, e);
            errorCount++;
        }
    }

    toast.dismiss(loadingToast);
    fetchOrdersFromDb(); // Listeyi yenile
    
    if (totalNew > 0) {
        toast.success(`Toplam ${totalNew} adet sipariş güncellendi!`);
    } else if (errorCount === accounts.length) {
        toast.error("Hiçbir mağazadan veri çekilemedi. API ayarlarını kontrol edin.");
    } else {
        toast.info("Yeni sipariş bulunamadı.");
    }
    
    setLoading(false);
  }

  // --- SENKRONİZASYON: TEK MAĞAZA ---
  async function syncSingleStore(acc: any) {
    setLoading(true);
    setIsSyncMenuOpen(false);
    const loadingToast = toast.loading(`${acc.store_name} kontrol ediliyor...`);

    try {
        const res = await fetch(`/api/${acc.platform.toLowerCase()}?account_id=${acc.id}`).then(r => r.json());

        if (res.success && res.orders) {
            const { error } = await supabase.from('orders').upsert(res.orders);
            
            if (error) throw error;

            toast.success(`${acc.store_name}: Güncellendi (${res.orders.length} Sipariş)`);
            fetchOrdersFromDb();
        } else {
            toast.warning(`${acc.store_name}: ${res.error || "Veri yok"}`);
        }
    } catch (e: any) {
        toast.error(`${acc.store_name} Hatası: ${e.message}`);
    } finally {
        toast.dismiss(loadingToast);
        setLoading(false);
    }
  }

  // --- FİLTRELEME MANTIĞI ---
  const filteredOrders = orders.filter(order => {
    // 1. Mağaza Filtresi
    if (selectedStoreId !== "Tümü") {
        // Eğer siparişte store_id varsa ona bak
        if (order.store_id) {
            if (order.store_id !== selectedStoreId) return false;
        } 
        // Eski siparişlerde store_id olmayabilir, platformdan tahmin etmeye çalış (Yedek)
        else {
            const acc = accounts.find(a => a.id === selectedStoreId);
            if (acc && order.platform !== acc.platform) return false;
        }
    }

    // 2. Statü Filtresi
    if (activeTab !== "Tümü") {
       if (activeTab === "İptal/İade") {
           // İptal ve İade durumlarını kapsayan geniş filtre
           if (!["İptal", "İade", "Cancelled", "Returned", "UnDelivered", "Rejected", "UnSupplied"].includes(order.status)) return false;
       } else {
           if (order.status !== activeTab) return false;
       }
    }

    // 3. Arama Filtresi (Sipariş No, Müşteri, Ürün, SKU)
    const sNo = searchTerm.toLowerCase();
    const searchMatch = 
        String(order.id).toLowerCase().includes(sNo) || 
        String(order.packet_id || "").toLowerCase().includes(sNo) ||
        String(order.order_number || "").toLowerCase().includes(sNo) ||
        (order.customer_name || "").toLowerCase().includes(sNo) ||
        (order.first_product_name || "").toLowerCase().includes(sNo) ||
        (order.first_product_code || "").toLowerCase().includes(sNo);

    return searchMatch;
  });

  // --- YARDIMCI FONKSİYONLAR ---
  const getStatusColor = (s: string) => {
    if (["Yeni", "Created"].includes(s)) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (["Hazırlanıyor", "Picking", "Invoiced", "Repackaged"].includes(s)) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (["Kargoda", "Shipped"].includes(s)) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (["Teslim Edildi", "Delivered"].includes(s)) return 'bg-green-500/20 text-green-400 border-green-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getPlatformBadge = (platformName: string, storeId?: string) => {
      const config = PLATFORM_CONFIG[platformName] || { color: 'bg-gray-700', text: 'text-gray-300', icon: <Store size={10}/> };
      // Mağaza ismini bul
      const storeName = accounts.find(a => a.id === storeId)?.store_name;

      return (
        <div className="flex flex-col items-start">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit ${config.color} text-white`}>
                {config.icon} {platformName}
            </span>
            {storeName && <span className="text-[9px] text-gray-400 mt-0.5 ml-1 truncate max-w-[100px]">{storeName}</span>}
        </div>
      );
  };

  const formatDate = (dateString: string) => {
      if (!dateString) return "-";
      try {
          return new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch (e) { return dateString; }
  };

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full relative">
        {/* --- HEADER --- */}
        <header className="px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/50 bg-[#0B1120]">
          <div>
            <h2 className="text-2xl font-bold text-white">Sipariş Yönetimi</h2>
            
            {/* DİNAMİK MAĞAZA SEÇİCİ */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 max-w-[800px] scrollbar-hide">
                <button 
                    onClick={() => setSelectedStoreId("Tümü")} 
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex-shrink-0 border ${selectedStoreId === 'Tümü' ? 'bg-white text-black border-white' : 'bg-[#111827] text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                    Tüm Mağazalar
                </button>
                
                {accounts.map(acc => {
                    const config = PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG['Trendyol'];
                    const isActive = selectedStoreId === acc.id;
                    return (
                        <button key={acc.id} onClick={() => setSelectedStoreId(acc.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex-shrink-0 flex items-center gap-2 border ${isActive ? `${config.color} text-white border-transparent` : 'bg-[#111827] text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                            {config.icon} {acc.store_name}
                        </button>
                    );
                })}
            </div>
          </div>
          
          {/* AKSİYON BUTONLARI */}
          <div className="relative flex gap-2">
              <div className="flex items-center shadow-lg rounded-lg overflow-hidden border border-blue-700">
                  <button onClick={syncAllMarketplaces} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
                      {loading ? "İşleniyor..." : "Tümünü Çek"}
                  </button>
                  <div className="w-[1px] h-full bg-blue-700"></div>
                  <button onClick={() => setIsSyncMenuOpen(!isSyncMenuOpen)} className="px-2 py-2 bg-blue-600 hover:bg-blue-500 text-white transition">
                      <ChevronDown size={16} />
                  </button>
              </div>
              
              {/* Dropdown Menu (Tekil Güncelleme) */}
              {isSyncMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#111827] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                      <div className="p-2 space-y-1">
                          <p className="text-gray-500 text-[10px] uppercase font-bold px-2 pt-1 mb-1 border-b border-gray-800 pb-1">Mağaza Bazlı Yenile</p>
                          {accounts.length > 0 ? accounts.map(acc => {
                             const config = PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG['Trendyol'];
                             return (
                                <button key={acc.id} onClick={() => syncSingleStore(acc)} className="w-full text-left px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg flex items-center gap-2 transition">
                                    <span className={`w-2 h-2 rounded-full ${config.text.replace('text', 'bg')}`}></span> 
                                    <span className="font-medium truncate">{acc.store_name}</span>
                                </button>
                             );
                          }) : (
                             <div className="text-xs text-gray-500 px-3 py-2 text-center">Mağaza bulunamadı.</div>
                          )}
                      </div>
                  </div>
              )}
          </div>
        </header>

        <div className="p-8">
          {/* --- FİLTRE VE ARAMA ALANI --- */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 mb-6">
             <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-800 pb-4">
                {tabs.map(tab => (
                   <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-[#0f1623] border border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {tab}
                   </button>
                ))}
             </div>
             <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input 
                    type="text" 
                    placeholder="Sipariş No, Müşteri Adı, Ürün veya Barkod Ara..." 
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-lg pl-9 py-2.5 text-sm focus:border-blue-500 outline-none text-white transition focus:bg-[#0f1623]" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          {/* --- SİPARİŞ LİSTESİ TABLOSU --- */}
          <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#0f1623] text-gray-300 uppercase text-[10px] font-bold tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Sipariş No</th>
                    <th className="px-6 py-4">Pazaryeri</th>
                    <th className="px-6 py-4">Ürün (Özet)</th>
                    <th className="px-6 py-4">Müşteri</th>
                    <th className="px-6 py-4 text-center">Adet</th>
                    <th className="px-6 py-4">Tutar</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                   {filteredOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-[#1F2937]/40 transition duration-150 group">
                      <td className="px-6 py-4">
                          <div className="flex flex-col">
                              <span className="text-xs font-mono text-white">#{order.order_number || order.id}</span>
                              <span className="text-[10px] text-gray-600 mt-0.5">{formatDate(order.order_date)}</span>
                          </div>
                      </td>
                      <td className="px-6 py-4">{getPlatformBadge(order.platform || "Trendyol", order.store_id)}</td>
                      <td className="px-6 py-4">
                         <div className="max-w-[200px]">
                            <div className="text-white text-xs font-medium truncate" title={order.first_product_name}>{order.first_product_name || order.product_name}</div>
                            <div className="text-[10px] text-blue-400 font-mono mt-1 bg-blue-900/20 px-1 rounded w-fit">{order.first_product_code || order.product_code || "-"}</div>
                         </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-300">{order.customer_name}</td>
                      <td className="px-6 py-4 text-center"><span className="bg-gray-800 px-2 py-1 rounded text-white font-bold text-xs">{order.product_count || order.total_quantity || 1}</span></td>
                      <td className="px-6 py-4 text-white font-medium">₺{(order.total_price || order.price || 0).toLocaleString('tr-TR')}</td>
                      <td className="px-6 py-4">
                         <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(order.status)}`}>{order.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={() => { setSelectedOrder(order); setIsPanelOpen(true); }} className="text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-xs font-bold transition shadow-lg shadow-blue-900/20">DETAY</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* BOŞ DURUM */}
              {filteredOrders.length === 0 && (
                  <div className="text-center py-24 text-gray-500 flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-800/50 rounded-full">
                          <Filter size={32} className="opacity-40"/>
                      </div>
                      <div className="space-y-1">
                          <p className="font-medium text-gray-400">Görüntülenecek sipariş bulunamadı.</p>
                          <p className="text-xs">Filtreleri değiştirmeyi veya "Tümünü Çek" butonunu kullanmayı deneyin.</p>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- SİPARİŞ DETAY PANELİ (MODAL) --- */}
      {isPanelOpen && selectedOrder && (
        <div className="absolute inset-0 z-50 flex justify-end">
           {/* Arkaplan Karartma */}
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsPanelOpen(false)}></div>
           
           {/* Yan Panel */}
           <div className="relative w-full max-w-2xl bg-[#111827] border-l border-gray-700 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
              
              {/* Panel Başlığı */}
              <div className="sticky top-0 bg-[#111827]/95 backdrop-blur border-b border-gray-700 p-6 flex justify-between items-center z-10">
                 <div>
                     <h2 className="text-xl font-bold text-white">Sipariş Detayı</h2>
                     <div className="flex items-center gap-3 mt-1">
                         <span className="text-sm text-gray-500 font-mono">#{selectedOrder.order_number || selectedOrder.id}</span>
                         {getPlatformBadge(selectedOrder.platform || "Trendyol", selectedOrder.store_id)}
                     </div>
                 </div>
                 <button onClick={() => setIsPanelOpen(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white transition"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Özet Kartları */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col justify-between">
                       <p className="text-xs text-gray-400 uppercase font-bold">Sipariş Durumu</p>
                       <div className="mt-2 flex items-center gap-2">
                           <span className={`w-3 h-3 rounded-full ${selectedOrder.status === 'İptal' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                           <p className="text-lg font-bold text-white">{selectedOrder.status}</p>
                       </div>
                       <p className="text-[10px] text-gray-500 mt-1">{formatDate(selectedOrder.order_date)}</p>
                    </div>
                    <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 text-right flex flex-col justify-between">
                       <p className="text-xs text-gray-400 uppercase font-bold">Toplam Tutar</p>
                       <p className="text-3xl font-bold text-green-400">₺{(selectedOrder.total_price || selectedOrder.price || 0).toLocaleString('tr-TR')}</p>
                       <p className="text-[10px] text-gray-500">KDV Dahil</p>
                    </div>
                 </div>

                 {/* Teslimat Bilgileri */}
                 <div className="bg-[#1F2937] p-5 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-400"/> Teslimat & Kargo</h3>
                    <div className="space-y-3 text-sm">
                       <div className="flex justify-between border-b border-gray-700 pb-2">
                           <span className="text-gray-500">Alıcı Adı:</span>
                           <span className="text-white font-medium">{selectedOrder.customer_name}</span>
                       </div>
                       <div className="flex justify-between border-b border-gray-700 pb-2">
                           <span className="text-gray-500">Kargo Firması:</span>
                           <span className="text-white">{selectedOrder.cargo_provider_name || "-"}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                           <span className="text-gray-500">Takip Numarası:</span>
                           {selectedOrder.cargo_tracking_number ? (
                               <div className="flex items-center gap-2">
                                   <span className="text-orange-400 font-mono bg-orange-400/10 px-2 py-0.5 rounded">{selectedOrder.cargo_tracking_number}</span>
                                   {selectedOrder.cargo_tracking_link && (
                                       <a href={selectedOrder.cargo_tracking_link} target="_blank" className="text-blue-500 hover:text-white"><ExternalLink size={14}/></a>
                                   )}
                               </div>
                           ) : <span className="text-gray-500 italic">Bekleniyor</span>}
                       </div>
                       <div className="pt-1">
                           <span className="text-gray-500 block text-xs mb-1">Teslimat Adresi:</span>
                           <p className="text-gray-300 text-xs bg-gray-900/50 p-3 rounded border border-gray-700 leading-relaxed">
                               {selectedOrder.raw_data?.shipmentAddress?.fullAddress || selectedOrder.delivery_address || "Adres bilgisi alınamadı"}
                           </p>
                       </div>
                    </div>
                 </div>

                 {/* Ürün Listesi */}
                 <div className="bg-[#1F2937] p-5 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2"><ShoppingCart size={16} className="text-purple-400"/> Sipariş İçeriği</h3>
                    <div className="space-y-3">
                       {(selectedOrder.raw_data?.lines || selectedOrder.raw_data?.items || selectedOrder.raw_data?.line_items || []).map((line: any, i: number) => (
                          <div key={i} className="flex gap-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition">
                             {/* Ürün Görseli */}
                             <div className="w-12 h-12 bg-white rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                 {line.productImage || line.imageUrl || line.image?.src ? (
                                    <img src={line.productImage || line.imageUrl || line.image?.src} className="w-full h-full object-cover"/>
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-gray-100"><Package className="text-gray-400" size={20}/></div>
                                 )}
                             </div>
                             
                             {/* Ürün Detayı */}
                             <div className="flex-1 min-w-0">
                                 <p className="text-white text-sm font-medium truncate" title={line.productName || line.name}>{line.productName || line.name}</p>
                                 <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-blue-300 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">
                                            {line.merchantSku || line.sku || line.barcode}
                                        </span>
                                        <span className="text-[10px] text-gray-500">Varyant: {line.variantName || "-"}</span>
                                    </div>
                                    <span className="text-white font-bold text-xs bg-gray-700 px-2 py-1 rounded">x{line.quantity}</span>
                                 </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Aksiyon Butonu */}
                 <a 
                   href={`/etiket?id=${selectedOrder.id}&platform=${selectedOrder.platform}&kod=${selectedOrder.cargo_tracking_number || ""}`} 
                   target="_blank" 
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20 mt-4"
                 >
                    <Barcode size={24}/> KARGO BARKODU YAZDIR
                 </a>
                 
                 <div className="text-center">
                     <p className="text-[10px] text-gray-600">Sipariş ID: {selectedOrder.id} • Paket ID: {selectedOrder.packet_id || "-"}</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}