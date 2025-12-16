"use client";

import { useState, useEffect } from 'react';
import { Search, User, RefreshCw, MapPin, Phone, Mail, Calendar, ChevronRight, X, ShoppingBag, ExternalLink, Crown, Star, TrendingUp, Package } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { getCustomersAction, getCustomerOrderHistoryAction, type Customer } from '@/app/actions/customerActions';
import { toast } from 'sonner';

export default function CustomersPage() {
   const { orgId } = useAuth();
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState("");

   const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
   const [customerOrders, setCustomerOrders] = useState<any[]>([]);
   const [isPanelOpen, setIsPanelOpen] = useState(false);

   useEffect(() => {
      if (orgId) fetchCustomers();
   }, [orgId]);

   async function fetchCustomers() {
      setLoading(true);
      try {
         const data = await getCustomersAction(searchQuery);
         setCustomers(data);
      } catch (error) {
         console.error("Müşteri verisi hatası:", error);
         toast.error("Müşteri listesi yüklenemedi");
      } finally {
         setLoading(false);
      }
   }

   // Search effect
   useEffect(() => {
      const timer = setTimeout(() => {
         if (searchQuery) fetchCustomers();
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);

   const openCustomerDetail = async (customer: Customer) => {
      try {
         const history = await getCustomerOrderHistoryAction(customer.name);
         setCustomerOrders(history);
         setSelectedCustomer(customer);
         setIsPanelOpen(true);
      } catch (error) {
         toast.error("Geçmiş siparişler yüklenemedi");
      }
   };

   const getBadge = (spent: number, count: number) => {
      if (spent > 10000) return { label: "VIP PLATINUM", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Crown size={12} /> };
      if (spent > 5000) return { label: "VIP GOLD", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: <Crown size={12} /> };
      if (count > 1) return { label: "SADIK MÜŞTERİ", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Star size={12} /> };
      return { label: "YENİ", color: "bg-gray-700 text-gray-400 border-gray-600", icon: <User size={12} /> };
   };

   return (
      <div className="w-full h-full bg-[#0B1120]">
         <main className="flex-1 overflow-y-auto h-full relative">
            <header className="px-8 py-6 flex justify-between items-center border-b border-gray-800/50 bg-[#0B1120]">
               <div>
                  <h2 className="text-2xl font-bold text-white">Müşteri Rehberi</h2>
                  <p className="text-gray-500 text-sm mt-1">Toplam {customers.length} kayıtlı müşteri</p>
               </div>
               <button onClick={fetchCustomers} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shadow-lg">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Listeyi Yenile
               </button>
            </header>

            <div className="p-8">

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                     <div className="p-3 bg-blue-500/10 rounded-lg"><User size={24} className="text-blue-500" /></div>
                     <div><p className="text-gray-400 text-xs uppercase font-bold">Toplam Müşteri</p><h3 className="text-2xl font-bold text-white">{customers.length}</h3></div>
                  </div>
                  <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                     <div className="p-3 bg-yellow-500/10 rounded-lg"><Crown size={24} className="text-yellow-500" /></div>
                     <div><p className="text-gray-400 text-xs uppercase font-bold">VIP Müşteri (5000+)</p><h3 className="text-2xl font-bold text-white">{customers.filter(c => c.totalSpent > 5000).length}</h3></div>
                  </div>
                  <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                     <div className="p-3 bg-green-500/10 rounded-lg"><TrendingUp size={24} className="text-green-500" /></div>
                     <div>
                        <p className="text-gray-400 text-xs uppercase font-bold">Ortalama Ciro / Müşteri</p>
                        <h3 className="text-2xl font-bold text-white">₺{customers.length > 0 ? (customers.reduce((a, b) => a + b.totalSpent, 0) / customers.length).toFixed(0) : 0}</h3>
                     </div>
                  </div>
               </div>

               <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 mb-6">
                  <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                     <input type="text" placeholder="Müşteri adı veya telefon no ara..." className="w-full bg-[#0f1623] border border-gray-700 rounded-lg pl-9 py-2.5 text-sm focus:border-blue-500 outline-none text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
               </div>

               <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#0f1623] text-gray-300 uppercase text-[10px] font-bold tracking-wider border-b border-gray-800">
                           <tr>
                              <th className="px-6 py-4">Müşteri</th>
                              <th className="px-6 py-4">İletişim</th>
                              <th className="px-6 py-4">Konum</th>
                              <th className="px-6 py-4 text-center">Sipariş Adeti</th>
                              <th className="px-6 py-4">Toplam Harcama</th>
                              <th className="px-6 py-4 text-right">İşlem</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                           {loading ? (
                              <tr><td colSpan={6} className="text-center py-8">Yükleniyor...</td></tr>
                           ) : customers.map((customer, i) => (
                              <tr key={i} className="hover:bg-[#1F2937]/40 transition duration-150 group">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-xs border border-gray-600 shrink-0">
                                          {customer.name.substring(0, 2).toUpperCase()}
                                       </div>
                                       <div>
                                          <div className="font-medium text-white">{customer.name}</div>
                                          <div className="text-[10px] text-gray-500">Son: {new Date(customer.lastOrderDate).toLocaleDateString('tr-TR')}</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-xs">
                                    <div className="flex flex-col gap-1">
                                       <span className="flex items-center gap-1 text-gray-300"><Phone size={12} /> {customer.phone}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-xs">
                                    <span className="flex items-center gap-1 text-gray-400"><MapPin size={12} /> {customer.city}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold">{customer.orderCount}</span>
                                 </td>
                                 <td className="px-6 py-4 text-green-400 font-bold">
                                    ₺{customer.totalSpent.toLocaleString('tr-TR')}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button onClick={() => openCustomerDetail(customer)} className="text-blue-400 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded text-xs font-bold transition">
                                       İncele
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                     {!loading && customers.length === 0 && <div className="text-center py-16 text-gray-500">Kayıt bulunamadı.</div>}
                  </div>
               </div>
            </div>
         </main>

         {isPanelOpen && selectedCustomer && (
            <div className="absolute inset-0 z-50 flex justify-end">
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsPanelOpen(false)}></div>
               <div className="relative w-full max-w-md bg-[#111827] border-l border-gray-700 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">

                  <div className="sticky top-0 bg-[#111827]/95 backdrop-blur border-b border-gray-700 p-6 flex justify-between items-center z-10">
                     <h2 className="text-lg font-bold text-white">Müşteri Kartı</h2>
                     <button onClick={() => setIsPanelOpen(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-6">
                     <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-[#111827] shadow-xl mb-3">
                           {selectedCustomer.name.substring(0, 1).toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-white">{selectedCustomer.name}</h3>
                        <p className="text-sm text-gray-400">{selectedCustomer.city}</p>
                        <div className="mt-4 flex gap-3 w-full">
                           <div className="flex-1 bg-[#1F2937] p-3 rounded-xl border border-gray-700">
                              <p className="text-[10px] text-gray-400 uppercase">Harcama</p>
                              <p className="text-lg font-bold text-green-400">₺{selectedCustomer.totalSpent.toLocaleString()}</p>
                           </div>
                           <div className="flex-1 bg-[#1F2937] p-3 rounded-xl border border-gray-700">
                              <p className="text-[10px] text-gray-400 uppercase">Sipariş</p>
                              <p className="text-lg font-bold text-white">{selectedCustomer.orderCount}</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-[#1F2937] p-5 rounded-xl border border-gray-700 space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2"><User size={14} /> İletişim</h4>
                        <div className="flex items-center gap-3 text-sm">
                           <Phone size={16} className="text-blue-500" />
                           <span className="text-white">{selectedCustomer.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                           <Mail size={16} className="text-orange-500" />
                           <span className="text-white">{selectedCustomer.email}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm pt-2 border-t border-gray-700">
                           <MapPin size={16} className="text-red-500 mt-0.5" />
                           <span className="text-gray-300 text-xs leading-relaxed">{selectedCustomer.address}</span>
                        </div>
                     </div>

                     <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><ShoppingBag size={14} /> Sipariş Geçmişi</h4>
                        <div className="space-y-3">
                           {customerOrders.map((order: any) => (
                              <div key={order.id} className="bg-[#1F2937] p-3 rounded-lg border border-gray-700 flex gap-3 hover:border-gray-600 transition group">
                                 {order.product_image ? (
                                    <img src={order.product_image} className="w-12 h-12 rounded bg-white object-cover" />
                                 ) : (
                                    <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center"><Package size={20} className="text-gray-500" /></div>
                                 )}

                                 <div className="flex-1">
                                    <div className="flex justify-between">
                                       <p className="text-white text-sm font-medium line-clamp-1">{order.product_name || order.first_product_name || "Ürün"}</p>
                                       <span className="text-green-400 text-xs font-bold">₺{order.total_price}</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                       <div className="text-[10px] text-gray-500">
                                          <p>{new Date(order.order_date).toLocaleDateString('tr-TR')}</p>
                                          <p className="text-orange-400">{order.status}</p>
                                       </div>
                                       <Link href={`/siparisler`} className="text-blue-400 hover:text-white hidden group-hover:block">
                                          <ExternalLink size={14} />
                                       </Link>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
