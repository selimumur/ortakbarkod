"use client";

import { useState, useEffect } from 'react';
import { Truck, Package, ArrowRight, Printer, Save, RefreshCw, Search, X, FileText, CheckSquare, Square, ScanBarcode } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import ReactBarcode from 'react-barcode';

export default function CargoPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [scanInput, setScanInput] = useState("");
  
  const [editingDesiId, setEditingDesiId] = useState<number | null>(null);
  const [tempDesi, setTempDesi] = useState<number>(0);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const pool = allOrders.filter(o => !o.in_shipping_queue);
    if (!searchQuery) {
        setPendingOrders(pool);
    } else {
        const s = searchQuery.toLowerCase();
        const filtered = pool.filter(o => 
            String(o.id).includes(s) ||
            o.customer_name?.toLowerCase().includes(s) ||
            o.product?.toLowerCase().includes(s) ||
            o.code?.toLowerCase().includes(s)
        );
        setPendingOrders(filtered);
    }
  }, [searchQuery, allOrders]);

  async function fetchData() {
    setLoading(true);
    try {
        const { data: orders } = await supabase.from('orders').select('*').order('order_date', { ascending: true });
        const { data: products } = await supabase.from('master_products').select('code, total_desi');
        const productMap = new Map();
        products?.forEach(p => productMap.set(p.code, p.total_desi));

        if (orders) {
            const validStatuses = ["Yeni", "Created", "Hazırlanıyor", "Picking", "Invoiced", "Awaiting", "UnPacked", "Kargoda", "Kargolandı", "Shipped", "Taşıma Durumunda"];
            const activeData = orders.filter(o => validStatuses.includes(o.status));

            const processed = activeData.map(o => {
                const code = o.first_product_code || o.product_code || "-";
                const finalDesi = o.raw_data?.cargoDeci || productMap.get(code) || 0;
                return { ...o, desi: finalDesi, code: code, product: o.first_product_name || o.product_name || "Ürün Adı Yok" };
            });

            const drafts = processed.filter((o: any) => o.in_shipping_queue === true);
            const pool = processed.filter((o: any) => o.in_shipping_queue !== true);

            setAllOrders(processed);
            setDraftOrders(drafts);
            setPendingOrders(pool);
        }
    } catch (error: any) {
        toast.error("Veri çekilemedi: " + error.message);
    } finally {
        setLoading(false);
    }
  }

  // --- İŞLEMLER ---
  const handleScan = async (e: any) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const term = scanInput.trim().toLowerCase();
          if (!term) return;
          const pool = allOrders.filter(o => !o.in_shipping_queue);
          const matches = pool.filter(o => o.code?.toLowerCase() === term || o.product?.toLowerCase().includes(term) || String(o.id) === term);

          if (matches.length > 0) {
              const ids = matches.map(m => m.id);
              const missingDesi = matches.filter(m => !m.desi || m.desi <= 0);
              if (missingDesi.length > 0) {
                   toast.warning("Desi eksik."); setSearchQuery(missingDesi[0].code); return;
              }
              await supabase.from('orders').update({ in_shipping_queue: true }).in('id', ids);
              const updatedAll = allOrders.map(o => ids.includes(o.id) ? {...o, in_shipping_queue: true} : o);
              setAllOrders(updatedAll);
              setDraftOrders(updatedAll.filter(o => o.in_shipping_queue));
              setScanInput(""); 
              toast.success(`${matches.length} paket eklendi!`);
          } else {
              toast.error("Sipariş bulunamadı.");
          }
      }
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === pendingOrders.length) setSelectedIds([]);
      else setSelectedIds(pendingOrders.map(o => o.id));
  };

  const toggleSelect = (id: number) => {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
      else setSelectedIds([...selectedIds, id]);
  };

  const moveSelectedToDraft = async () => {
      if (selectedIds.length === 0) return toast.warning("Seçim yapmadınız.");
      const invalid = pendingOrders.filter(o => selectedIds.includes(o.id) && (!o.desi || o.desi <= 0));
      if (invalid.length > 0) return toast.error("Seçilenlerde desi eksik!");
      await supabase.from('orders').update({ in_shipping_queue: true }).in('id', selectedIds);
      const updatedAll = allOrders.map(o => selectedIds.includes(o.id) ? {...o, in_shipping_queue: true} : o);
      setAllOrders(updatedAll);
      setDraftOrders(updatedAll.filter(o => o.in_shipping_queue));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} sipariş eklendi.`);
  };

  async function moveToDraft(order: any) {
      if (!order.desi || order.desi <= 0) {
          toast.warning("Desi giriniz!"); setEditingDesiId(order.id); setTempDesi(0); return;
      }
      await supabase.from('orders').update({ in_shipping_queue: true }).eq('id', order.id);
      const updatedAll = allOrders.map(o => o.id === order.id ? {...o, in_shipping_queue: true} : o);
      setAllOrders(updatedAll);
      setDraftOrders(updatedAll.filter(o => o.in_shipping_queue));
  }

  async function removeFromDraft(order: any) {
      await supabase.from('orders').update({ in_shipping_queue: false }).eq('id', order.id);
      const updatedAll = allOrders.map(o => o.id === order.id ? {...o, in_shipping_queue: false} : o);
      setAllOrders(updatedAll);
      setDraftOrders(updatedAll.filter(o => o.in_shipping_queue));
  }

  async function saveDesi(order: any) {
      if (tempDesi <= 0) return;
      if (order.code && order.code !== "-") {
          await supabase.from('master_products').update({ total_desi: tempDesi }).eq('code', order.product_code);
      }
      const updatedAll = allOrders.map(o => o.id === order.id ? { ...o, desi: tempDesi } : o);
      setAllOrders(updatedAll);
      setDraftOrders(updatedAll.filter(o => o.in_shipping_queue)); 
      setPendingOrders(updatedAll.filter(o => !o.in_shipping_queue));
      setEditingDesiId(null);
      toast.success("Desi kaydedildi!");
  }

  const handlePrint = () => {
      setIsPrinting(true);
      setTimeout(() => { window.print(); setIsPrinting(false); }, 500);
  };

  const getCargoLogo = (provider: string) => {
    const p = (provider || "").toLowerCase();
    if (p.includes("trendyol")) return <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded">TEX</span>;
    if (p.includes("aras")) return <span className="bg-blue-800 text-white text-[10px] font-bold px-2 py-1 rounded">ARAS</span>;
    if (p.includes("surat")) return <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">SÜRAT</span>;
    return <span className="bg-gray-700 text-white text-[10px] font-bold px-2 py-1 rounded">KARGO</span>;
  };

  return (
    <div className="w-full h-full bg-[#0B1120] flex flex-col">
      <header className="px-8 py-4 border-b border-gray-800 bg-[#0B1120] flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2"><Truck className="text-orange-500"/> Lojistik Operasyon</h2>
           <p className="text-gray-500 text-xs">Barkod okutun veya listeden seçerek kargolayın.</p>
        </div>
        <div className="flex-1 max-w-xl mx-8 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><ScanBarcode className="text-blue-500 animate-pulse" size={24} /></div>
            <input type="text" autoFocus placeholder="Barkod Okutun veya Ürün Adı Yazın..." className="w-full bg-[#111827] border-2 border-blue-900/50 focus:border-blue-500 text-white rounded-xl pl-12 pr-4 py-3 shadow-lg outline-none transition-all text-lg placeholder:text-gray-600" value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={handleScan} />
        </div>
        <div className="flex gap-3">
           <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition border border-gray-700"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Yenile</button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4 print:p-0 print:block">
         {/* SOL PANEL */}
         <div className="flex-1 bg-[#111827] rounded-xl border border-gray-800 flex flex-col print:hidden h-full">
            <div className="p-3 border-b border-gray-800 bg-[#161f32] rounded-t-xl flex flex-wrap justify-between items-center gap-4">
               <div className="flex items-center gap-3">
                   <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">{selectedIds.length > 0 && selectedIds.length === pendingOrders.length ? <CheckSquare size={20} className="text-blue-500"/> : <Square size={20}/>}</button>
                   <h3 className="font-bold text-white text-sm">Bekleyenler ({pendingOrders.length})</h3>
               </div>
               <div className="flex-1 min-w-[200px] relative">
                   <Search size={14} className="absolute left-2 top-2 text-gray-500"/><input type="text" placeholder="Filtrele..." className="w-full bg-[#0f1623] border border-gray-700 rounded-lg pl-8 py-1.5 text-xs text-white outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
               </div>
               {selectedIds.length > 0 && (<button onClick={moveSelectedToDraft} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-right-5">Seçilenleri Ekle ({selectedIds.length}) <ArrowRight size={14}/></button>)}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {pendingOrders.map(order => (
                   <div key={order.id} onClick={() => !editingDesiId && toggleSelect(order.id)} className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer hover:bg-[#1F2937] transition ${selectedIds.includes(order.id) ? 'bg-blue-900/20 border-blue-500/50' : (!order.desi || order.desi <= 0) ? 'bg-red-900/10 border-red-500/30' : 'bg-[#0f1623] border-gray-700'}`}>
                       <div className="flex items-center gap-3 flex-1 overflow-hidden">
                           <div className="text-gray-400 flex-shrink-0">{selectedIds.includes(order.id) ? <CheckSquare size={18} className="text-blue-500"/> : <Square size={18}/>}</div>
                           <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2"><span className="text-white font-bold text-sm truncate max-w-[180px]">{order.customer_name}</span><span className="text-[10px] bg-gray-800 px-1.5 rounded text-gray-400 flex-shrink-0">#{order.id}</span>{getCargoLogo(order.cargo_provider_name)}</div>
                               <div className="text-xs text-gray-400 mt-0.5 truncate">{order.product}</div>
                               <div className="text-[10px] text-blue-400 font-mono">{order.code}</div>
                           </div>
                       </div>
                       <div className="mx-2 text-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                           {editingDesiId === order.id || (!order.desi || order.desi <= 0) ? (
                               <div className="flex items-center gap-1 animate-pulse"><input autoFocus type="number" className="w-10 bg-white text-black text-xs p-1 rounded font-bold text-center outline-none border-2 border-red-500" placeholder="Ds" value={tempDesi || ''} onChange={(e) => setTempDesi(Number(e.target.value))}/><button onClick={() => saveDesi(order)} className="bg-green-600 p-1 rounded text-white hover:bg-green-500"><Save size={12}/></button></div>
                           ) : (
                               <div onClick={() => {setEditingDesiId(order.id); setTempDesi(order.desi);}} className="hover:bg-gray-800 p-1 rounded group cursor-pointer text-center min-w-[40px]"><p className="text-[8px] text-gray-500">DESİ</p><p className="text-white font-bold group-hover:text-blue-400">{order.desi}</p></div>
                           )}
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); moveToDraft(order); }} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition flex-shrink-0"><ArrowRight size={18}/></button>
                   </div>
               ))}
               {pendingOrders.length === 0 && <p className="text-center text-gray-500 text-sm mt-10">Liste boş.</p>}
            </div>
         </div>

         {/* SAĞ PANEL */}
         <div className="w-full md:w-1/3 bg-[#111827] rounded-xl border border-gray-800 flex flex-col print:hidden">
             <div className="p-4 border-b border-gray-800 bg-[#161f32] rounded-t-xl flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><Printer size={18} className="text-green-500"/> Yazdırılacaklar</h3>
               <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">{draftOrders.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#0B1120]/50">
                 {draftOrders.map((draft, i) => (
                     <div key={i} className="p-3 bg-[#0f1623] border border-gray-700 rounded-lg flex justify-between items-center group relative">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-lg"></div>
                         <div className="pl-2 overflow-hidden">
                             <p className="text-white text-xs font-bold truncate">{draft.customer_name}</p>
                             <p className="text-[10px] text-blue-300 font-mono">{draft.code}</p>
                         </div>
                         <div className="flex items-center gap-2 flex-shrink-0">
                             <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 rounded">{draft.desi} Ds</span>
                             <button onClick={() => removeFromDraft(draft)} className="text-gray-500 hover:text-red-500"><X size={16}/></button>
                         </div>
                     </div>
                 ))}
                 {draftOrders.length === 0 && <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50"><FileText size={48} className="mb-2"/><p className="text-xs text-center px-4">Soldan seçim yapın.</p></div>}
             </div>
             <div className="p-4 border-t border-gray-800 bg-[#161f32] rounded-b-xl">
                 <button onClick={handlePrint} disabled={draftOrders.length === 0} className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 disabled:text-gray-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition">
                     <Printer size={20}/> {draftOrders.length} ETİKETİ YAZDIR
                 </button>
             </div>
         </div>

         {/* --- YAZDIRMA ŞABLONU (ORİJİNAL TASARIM) --- */}
         <div id="print-section" className="hidden print:block absolute top-0 left-0 w-full bg-white text-black font-sans">
             <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 100mm 150mm; }
                    body { background: white; -webkit-print-color-adjust: exact; font-family: Arial, sans-serif; }
                    .print-label { 
                        page-break-after: always; 
                        width: 98mm; 
                        height: 148mm; 
                        border: 2px solid black; 
                        overflow: hidden; 
                        margin: 1mm auto; 
                        display: flex; 
                        flex-direction: column; 
                        box-sizing: border-box; 
                        padding: 4px;
                    }
                }
             `}</style>

             {draftOrders.map((draft, i) => (
                 <div key={i} className="print-label">
                     {/* ÜST: Logo ve Şube */}
                     <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-1">
                         <span className="text-3xl font-black uppercase tracking-tighter italic">SÜRAT</span>
                         <div className="text-right text-[9px] font-bold leading-tight">
                             <p>ŞUBE: BIGA</p>
                             <p>TARİH: {new Date().toLocaleDateString('tr-TR')}</p>
                         </div>
                     </div>

                     {/* ORTA: T.No ve Sipariş No */}
                     <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
                         <span>T.No: {draft.cargo_tracking_number || "734" + draft.id}</span>
                         <span>Sipariş: {draft.id}</span>
                     </div>

                     {/* BARKOD */}
                     <div className="h-20 flex items-center justify-center py-1 border-2 border-black mb-1 bg-white">
                         <ReactBarcode value={draft.cargo_tracking_number || "734" + draft.id} width={1.8} height={50} fontSize={12} font="monospace" />
                     </div>

                     {/* ALICI KUTUSU */}
                     <div className="border-2 border-black p-2 mb-1 flex-1">
                         <p className="text-[9px] font-bold underline mb-1">ALICI BİLGİLERİ</p>
                         <p className="text-lg font-black uppercase leading-tight mb-1">{draft.customer_name}</p>
                         <p className="text-[10px] font-bold uppercase leading-tight h-10 overflow-hidden">
                            {draft.raw_data?.shipmentAddress?.fullAddress?.substring(0, 150)}
                         </p>
                         <div className="flex justify-between mt-2 text-[10px] font-black uppercase">
                             <span>TEL: {draft.raw_data?.shipmentAddress?.phone || "-"}</span>
                             <span>{draft.raw_data?.shipmentAddress?.city} / {draft.raw_data?.shipmentAddress?.district}</span>
                         </div>
                     </div>

                     {/* DETAYLAR IZGARASI */}
                     <div className="grid grid-cols-4 border-2 border-black mb-1 text-center text-[9px] font-bold divide-x-2 divide-black">
                         <div className="p-1">
                             <span className="block text-[7px] text-gray-600">ÖDEME</span>
                             <span>GÖNDERİCİ</span>
                         </div>
                         <div className="p-1">
                             <span className="block text-[7px] text-gray-600">BİRİM</span>
                             <span>KOLİ</span>
                         </div>
                         <div className="p-1">
                             <span className="block text-[7px] text-gray-600">DESİ</span>
                             <span className="text-lg">{draft.desi}</span>
                         </div>
                         <div className="p-1">
                             <span className="block text-[7px] text-gray-600">PARÇA</span>
                             <span>1/1</span>
                         </div>
                     </div>

                     {/* YÖNLENDİRME (TRANSFER MERKEZİ) */}
                     <div className="border-2 border-black p-1 mb-1 text-center">
                         <p className="text-[8px] text-gray-500">VARIŞ MERKEZİ</p>
                         <p className="text-xl font-black uppercase">{draft.raw_data?.shipmentAddress?.city} AKTARMA</p>
                     </div>

                     {/* BİZİM ÖZEL ALANIMIZ (SİYAH KUTU) */}
                     <div className="bg-black text-white p-2 text-center flex flex-col justify-center h-16">
                         <p className="text-[8px] text-gray-300 mb-0.5 uppercase">PAKET İÇERİĞİ / ÜRÜN KODU</p>
                         <h1 className="text-2xl font-black tracking-widest leading-none">{draft.code}</h1>
                         <p className="text-[8px] mt-0.5 text-gray-400 w-full truncate px-1">{draft.product}</p>
                     </div>
                 </div>
             ))}
         </div>

      </div>
    </div>
  );
}