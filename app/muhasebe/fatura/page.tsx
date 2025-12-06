"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Save, Trash2, RefreshCw, 
  Building2, Package, ArrowUpCircle, ArrowDownCircle,
  Search, X, CheckCircle, Loader2
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// --- YARDIMCI BİLEŞEN: ARANABİLİR SELECT (SEARCHABLE SELECT) ---
// Bu bileşen hem arama yapar hem de listede yoksa "Yeni Ekle" butonu çıkarır.
const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    onAddNew, 
    placeholder, 
    labelKey = 'name' 
}: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Dışarı tıklandığında kapanması için
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Seçili öğenin adını bul
    const selectedItem = options.find((o: any) => o.id == value);
    
    // Arama filtresi
    const filteredOptions = options.filter((o: any) => 
        o[labelKey]?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm flex justify-between items-center cursor-pointer min-h-[46px]"
                onClick={() => { setIsOpen(!isOpen); setSearch(""); }} // Tıklayınca aç/kapa ve aramayı sıfırla
            >
                <span className={selectedItem ? 'text-white' : 'text-gray-500'}>
                    {selectedItem ? selectedItem[labelKey] : placeholder}
                </span>
                <Search size={14} className="text-gray-500"/>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#1f2937] border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Ara..." 
                        className="w-full bg-[#111827] text-white p-3 border-b border-gray-700 outline-none text-sm sticky top-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt: any) => (
                            <div 
                                key={opt.id} 
                                className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer text-sm text-gray-300 border-b border-gray-800 last:border-0"
                                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                            >
                                {opt[labelKey]} 
                                {opt.stock_quantity !== undefined && <span className="text-xs opacity-50 ml-2">(Stok: {opt.stock_quantity})</span>}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-gray-500 text-sm text-center">Sonuç bulunamadı.</div>
                    )}

                    {/* YENİ EKLE BUTONU */}
                    <div 
                        className="p-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer text-sm font-bold border-t border-gray-700 sticky bottom-0 flex items-center gap-2 justify-center"
                        onClick={() => { onAddNew(search); setIsOpen(false); }}
                    >
                        <Plus size={16}/> "{search}" Yeni Ekle
                    </div>
                </div>
            )}
        </div>
    );
};

