'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import {
  Wrench, Plus, Search, Trash2, CheckCircle,
  Truck, X, Save, AlertCircle, User, Barcode,
  MapPin, Phone, Printer, Box, FileText, CheckSquare, Square,
  RefreshCw, ArrowRight, Download, Loader2
} from 'lucide-react';
import { useAuth } from "@clerk/nextjs";
import { toast } from 'sonner';
import ReactBarcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import {
  getSparePartsAction,
  searchOrderForSparePartAction,
  saveSparePartAction,
  deleteSparePartAction
} from '@/app/actions/sparePartActions';

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
  is_printed?: boolean;
  printed_at?: string;
  cargo_tracking_number?: string;
  cargo_provider_name?: string;
};

type OrderItem = {
  name: string;
  product_code?: string;
  quantity: number;
};

// --- ANA COMPONENT ---
export default function SparePartsPage() {
  const { userId } = useAuth(); // Client-side auth check only

  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "printed">("all");

  // SEÇİM VE İŞLEM STATE'LERİ
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // MODAL DURUMLARI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // ARAMA VE FORM STATE'LERİ
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [foundOrderItems, setFoundOrderItems] = useState<OrderItem[]>([]);
  const [formData, setFormData] = useState({
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
    detailed_description: "",
    status: 'Yeni' as 'Yeni' | 'Hazırlanıyor' | 'Kargolandı' | 'İptal'
  });

  // PRINT REFS
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => handleAfterPrint()
  });

  // --- BAŞLANGIÇ ---
  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await getSparePartsAction();
      if (data) setRequests(data as any);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      toast.error("Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  // --- SEÇİM İŞLEMLERİ ---
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length) setSelectedIds([]);
    else setSelectedIds(filteredRequests.map(r => r.id));
  };

  // --- KARGO VE YAZDIRMA İŞLEMLERİ ---
  async function createLabelAndPrint() {
    if (selectedIds.length === 0) return toast.warning("Lütfen işlem yapılacak talepleri seçin.");

    setIsProcessing(true);
    const toastId = toast.loading(`${selectedIds.length} etiket hazırlanıyor...`);

    try {
      let successCount = 0;

      for (const id of selectedIds) {
        const req = requests.find(r => r.id === id);
        if (!req) continue;

        // Barkod yoksa oluştur
        if (!req.cargo_tracking_number) {
          try {
            // API Çağrısı (Artık Secure)
            const res = await fetch('/api/surat/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: req.customer_name,
                address: req.customer_address,
                city: req.customer_city,
                district: req.customer_district,
                phone: req.customer_phone,
                amount: 0,
                orderId: `SP-${req.order_id}-${req.id}`,
                scenario: 'BUYER_PAYS'
              })
            });

            const result = await res.json();
            if (!res.ok || result.isError) {
              console.error(`ID ${id} API Hatası:`, result);
              toast.error(`Kargo Hatası (${req.customer_name}): ${result.Message}`);
            } else if (result.GonderiTakipNo) {
              // Başarılı - Update via Server Action
              await saveSparePartAction({
                id: id,
                cargo_tracking_number: result.GonderiTakipNo,
                cargo_provider_name: 'Surat',
                status: 'Hazırlanıyor'
              });
              successCount++;
            }
          } catch (err: any) {
            console.error("Fetch Error:", err);
          }
        } else {
          successCount++; // Zaten var, yazdırmaya hazır
        }
      }

      await fetchRequests();

      if (successCount > 0) {
        toast.success(`${successCount} etiket hazırlandı. Yazdırılıyor...`, { id: toastId });
        setTimeout(() => {
          handlePrint && handlePrint();
        }, 500);
      } else {
        toast.dismiss(toastId);
      }

    } catch (error: any) {
      toast.error("İşlem sırasında hata oluştu.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAfterPrint() {
    if (selectedIds.length > 0) {
      try {
        // Toplu yazdırma güncellemesi için tek tek çağırıyoruz (Basit yöntem)
        // İdealde bulk update action olmalı ama şimdilik döngü yeterli
        for (const id of selectedIds) {
          await saveSparePartAction({
            id: id,
            is_printed: true,
            printed_at: new Date().toISOString(),
            status: 'Kargolandı'
          });
        }

        fetchRequests();
        setSelectedIds([]);
        toast.success("Seçilenler 'Yazdırıldı' olarak işaretlendi.");
      } catch (error) {
        console.error(error);
        toast.error("Güncelleme hatası");
      }
    }
  }

  // --- DÜZENLEME ---
  function handleEdit(request: SparePartRequest) {
    setEditingId(request.id);
    setFormData({
      ...request,
      status: request.status // Ensure status is passed
    } as any);
    setIsModalOpen(true);
  }

  // --- SİPARİŞ ARAMA ---
  async function handleOrderLookup() {
    if (!formData.order_id) return toast.error("Sipariş No giriniz.");
    setIsSearchingOrder(true);

    try {
      // Server Action call
      const order = await searchOrderForSparePartAction(formData.order_id);

      if (order) {
        setFormData(prev => ({
          ...prev,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || order.phone,
          customer_city: order.shipping_city || order.customer_city || order.city,
          customer_district: order.shipping_district || order.customer_district || order.district,
          customer_address: order.shipping_address || order.delivery_address || order.address,
          status: 'Yeni'
        }));

        // Items parse
        let items: any[] = [];
        try {
          if (typeof order.items === 'string') items = JSON.parse(order.items);
          else if (Array.isArray(order.items)) items = order.items;
        } catch (e) { }

        // Trendyol/Standard lines fallback
        if (items.length === 0 && order.raw_data?.lines) {
          items = order.raw_data.lines.map((l: any) => ({ name: l.productName, product_code: l.merchantSku, quantity: l.quantity }));
        }

        setFoundOrderItems(items);
        toast.success("Sipariş bulundu.");
      } else {
        toast.error("Sipariş bulunamadı (Organizasyonunuzda yok).");
      }
    } catch (error) {
      console.error(error);
      toast.error("Sipariş aranırken hata.");
    } finally {
      setIsSearchingOrder(false);
    }
  }

  // --- KAYDETME ---
  async function handleSave() {
    try {
      if (!formData.customer_name) return toast.error("Müşteri adı zorunlu.");

      await saveSparePartAction({
        id: editingId,
        ...formData
      });

      toast.success(editingId ? "Güncellendi" : "Oluşturuldu");
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
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
        detailed_description: "",
        status: 'Yeni'
      });
      fetchRequests();
    } catch (error: any) {
      toast.error("Kaydetme hatası: " + error.message);
    }
  }

  // --- SİLME ---
  async function handleDelete(id: number) {
    if (!confirm("Silmek istiyor musunuz?")) return;
    try {
      await deleteSparePartAction(id);
      fetchRequests();
      toast.success("Silindi");
    } catch (error) {
      console.error(error);
      toast.error("Silme hatası");
    }
  }

  // --- FİLTRELEME ---
  const filteredRequests = requests.filter(r => {
    const matchesSearch = JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'new') return matchesSearch && !r.is_printed;
    if (filter === 'printed') return matchesSearch && r.is_printed;
    return matchesSearch;
  });

  // --- EXCEL DIŞA AKTARMA ---
  const handleExportExcel = () => {
    const sourceData = selectedIds.length > 0
      ? requests.filter(r => selectedIds.includes(r.id))
      : filteredRequests;

    if (sourceData.length === 0) return toast.warning("Dışa aktarılacak veri bulunamadı.");

    const data = sourceData.map(r => ({
      "Talep ID": r.id,
      "Sipariş No": r.order_id,
      "Durum": r.status,
      "Müşteri Adı": r.customer_name,
      "Telefon": r.customer_phone,
      "İl": r.customer_city,
      "İlçe": r.customer_district,
      "Adres": r.customer_address,
      "Ürün": r.product_name,
      "Ürün Kodu": r.product_code,
      "Parça Adı": r.part_name,
      "Miktar": r.quantity,
      "Desi": r.desi,
      "Sebep": r.reason,
      "Kargo Firması": r.cargo_provider_name || "-",
      "Takip No": r.cargo_tracking_number || "-",
      "Yazdırıldı mı": r.is_printed ? "Evet" : "Hayır",
      "Oluşturulma Tarihi": new Date(r.created_at).toLocaleDateString('tr-TR')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yedek Parça Talepleri");

    XLSX.writeFile(wb, `Yedek_Parca_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${data.length} adet kayıt Excel'e aktarıldı.`);
  };

  // --- RENDER ---
  return (
    <div className="p-6 bg-[#0B1120] min-h-screen text-gray-200 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <span className="bg-orange-600 p-2 rounded-lg text-white"><Wrench size={24} /></span>
            YEDEK PARÇA OPERASYONU
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Hasarlı veya eksik parça taleplerini ve kargolarını yönetin.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={fetchRequests} className="p-3 bg-[#1F2937] hover:bg-gray-700 rounded-xl text-white transition border border-gray-700"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition transform hover:scale-105 active:scale-95"
          >
            <Download size={20} /> Excel
          </button>

          <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition transform hover:scale-105 active:scale-95">
            <Plus size={20} /> YENİ TALEP OLUŞTUR
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-[#111827] p-4 rounded-2xl border border-gray-800 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-blue-500 transition" size={18} />
            <input
              type="text"
              placeholder="Ara..."
              className="bg-[#0B1120] border border-gray-700/50 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 w-64 text-sm text-white outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-[#0B1120] p-1 rounded-xl border border-gray-800">
            {['all', 'new', 'printed'].map((f: any) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filter === f ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {f === 'all' ? 'Tümü' : f === 'new' ? 'Bekleyenler' : 'Tamamlananlar'}
              </button>
            ))}
          </div>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 animate-in slide-in-from-right-10 fade-in">
            <span className="text-sm font-bold text-gray-400">{selectedIds.length} kayıt seçildi</span>
            <button
              onClick={createLabelAndPrint}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20 transition-all hover:-translate-y-1"
            >
              {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Printer size={18} />}
              ETİKET OLUŞTUR & YAZDIR
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#161F2E] text-gray-400 text-xs uppercase font-bold border-b border-gray-800">
              <th className="p-4 w-12 text-center">
                <button onClick={toggleSelectAll}>{selectedIds.length > 0 && selectedIds.length === filteredRequests.length ? <CheckSquare className="text-blue-500" /> : <Square />}</button>
              </th>
              <th className="p-4">Talep Detayı</th>
              <th className="p-4">Ürün & Açıklama</th>
              <th className="p-4">Kargo Durumu</th>
              <th className="p-4 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredRequests.map(req => (
              <tr key={req.id} className={`hover:bg-gray-800/30 transition group ${selectedIds.includes(req.id) ? 'bg-blue-900/10' : ''}`}>
                <td className="p-4 text-center">
                  <button onClick={() => toggleSelect(req.id)} className="text-gray-500 hover:text-white">
                    {selectedIds.includes(req.id) ? <CheckSquare className="text-blue-500" /> : <Square />}
                  </button>
                </td>
                <td className="p-4 align-top">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-800 text-white px-2 py-0.5 rounded text-[10px] font-mono border border-gray-700">#{req.order_id}</span>
                    <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="font-bold text-white text-sm">{req.customer_name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {req.customer_city} / {req.customer_district}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="text-gray-300 text-sm font-medium mb-1">{req.part_name} <span className="text-orange-500 font-bold">(x{req.quantity})</span></div>
                  <div className="text-xs text-gray-500 mb-2">{req.product_name}</div>
                  {req.reason && <div className="inline-block bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px] border border-red-500/20">{req.reason}</div>}
                </td>
                <td className="p-4 align-top">
                  {req.cargo_tracking_number ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-900/20 px-2 py-1 rounded w-fit border border-green-500/20">
                        <CheckCircle size={12} /> Barkodlandı
                      </div>
                      <div className="font-mono text-[10px] text-gray-400">{req.cargo_tracking_number}</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <AlertCircle size={12} /> Barkod Bekliyor
                    </div>
                  )}
                  {req.is_printed && <div className="mt-2 text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1"><Printer size={10} /> Yazdırıldı</div>}
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleEdit(req)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-yellow-500 border border-gray-700" title="Düzenle"><Wrench size={16} /></button>
                    <button onClick={() => handleDelete(req.id)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-red-500 border border-gray-700" title="Sil"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- PRINT TEMPLATE --- */}
      <div className="hidden">
        <div ref={printRef} className="print-container">
          <style type="text/css" media="print">
            {`
                  @page { size: 100mm 150mm; margin: 0; }
                  body { background: white; -webkit-print-color-adjust: exact; font-family: Arial, sans-serif; }
                  .label-page { page-break-after: always; width: 98mm; height: 148mm; border: 2px solid black; box-sizing: border-box; padding: 5px; margin: 1mm auto; display: flex; flex-col; }
               `}
          </style>

          {/* SEÇİLİ OLANLARI YAZDIR */}
          {selectedIds.map(id => {
            const req = requests.find(r => r.id === id);
            if (!req) return null;

            const trackingNo = req.cargo_tracking_number || `SP-${req.order_id}-${req.id}`;

            return (
              <div key={id} className="label-page flex flex-col justify-between">
                {/* HEADER */}
                <div className="border-b-2 border-black pb-2 mb-2 flex justify-between items-end">
                  <h1 className="text-3xl font-black italic tracking-tighter">SURAT</h1>
                  <div className="text-right text-[10px] font-bold">
                    <p>YEDEK PARÇA</p>
                    <p>{new Date().toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                {/* BODY */}
                <div className="flex-1">
                  <div className="mb-4">
                    <p className="text-[9px] font-bold underline mb-1">ALICI:</p>
                    <p className="text-xl font-bold uppercase leading-tight">{req.customer_name}</p>
                    <p className="text-xs mt-1 uppercase leading-tight font-medium h-12 overflow-hidden">{req.customer_address}</p>
                    <p className="text-xs font-bold mt-1">{req.customer_district} / {req.customer_city}</p>
                    <p className="text-xs mt-1">{req.customer_phone}</p>
                  </div>

                  <div className="border-2 border-black p-2 bg-gray-100 text-center mb-2">
                    <ReactBarcode value={trackingNo} width={2} height={50} fontSize={10} />
                    <p className="text-[10px] font-bold mt-1">{trackingNo}</p>
                  </div>

                  <div className="grid grid-cols-2 border-2 border-black text-center text-xs font-bold divide-x-2 divide-black">
                    <div className="p-1">
                      <span className="block text-[8px] text-gray-500">DESİ</span>
                      <span className="text-lg">{req.desi}</span>
                    </div>
                    <div className="p-1">
                      <span className="block text-[8px] text-gray-500">PARÇA</span>
                      <span>{req.quantity} Adet</span>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mt-2 text-center bg-black text-white p-2">
                  <p className="text-[8px] text-gray-300 mb-1">İÇERİK</p>
                  <p className="font-bold text-sm uppercase truncate">{req.part_name}</p>
                  <p className="text-[8px] opacity-70 truncate">{req.product_name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL (CREATE/EDIT) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1F2937] w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#161F2E] rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {editingId ? "Talebi Düzenle" : "Yeni Yedek Parça Talebi"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: Search */}
                <div className="space-y-6">
                  <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl">
                    <label className="text-blue-400 text-xs font-bold uppercase tracking-wider block mb-2">1. Sipariş Bul</label>
                    <div className="flex gap-2">
                      <input type="text" className="flex-1 bg-[#111827] border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition" placeholder="Sipariş No (Örn: 2314)"
                        value={formData.order_id} onChange={e => setFormData({ ...formData, order_id: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleOrderLookup()}
                      />
                      <button onClick={handleOrderLookup} disabled={isSearchingOrder} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold shadow-lg shadow-blue-900/20">
                        {isSearchingOrder ? "..." : "Bul"}
                      </button>
                    </div>
                  </div>

                  {/* Ürün Listesi */}
                  {foundOrderItems.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">2. Ürün Seç</label>
                      {foundOrderItems.map((item, idx) => (
                        <div key={idx} onClick={() => setFormData({ ...formData, product_name: item.name, product_code: item.product_code || '-' })}
                          className={`p-4 rounded-xl border cursor-pointer hover:bg-gray-800 transition ${formData.product_name === item.name ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-[#111827]'}`}>
                          <p className="font-bold text-white text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">Adet: {item.quantity} • Kod: {item.product_code}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RIGHT: Form */}
                <div className="space-y-4">
                  <label className="text-orange-400 text-xs font-bold uppercase tracking-wider block">3. Parça & Alıcı Detayları</label>

                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Parça Adı / Açıklama</label>
                    <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                      placeholder="Örn: 1 Adet Sağ Kapak" value={formData.part_name} onChange={e => setFormData({ ...formData, part_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Adet</label>
                      <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-xl p-3 text-white text-center font-bold"
                        value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Desi</label>
                      <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-xl p-3 text-white text-center font-bold"
                        value={formData.desi} onChange={e => setFormData({ ...formData, desi: Number(e.target.value) })} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Müşteri & Adres</label>
                    <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-xl p-3 text-white mb-2" placeholder="Ad Soyad"
                      value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
                    <textarea className="w-full bg-[#111827] border border-gray-600 rounded-xl p-3 text-white h-20 resize-none text-sm" placeholder="Adres..."
                      value={formData.customer_address} onChange={e => setFormData({ ...formData, customer_address: e.target.value })}></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 bg-[#161F2E] rounded-b-2xl">
              <button onClick={handleSave} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-900/40 transition hover:scale-[1.02]">
                {editingId ? "GÜNCELLE" : "KAYDET"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}