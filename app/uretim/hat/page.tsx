"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PackageCheck, ArrowLeft, RefreshCw, AlertTriangle, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';
// Dosya yapına göre import: 3 seviye yukarı çıkıp components'e
import PackingModal from '../../../components/uretim/PackingModal'; 

export default function ProductionLinePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
        .from('work_orders')
        .select('*, master_products(name, code)')
        .neq('status', 'Tamamlandı') // FİLTRE: Bitenleri getirme
        .order('created_at');
    if (data) setOrders(data);
    setLoading(false);
  }

  const openPacking = (order: any) => {
      setSelectedOrder(order);
      setIsModalOpen(true);
  };

  // Modal Kapandığında
  const handleCloseModal = (isFinished: boolean = false) => {
      setIsModalOpen(false);
      
      if (isFinished && selectedOrder) {
          // Eğer iş bittiyse, sunucuyu beklemeden ekrandan sil (Hız için)
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      } else {
          // Kısmi üretimse verileri yenile
          fetchOrders();
      }
      setSelectedOrder(null);
  };

  return (
    <div className="w-full h-full bg-[#0B1120] p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
                <Link href="/uretim" className="bg-gray-800 p-2 rounded-lg text-gray-400 hover:text-white"><ArrowLeft size={20}/></Link>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">🏭 Üretim Hattı</h1>
            </div>
            <button onClick={fetchOrders} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition"><RefreshCw size={16}/> Yenile</button>
        </div>

        {loading ? <div className="text-center py-20 text-gray-500">Yükleniyor...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map(order => {
                    const total = order.quantity || 1;
                    const completed = order.completed_quantity || 0;
                    const percent = Math.min(100, Math.round((completed / total) * 100));
                    
                    return (
                        <div key={order.id} className="bg-[#161f32] border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <div className={`absolute top-0 left-0 w-2 h-full ${percent > 0 ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                            <div className="pl-4">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded">#{order.id}</span>
                                    {order.notes && <AlertTriangle size={18} className="text-yellow-500" title={order.notes}/>}
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight mb-1">{order.master_products?.name}</h3>
                                <p className="text-gray-400 text-sm mb-5 font-mono">{order.master_products?.code}</p>
                                
                                <div className="mb-6 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                    <div className="flex justify-between text-xs text-gray-300 mb-1.5 font-bold">
                                        <span>Durum</span>
                                        <span>{completed} / {total}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>

                                <button onClick={() => openPacking(order)} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-md shadow-lg transition transform active:scale-95">
                                    <PackageCheck size={20}/> İŞLEM YAP
                                </button>
                            </div>
                        </div>
                    );
                })}
                {orders.length === 0 && <div className="col-span-full text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl"><Clock size={48} className="mx-auto mb-4 opacity-20"/><p>Bekleyen iş emri yok.</p></div>}
            </div>
        )}

        {isModalOpen && selectedOrder && (
            <PackingModal order={selectedOrder} onClose={handleCloseModal} />
        )}
    </div>
  );
}