export default function InvoicePage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  
  // --- DURUM YÖNETİMİ ---
  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sales'>('sales'); 
  
  // --- VERİLER ---
  const [contacts, setContacts] = useState<any[]>([]); 
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // --- MODAL STATE ---
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState(""); // Modal açıldığında otomatik dolacak isim

  // --- FATURA BAŞLIĞI ---
  const today = new Date().toISOString().split('T')[0];
  const [invoice, setInvoice] = useState({
    contact_id: "",
    invoice_no: "",
    issue_date: today,
    due_date: today, // Vade tarihi fatura tarihi ile aynı başlar
    note: ""
  });

  // --- FATURA KALEMLERİ ---
  const [items, setItems] = useState<any[]>([
    { item_id: "", quantity: 1, unit_price: 0, tax_rate: 20, discount_rate: 0, total: 0, unit: "-" }
  ]);

  // --- BAŞLANGIÇ ---
  useEffect(() => {
    fetchData();
    generateInvoiceNo();
    // Formu temizle ama tarihleri koru
    setInvoice(prev => ({ 
        ...prev, 
        contact_id: "", 
        issue_date: today, 
        due_date: today 
    }));
    setItems([{ item_id: "", quantity: 1, unit_price: 0, tax_rate: 20, discount_rate: 0, total: 0, unit: "-" }]);
  }, [invoiceType]);

  // --- OTOMATİK FATURA NO ÜRETİCİ ---
  const generateInvoiceNo = () => {
     // Benzersiz olması için: Önek + YılAyGün + Rastgele 4 hane
     // Örn: SAT-20231201-4829
     const prefix = invoiceType === 'sales' ? 'SAT' : 'ALS';
     const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
     const randomPart = Math.floor(1000 + Math.random() * 9000);
     setInvoice(prev => ({ ...prev, invoice_no: `${prefix}-${datePart}-${randomPart}` }));
  };

  async function fetchData() {
    setLoading(true);
    try {
      if (invoiceType === 'sales') {
        const { data: cust } = await supabase.from('customers').select('*').order('name');
        const { data: prod } = await supabase.from('products').select('*').order('name');
        if (cust) setContacts(cust);
        if (prod) setInventoryItems(prod);
      } else {
        const { data: sup } = await supabase.from('suppliers').select('*').order('name');
        const { data: mat } = await supabase.from('raw_materials').select('*').order('name');
        if (sup) setContacts(sup);
        if (mat) setInventoryItems(mat);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --- YENİ CARİ OLUŞTURMA (MODAL) ---
  const handleQuickCreateContact = async (name: string, phone?: string) => {
      const table = invoiceType === 'sales' ? 'customers' : 'suppliers';
      const { data, error } = await supabase.from(table).insert({
          name: name,
          phone: phone,
          balance: 0
      }).select().single();

      if (error) {
          toast.error("Hata: " + error.message);
      } else {
          toast.success("Cari kart oluşturuldu!");
          fetchData(); // Listeyi yenile
          setInvoice(prev => ({ ...prev, contact_id: data.id })); // Otomatik seç
          setIsContactModalOpen(false);
      }
  };

  // --- YENİ ÜRÜN OLUŞTURMA (MODAL) ---
  const handleQuickCreateProduct = async (name: string, price: number) => {
      const table = invoiceType === 'sales' ? 'products' : 'raw_materials';
      // Basit ekleme, detaylar sonra düzenlenebilir
      const payload = invoiceType === 'sales' 
        ? { name, sale_price: price, stock_quantity: 0 } 
        : { name, unit_price: price, stock_quantity: 0 };

      const { data, error } = await supabase.from(table).insert(payload).select().single();

      if (error) {
          toast.error("Hata: " + error.message);
      } else {
          toast.success("Ürün/Hizmet kartı oluşturuldu!");
          await fetchData(); // Listeyi yenile
          // Listeyi yeniledik, kullanıcı şimdi seçebilir.
          setIsProductModalOpen(false);
      }
  };

  // --- HESAPLAMA FONKSİYONLARI ---
  const calculateLineItem = (item: any) => {
    const grossTotal = item.quantity * item.unit_price; 
    const discountAmount = grossTotal * (item.discount_rate / 100); 
    const taxBase = grossTotal - discountAmount; 
    const taxAmount = taxBase * (item.tax_rate / 100); 
    return taxBase + taxAmount; 
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'item_id') {
        const selected = inventoryItems.find(m => m.id == value);
        item.item_id = value;
        item.unit = selected?.unit || "-";
        item.unit_price = invoiceType === 'sales' ? (selected?.sale_price || 0) : (selected?.unit_price || 0); 
    } else {
        item[field] = Number(value);
    }

    item.total = calculateLineItem(item);
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { item_id: "", quantity: 1, unit_price: 0, tax_rate: 20, discount_rate: 0, total: 0, unit: "-" }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subTotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const totalDiscount = items.reduce((acc, item) => acc + ((item.quantity * item.unit_price) * (item.discount_rate / 100)), 0);
  const totalTax = items.reduce((acc, item) => {
    const base = (item.quantity * item.unit_price) * (1 - item.discount_rate/100);
    return acc + (base * (item.tax_rate / 100));
  }, 0);
  const grandTotal = subTotal - totalDiscount + totalTax;

  // --- KAYDETME FONKSİYONU ---
  async function saveInvoice() {
    if (!invoice.contact_id || !invoice.invoice_no) return toast.error("Cari ve Fatura No zorunludur!");
    if (!items[0].item_id) return toast.error("En az bir ürün ekleyin.");

    setLoading(true);
    try {
        // DÜZELTME: 'type' yerine 'invoice_type' kullanıyoruz.
        const { data: invData, error: invError } = await supabase.from('invoices').insert({
            invoice_type: invoiceType, 
            contact_id: Number(invoice.contact_id),
            invoice_no: invoice.invoice_no,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            subtotal: subTotal,
            discount_total: totalDiscount,
            tax_total: totalTax,
            total_amount: grandTotal,
            note: invoice.note,
            status: 'Bekliyor'
        }).select().single();

        if (invError) throw invError;

        for (const item of items) {
            if (!item.item_id) continue;
            await supabase.from('invoice_items').insert({
                invoice_id: invData.id,
                item_id: Number(item.item_id),
                item_type: invoiceType === 'sales' ? 'product' : 'raw_material',
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                discount_rate: item.discount_rate,
                total_price: item.total
            });

            const table = invoiceType === 'sales' ? 'products' : 'raw_materials';
            const { data: currentItem } = await supabase.from(table).select('stock_quantity').eq('id', item.item_id).single();
            
            let newStock = 0;
            if (invoiceType === 'sales') {
                newStock = (currentItem?.stock_quantity || 0) - item.quantity;
            } else {
                newStock = (currentItem?.stock_quantity || 0) + item.quantity;
            }

            await supabase.from(table).update({ stock_quantity: newStock }).eq('id', item.item_id);
        }

        const cariTable = invoiceType === 'sales' ? 'customers' : 'suppliers';
        const { data: currentCari } = await supabase.from(cariTable).select('balance').eq('id', invoice.contact_id).single();
        let newBalance = currentCari?.balance || 0;
        
        // Bakiye Güncelleme: Her iki durumda da cari bakiye artar (Borç veya Alacak olarak)
        newBalance += grandTotal; 
        
        await supabase.from(cariTable).update({ balance: newBalance }).eq('id', invoice.contact_id);

        toast.success(`${invoiceType === 'sales' ? 'Satış' : 'Alış'} faturası başarıyla kaydedildi!`);
        router.push('/muhasebe/cariler');

    } catch (error: any) {
        toast.error("Hata: " + error.message);
    } finally {
        setLoading(false);
    }
  }

  const amountColor = invoiceType === 'sales' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="w-full h-full bg-[#0B1120] text-white">
      <main className="flex-1 overflow-y-auto h-full p-4 md:p-8">
         
         {/* TÜR SEÇİMİ */}
         <div className="flex justify-center mb-6">
            <div className="bg-[#111827] p-1 rounded-xl border border-gray-800 flex gap-1">
                <button 
                    onClick={() => setInvoiceType('sales')}
                    className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${invoiceType === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowDownCircle size={18}/> SATIŞ FATURASI
                </button>
                <button 
                    onClick={() => setInvoiceType('purchase')}
                    className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${invoiceType === 'purchase' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowUpCircle size={18}/> ALIŞ FATURASI
                </button>
            </div>
         </div>

         {/* BAŞLIK */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-6 gap-4">
             <div>
                 <h2 className={`text-2xl font-bold flex items-center gap-2 ${invoiceType === 'sales' ? 'text-blue-500' : 'text-orange-500'}`}>
                    <FileText/> {invoiceType === 'sales' ? 'Satış Faturası' : 'Alış Faturası'}
                 </h2>
                 <p className="text-gray-500 text-sm mt-1">
                    Fatura No: <span className="text-white font-mono">{invoice.invoice_no}</span> (Otomatik)
                 </p>
             </div>
             <div className="text-right bg-[#111827] px-6 py-3 rounded-xl border border-gray-800">
                 <p className="text-xs text-gray-400 uppercase font-bold">GENEL TOPLAM</p>
                 <p className={`text-3xl font-black ${amountColor}`}>₺{grandTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</p>
             </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* SOL: FATURA DETAYLARI */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#111827] p-6 rounded-xl border border-gray-800">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase text-gray-400">
                        <Building2 size={16}/> Cari Bilgileri
                    </h3>
                    <div className="space-y-4">
                        {/* CARİ SEÇİMİ (SEARCHABLE) */}
                        <div className="relative">
                            <label className="text-xs text-gray-500 block mb-1.5 font-bold uppercase">{invoiceType === 'sales' ? 'Müşteri' : 'Tedarikçi'}</label>
                            <SearchableSelect 
                                options={contacts}
                                value={invoice.contact_id}
                                placeholder="Cari arayın veya yeni oluşturun..."
                                onChange={(val: any) => setInvoice({...invoice, contact_id: val})}
                                onAddNew={(name: string) => { setNewItemName(name); setIsContactModalOpen(true); }}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5 font-bold uppercase">Fatura No</label>
                            <input type="text" disabled className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-gray-400 text-sm outline-none cursor-not-allowed" value={invoice.invoice_no} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5 font-bold uppercase">Fatura Tarihi</label>
                                <input type="date" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none" value={invoice.issue_date} onChange={e => setInvoice({...invoice, issue_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5 font-bold uppercase">Vade Tarihi</label>
                                <input type="date" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none" value={invoice.due_date} onChange={e => setInvoice({...invoice, due_date: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5 font-bold uppercase">Notlar</label>
                            <textarea className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none h-20 resize-none" placeholder="Açıklama..." value={invoice.note} onChange={e => setInvoice({...invoice, note: e.target.value})}></textarea>
                        </div>
                    </div>
                </div>
                
                <button onClick={saveInvoice} disabled={loading} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition ${invoiceType === 'sales' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-600 hover:bg-orange-500'}`}>
                    {loading ? <RefreshCw className="animate-spin"/> : <Save/>} {invoiceType === 'sales' ? 'SATIŞI ONAYLA' : 'ALIŞI ONAYLA'}
                </button>
            </div>

            {/* SAĞ: KALEMLER TABLOSU */}
            <div className="lg:col-span-3">
                <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden min-h-[500px] flex flex-col shadow-xl">
                    <div className="p-4 border-b border-gray-800 bg-[#161f32] flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2"><Package size={18}/> Fatura Kalemleri</h3>
                        <button onClick={addItem} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"><Plus size={14}/> Satır Ekle</button>
                    </div>

                    <div className="p-4 flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400 min-w-[800px]">
                            <thead className="bg-[#0f1623] text-gray-500 font-bold text-[10px] uppercase">
                                <tr>
                                    <th className="px-3 py-3 w-[30%] rounded-l-lg">Ürün / Hizmet</th>
                                    <th className="px-3 py-3 w-20 text-center">Miktar</th>
                                    <th className="px-3 py-3 w-28 text-right">Birim Fiyat</th>
                                    <th className="px-3 py-3 w-20 text-center">KDV %</th>
                                    <th className="px-3 py-3 w-20 text-center">İsk. %</th>
                                    <th className="px-3 py-3 w-32 text-right">Toplam</th>
                                    <th className="px-3 py-3 w-10 rounded-r-lg"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {items.map((item, index) => (
                                    <tr key={index} className="hover:bg-[#1F2937]/30 transition">
                                        <td className="px-2 py-2">
                                            {/* ÜRÜN SEÇİMİ (SEARCHABLE) */}
                                            <SearchableSelect 
                                                options={inventoryItems}
                                                value={item.item_id}
                                                placeholder="Ürün seçin..."
                                                onChange={(val: any) => updateItem(index, 'item_id', val)}
                                                onAddNew={(name: string) => { setNewItemName(name); setIsProductModalOpen(true); }}
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="number" className="w-full bg-transparent border-b border-gray-800 text-white py-2 text-center outline-none font-bold" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="number" className="w-full bg-transparent border-b border-gray-800 text-white py-2 text-right outline-none" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="number" className="w-full bg-transparent border-b border-gray-800 text-white py-2 text-center outline-none" value={item.tax_rate} onChange={e => updateItem(index, 'tax_rate', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="number" className="w-full bg-transparent border-b border-gray-800 text-white py-2 text-center outline-none text-red-400" value={item.discount_rate} onChange={e => updateItem(index, 'discount_rate', e.target.value)} />
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-white">
                                            ₺{item.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {items.length > 1 && (
                                                <button onClick={() => removeItem(index)} className="text-gray-600 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* HESAP ÖZETİ */}
                        <div className="mt-8 flex justify-end">
                            <div className="w-64 bg-[#0f1623] p-4 rounded-xl border border-gray-800 space-y-2">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Ara Toplam</span>
                                    <span>₺{subTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-400">
                                    <span>Toplam İskonto</span>
                                    <span>- ₺{totalDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-300">
                                    <span>Toplam KDV</span>
                                    <span>₺{totalTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between text-lg font-bold text-white">
                                    <span>GENEL TOPLAM</span>
                                    <span className={amountColor}>₺{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

         </div>

         {/* --- YENİ CARİ EKLEME MODALI --- */}
         {isContactModalOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-[#1f2937] p-6 rounded-2xl w-full max-w-sm border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Hızlı Cari Ekle</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">İsim / Ünvan</label>
                            <input type="text" className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2 text-white" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsContactModalOpen(false)} className="flex-1 bg-gray-700 py-2 rounded-lg text-white">İptal</button>
                            <button onClick={() => handleQuickCreateContact(newItemName)} className="flex-1 bg-blue-600 py-2 rounded-lg text-white font-bold">Kaydet</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         {/* --- YENİ ÜRÜN EKLEME MODALI --- */}
         {isProductModalOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-[#1f2937] p-6 rounded-2xl w-full max-w-sm border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Hızlı Ürün Ekle</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Ürün Adı</label>
                            <input type="text" className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2 text-white" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                        </div>
                        {/* Fiyat Girişi (Basitlik için) */}
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-gray-700 py-2 rounded-lg text-white">İptal</button>
                            <button onClick={() => handleQuickCreateProduct(newItemName, 0)} className="flex-1 bg-blue-600 py-2 rounded-lg text-white font-bold">Kaydet</button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">*Fiyatı listeden sonra güncelleyebilirsiniz.</p>
                    </div>
                </div>
            </div>
         )}

      </main>
    </div>
  );
}