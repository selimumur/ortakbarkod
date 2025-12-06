"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Package, Search, Save, Trash2, Ruler, Settings, Truck, Calculator, 
  X, FileSpreadsheet, Plus, Copy, Info, DollarSign, PieChart, Pencil, 
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Globe, ShoppingBag, 
  ExternalLink, ListFilter, AlertCircle, Loader2 
} from 'lucide-react';
import { supabase } from '../supabase'; 
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// =================================================================================================
// 1. TİP TANIMLAMALARI (TYPES & INTERFACES)
// =================================================================================================

type Product = {
  id: number;
  name: string;
  code: string;
  stock: number;
  price: number; // Satış Fiyatı
  cost_price: number; // Maliyet Fiyatı
  package_width: number;
  package_height: number;
  package_depth: number;
  package_weight: number;
  total_desi: number;
  description?: string;
  category?: string;
  image_url?: string;
  created_at?: string;
};

type Material = {
  id: number;
  name: string;
  category: string; // 'Levha', 'Kenar Bandı', 'Hırdavat', 'İşçilik', 'Ambalaj'
  unit: string; // 'plaka', 'm2', 'mt', 'adet', 'saat', 'takım'
  unit_price: number;
  waste_percentage: number;
  sheet_width?: number; // Plaka En (mm)
  sheet_height?: number; // Plaka Boy (mm)
  stock_quantity?: number;
};

type CutItem = {
  id?: number;
  description: string;
  width: number;
  height: number;
  quantity: number;
  material_id: number;
  band_long: number;
  band_short: number;
  band_material_id: number;
};

type ComponentItem = {
  id?: number;
  material_id: number;
  quantity: number;
};

type CostAnalysis = {
  sunta: number;
  suntaArea: number;
  bant: number;
  bantLength: number;
  hirdavat: number;
  iscilik: number;
  ambalaj: number;
  kargo: number;
  desi: number;
  genelGider: number;
  total: number;
};

type MarketplaceData = {
    id: number;
    marketplace_id: number;
    sale_price: number;
    stock_quantity: number;
    is_active: boolean;
    commission_rate: number;
    remote_sku?: string;
    marketplaces?: {
        name: string;
    }
};

// =================================================================================================
// 2. ANA COMPONENT BAŞLANGICI
// =================================================================================================

export default function ProductsPage() {
  
  // --- A. GENEL STATE'LER ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ARAMA VE FİLTRELEME
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState('all');
  
  // SAYFALAMA
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  const [stats, setStats] = useState({ 
      totalItems: 0, 
      totalStock: 0, 
      stockValue: 0, 
      criticalStock: 0,
      totalProfitPotential: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- B. EDİTÖR / MODAL STATE'LERİ ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("Kesim Listesi");
  
  // PAZARYERİ STATE'LERİ
  const [marketData, setMarketData] = useState<MarketplaceData[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);

  // --- C. VERİ HAVUZU ---
  const [materials, setMaterials] = useState<Material[]>([]);
  const [factorySettings, setFactorySettings] = useState({ overhead_percentage: 15, profit_margin: 30 });

  // --- D. EDİTÖR İÇİ GEÇİCİ VERİLER ---
  const [cuts, setCuts] = useState<CutItem[]>([]);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [packageInfo, setPackageInfo] = useState({ w: 0, h: 0, d: 0, weight: 0 });

  // --- E. MALZEME EKLEME/DÜZENLEME MODALI ---
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material>>({
      name: "", category: "Levha", unit: "plaka", unit_price: 0, waste_percentage: 0, sheet_width: 3660, sheet_height: 1830
  });

  // =================================================================================================
  // 3. VERİ ÇEKME VE BAŞLANGIÇ
  // =================================================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery !== debouncedSearch) return; 
    fetchMainData(currentPage);
  }, [currentPage, debouncedSearch, filterType]);

  useEffect(() => {
    fetchMaterials();
    fetchSettings();
  }, []);

  async function fetchMainData(page: number) {
    setLoading(true);
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    try {
        let query = supabase
            .from('master_products')
            .select('*', { count: 'exact' }) 
            .order('created_at', { ascending: false });

        if (debouncedSearch) {
           query = query.or(`name.ilike.%${debouncedSearch}%,code.ilike.%${debouncedSearch}%`);
        }

        if (filterType === 'with_recipe') query = query.gt('cost_price', 0);
        else if (filterType === 'no_recipe') query = query.eq('cost_price', 0);
        else if (filterType === 'critical_stock') query = query.lt('stock', 5);
        else if (filterType === 'in_stock') query = query.gt('stock', 0);

        const { data, error, count } = await query.range(from, to);

        if (error) {
            console.error('Veri Çekme Hatası:', error);
            toast.error("Ürün listesi yüklenirken hata oluştu.");
        } else if (data) {
            setProducts(data);
            if (count !== null) setTotalCount(count);
            calculateStats(data);
        }
    } catch (e: any) {
        toast.error("Hata: " + e.message);
    } finally {
        setLoading(false);
    }
  }

  function calculateStats(data: Product[]) {
        const totalItems = totalCount;
        const totalStock = data.reduce((acc, p) => acc + (p.stock || 0), 0);
        const stockValue = data.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);
        const criticalStock = data.filter(p => (p.stock || 0) < 5).length;
        const totalProfitPotential = data.reduce((acc, p) => {
            const profitPerItem = (p.price || 0) - (p.cost_price || 0);
            return acc + (profitPerItem * (p.stock || 0));
        }, 0);
        setStats({ totalItems, totalStock, stockValue, criticalStock, totalProfitPotential });
  }

  async function fetchMaterials() {
    const { data } = await supabase.from('materials').select('*').order('name', { ascending: true });
    if (data) setMaterials(data);
  }

  async function fetchSettings() {
      const { data } = await supabase.from('factory_settings').select('*').single();
      if(data) setFactorySettings(data);
  }

  // =================================================================================================
  // 4. EDİTÖR FONKSİYONLARI
  // =================================================================================================

  async function openManager(product: Product | null) {
    setMarketData([]);

    if (!product) {
        setSelectedProduct({ 
            id: 0, name: "", code: "", stock: 0, price: 0, cost_price: 0,
            package_width: 0, package_height: 0, package_depth: 0, package_weight: 0, total_desi: 0,
            description: "", category: "Genel"
        });
        setCuts([]);
        setComponents([]);
        setPackageInfo({ w: 0, h: 0, d: 0, weight: 0 });
        setIsEditorOpen(true);
        setActiveTab("Genel Bilgiler");
    } else {
        setSelectedProduct(product);
        setPackageInfo({
            w: product.package_width || 0,
            h: product.package_height || 0,
            d: product.package_depth || 0,
            weight: product.package_weight || 0
        });
        const loadingToast = toast.loading("Ürün verileri yükleniyor...");

        try {
            const { data: cutData } = await supabase.from('product_cuts').select('*').eq('master_product_id', product.id);
            setCuts(cutData || []);

            const { data: compData } = await supabase.from('product_components').select('*').eq('master_product_id', product.id);
            setComponents(compData || []);

            setMarketLoading(true);
            const { data: mpData } = await supabase
                .from('product_marketplaces')
                .select('*, marketplaces(name)')
                .eq('product_id', product.id);
            if (mpData && mpData.length > 0) setMarketData(mpData);
            setMarketLoading(false);
        } catch (e) { console.error(e); }

        toast.dismiss(loadingToast);
        setIsEditorOpen(true);
        setActiveTab("Kesim Listesi");
    }
  }

  // =================================================================================================
  // 5. MALİYET HESAPLAMA MOTORU
  // =================================================================================================
  
  const calculateCosts = (): CostAnalysis => {
      let suntaCost = 0, suntaArea = 0, bantCost = 0, bantLength = 0;
      let hirdavatCost = 0, iscilikCost = 0, ambalajCost = 0;

      cuts.forEach(c => {
          const sunta = materials.find(m => m.id === c.material_id);
          const bant = materials.find(m => m.id === c.band_material_id);
          const partAreaM2 = (c.width * c.height * c.quantity) / 1000000;
          suntaArea += partAreaM2;

          if (sunta) {
              let pricePerM2 = sunta.unit_price; 
              if (sunta.category === 'Levha' && sunta.sheet_width && sunta.sheet_height && (sunta.unit === 'plaka' || sunta.unit === 'adet')) {
                  const sheetAreaM2 = (sunta.sheet_width * sunta.sheet_height) / 1000000;
                  if (sheetAreaM2 > 0) pricePerM2 = sunta.unit_price / sheetAreaM2;
              }
              const wasteMultiplier = 1 + ((sunta.waste_percentage || 0) / 100);
              suntaCost += partAreaM2 * pricePerM2 * wasteMultiplier;
          }

          const len = ((c.width * (c.band_short || 0)) + (c.height * (c.band_long || 0))) * c.quantity / 1000;
          bantLength += len;
          if (bant) bantCost += len * bant.unit_price;
      });

      components.forEach(c => {
          const mat = materials.find(m => m.id === c.material_id);
          if (mat) {
              const cost = c.quantity * mat.unit_price;
              if (mat.category === 'Hırdavat') hirdavatCost += cost;
              else if (mat.category === 'İşçilik') iscilikCost += cost;
              else if (mat.category === 'Ambalaj') ambalajCost += cost;
              else hirdavatCost += cost;
          }
      });

      const desi = (packageInfo.w * packageInfo.h * packageInfo.d) / 3000;
      let kargoCost = 0;
      if (desi > 0) {
          if (desi <= 5) kargoCost = 45;
          else if (desi <= 10) kargoCost = 65;
          else if (desi <= 20) kargoCost = 90;
          else if (desi <= 30) kargoCost = 120;
          else kargoCost = desi * 6.0;
      }

      const rawTotal = suntaCost + bantCost + hirdavatCost + iscilikCost + ambalajCost;
      const genelGider = rawTotal * (factorySettings.overhead_percentage / 100);
      const totalCost = rawTotal + genelGider + kargoCost;
      return { sunta: suntaCost, suntaArea, bant: bantCost, bantLength, hirdavat: hirdavatCost, iscilik: iscilikCost, ambalaj: ambalajCost, kargo: kargoCost, desi, genelGider, total: totalCost };
  };

  const costs = calculateCosts();

  // =================================================================================================
  // 6. VERİTABANI İŞLEMLERİ
  // =================================================================================================

  async function saveAll() {
      if (!selectedProduct) return;
      const { data: existing } = await supabase.from('master_products').select('id')
          .eq('code', selectedProduct.code).neq('id', selectedProduct.id).single();
      if (existing) return toast.error("Bu Model Kodu kullanımda!");

      const productData = {
          name: selectedProduct.name,
          code: selectedProduct.code,
          price: selectedProduct.price,
          stock: selectedProduct.stock,
          cost_price: costs.total,
          total_desi: costs.desi,
          package_width: packageInfo.w,
          package_height: packageInfo.h,
          package_depth: packageInfo.d,
          package_weight: packageInfo.weight,
          description: selectedProduct.description
      };
      let productId = selectedProduct.id;

      if (productId === 0) {
          const { data: newProd, error } = await supabase.from('master_products').insert([productData]).select().single();
          if (error) return toast.error("Hata: " + error.message);
          productId = newProd.id;
      } else {
          const { error } = await supabase.from('master_products').update(productData).eq('id', productId);
          if (error) return toast.error("Hata: " + error.message);
      }

      await supabase.from('product_cuts').delete().eq('master_product_id', productId);
      if (cuts.length > 0) {
          const cleanCuts = cuts.map(c => ({
              master_product_id: productId, description: c.description,
              width: c.width, height: c.height, quantity: c.quantity,
              material_id: c.material_id, band_long: c.band_long, band_short: c.band_short,
              band_material_id: (c.band_material_id && c.band_material_id !== 0) ? c.band_material_id : null
          }));
          await supabase.from('product_cuts').insert(cleanCuts);
      }

      await supabase.from('product_components').delete().eq('master_product_id', productId);
      if (components.length > 0) {
          const cleanComps = components.map(c => ({ master_product_id: productId, material_id: c.material_id, quantity: c.quantity }));
          await supabase.from('product_components').insert(cleanComps);
      }

      toast.success("Ürün Başarıyla Kaydedildi!");
      setIsEditorOpen(false);
      fetchMainData(currentPage);
  }

  async function copyProduct(original: Product) {
      const newCode = prompt(`"${original.code}" kopyalanıyor. Yeni kod:`, `${original.code}-COPY`);
      if (!newCode || newCode === original.code) return;

      const toastId = toast.loading("Kopyalanıyor...");
      const { data: newProd, error } = await supabase.from('master_products').insert([{
          ...original, id: undefined, created_at: undefined,
          name: `${original.name} (Kopya)`, code: newCode, stock: 0
      }]).select().single();
      if (error) { toast.dismiss(toastId); return toast.error("Hata: " + error.message); }

      const newId = newProd.id;
      const { data: cuts } = await supabase.from('product_cuts').select('*').eq('master_product_id', original.id);
      if (cuts?.length) await supabase.from('product_cuts').insert(cuts.map(c => ({ ...c, id: undefined, master_product_id: newId, created_at: undefined })));
      const { data: comps } = await supabase.from('product_components').select('*').eq('master_product_id', original.id);
      if (comps?.length) await supabase.from('product_components').insert(comps.map(c => ({ ...c, id: undefined, master_product_id: newId, created_at: undefined })));
      toast.dismiss(toastId);
      toast.success("Kopyalandı!");
      fetchMainData(currentPage);
  }

  // =================================================================================================
  // 7. MALZEME & EXCEL (GÜÇLENDİRİLMİŞ VERSİYON)
  // =================================================================================================

  function openAddMaterial(category: string) {
      setEditingMaterial({ name: "", category: category, unit: category === 'Levha' ? 'plaka' : category === 'Kenar Bandı' ? 'mt' : 'adet', unit_price: 0, waste_percentage: category === 'Levha' ? 10 : 0, sheet_width: 3660, sheet_height: 1830 });
      setIsMaterialModalOpen(true);
  }
  function openEditMaterial(id: number) {
      const mat = materials.find(m => m.id === id);
      if (mat) { setEditingMaterial({ ...mat }); setIsMaterialModalOpen(true); }
  }
  async function saveMaterial() {
      if (!editingMaterial.name) return toast.error("İsim giriniz");
      const { id, ...data } = editingMaterial as Material;
      if (id) { await supabase.from('materials').update(data).eq('id', id); toast.success("Güncellendi"); }
      else { await supabase.from('materials').insert([data]); toast.success("Eklendi"); }
      setIsMaterialModalOpen(false); fetchMaterials();
  }

  // --- GELİŞMİŞ EXCEL YÜKLEME ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    // Güvenli okuma için ArrayBuffer
    reader.readAsArrayBuffer(file);

    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Ham veriyi JSON olarak al
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
            toast.error("Excel dosyası boş.");
            return;
        }

        const loadingToast = toast.loading(`${rawData.length} satır analiz ediliyor...`);
        let processedProducts: any[] = [];

        // Başlıkları standart hale getir (boşlukları sil, küçük harf yap)
        const normalizeKey = (key: string) => key.toLowerCase().replace(/\s/g, '').replace(/['"().]/g, '');

        rawData.forEach((row: any) => {
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
                normalizedRow[normalizeKey(key)] = row[key];
            });

            // Fiyatı temizle (TL yazısı vb. varsa kaldır)
            const parsePrice = (val: any) => {
                if (!val) return 0;
                if (typeof val === 'number') return val;
                return parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            };

            // Eşleştirmeler (Trendyol Excel Formatına Göre)
            const pName = normalizedRow['ürünadı'] || normalizedRow['name'] || normalizedRow['urunadi'];
            const pCode = normalizedRow['barkod'] || normalizedRow['modelkodu'] || normalizedRow['code'] || normalizedRow['tedarikçistokkodu'];
            
            // Ürün adı veya barkodu olmayan satırları atla
            if (!pName && !pCode) return;

            const product = {
                name: pName || "İsimsiz Ürün",
                code: String(pCode || `AUTO-${Math.random().toString(36).substr(2, 9)}`),
                price: parsePrice(normalizedRow['trendyoldasatılacakfiyatkdvdahil'] || normalizedRow['piyasasatışfiyatıkdvdahil'] || normalizedRow['satışfiyatı'] || row['price']),
                stock: Number(normalizedRow['ürünstokadedi'] || normalizedRow['stok']) || 0,
                description: normalizedRow['ürünaçıklaması'] || normalizedRow['description'] || "",
                total_desi: Number(normalizedRow['desi']) || 1,
                // Diğer alanlar varsa buraya eklenebilir
            };
            
            processedProducts.push(product);
        });

        // BATCH INSERT (50'şerli paketler halinde gönder)
        const BATCH_SIZE = 50;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < processedProducts.length; i += BATCH_SIZE) {
            const batch = processedProducts.slice(i, i + BATCH_SIZE);
            
            // master_products tablosuna upsert yap (varsa güncelle, yoksa ekle)
            const { error } = await supabase.from('master_products').upsert(batch, { onConflict: 'code' });
            
            if (error) {
                console.error("Batch Hatası:", error);
                failCount += batch.length;
            } else {
                successCount += batch.length;
            }
            
            toast.loading(`${Math.min(i + BATCH_SIZE, processedProducts.length)} / ${processedProducts.length} işlendi...`, { id: loadingToast });
        }

        toast.dismiss(loadingToast);
        toast.success(`${successCount} ürün yüklendi/güncellendi.`);
        if (failCount > 0) toast.warning(`${failCount} ürün yüklenemedi.`);
        
        // Inputu temizle ve listeyi yenile
        if(fileInputRef.current) fileInputRef.current.value = "";
        fetchMainData(currentPage);

      } catch (error: any) {
        console.error("Excel İşleme Hatası:", error);
        toast.error(`Hata: ${error.message}`);
      }
    };
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // =================================================================================================
  // RENDER
  // =================================================================================================
  return (
    <div className="flex h-screen bg-[#0B1120] text-gray-200 font-sans overflow-hidden">
        
        {/* SOL PANEL: LİSTE */}
        <main className="flex-1 flex flex-col h-full relative">
            <header className="p-6 border-b border-gray-800 bg-[#111827] flex justify-between items-center shrink-0">
                <div>
                     <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Package className="text-blue-500" /> Ürün & Üretim Yönetimi
                    </h1>
                    <p className="text-gray-500 text-sm">Toplam <span className="text-blue-400 font-bold">{totalCount}</span> ürün. Sayfa {currentPage} / {totalPages || 1}</p>
                 </div>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls,.csv" onChange={handleFileUpload}/>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg">
                        <FileSpreadsheet size={16}/> Excel Yükle
                    </button>
                    <button onClick={() => openManager(null)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/20">
                         <Plus size={16}/> Yeni Ürün Ekle
                    </button>
                </div>
            </header>
            
            {/* İSTATİSTİK BAR */}
            <div className="px-6 pt-4 grid grid-cols-4 gap-4 shrink-0">
                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase">Toplam Kayıt</span>
                    <span className="text-2xl font-bold text-white mt-1">{stats.totalItems}</span>
                </div>
                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase">Toplam Stok</span>
                    <span className="text-2xl font-bold text-blue-400 mt-1">{stats.totalStock}</span>
                </div>
                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase">Stok Değeri</span>
                    <span className="text-2xl font-bold text-green-500 mt-1">₺{stats.stockValue.toLocaleString()}</span>
                </div>
                <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase">Kritik Stok</span>
                    <span className="text-2xl font-bold text-red-500 mt-1">{stats.criticalStock}</span>
                </div>
            </div>

            {/* FİLTRE & ARAMA ALANI */}
            <div className="px-6 mt-4 flex gap-3 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-500" size={18}/>
                    <input type="text" placeholder="Ürün Ara (İsim veya Model Kodu)..." 
                       className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-2.5 pl-10 text-white outline-none focus:border-blue-500 transition"
                       value={searchQuery} onChange={e=> { setSearchQuery(e.target.value); setCurrentPage(1); }}/>
                </div>
                <div className="relative w-64">
                    <ListFilter className="absolute left-3 top-3 text-gray-500" size={18}/>
                    <select className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-2.5 pl-10 text-white outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}>
                        <option value="all">Tüm Ürünler</option>
                        <option value="with_recipe">✅ Reçetesi Girilmiş</option>
                        <option value="no_recipe">⚠️ Reçetesi Eksik</option>
                        <option value="in_stock">📦 Stokta Olanlar</option>
                        <option value="critical_stock">🚨 Kritik Stok (&lt;5)</option>
                    </select>
                </div>
            </div>

            {/* TABLO */}
            <div className="flex-1 overflow-hidden flex flex-col p-6">
                <div className="bg-[#111827] rounded-xl border border-gray-800 flex-1 overflow-auto shadow-xl relative">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#1F2937] text-gray-200 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4">Ürün Bilgisi</th>
                                <th className="p-4">Stok</th>
                                <th className="p-4">Satış Fiyatı</th>
                                <th className="p-4">Maliyet</th>
                                <th className="p-4 text-center">Durum</th>
                                <th className="p-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : products.map(p => {
                                const profit = p.price - (p.cost_price || 0);
                                const profitMargin = p.price > 0 ? (profit / p.price) * 100 : 0;
                                const hasRecipe = p.cost_price > 0;
                                return (
                                    <tr key={p.id} className="hover:bg-gray-800/50 group transition">
                                        <td className="p-4">
                                           <div className="font-bold text-white text-base">{p.name}</div>
                                           <div className="text-xs text-blue-400 font-mono mt-1 bg-blue-500/10 px-2 py-0.5 rounded w-fit">{p.code}</div>
                                        </td>
                                        <td className="p-4"><span className={`font-bold ${p.stock < 5 ? 'text-red-500' : 'text-green-500'}`}>{p.stock} Adet</span></td>
                                        <td className="p-4 font-bold text-white">₺{p.price.toLocaleString()}</td>
                                        <td className="p-4 font-mono text-orange-400">₺{(p.cost_price || 0).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${hasRecipe ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                                                    {hasRecipe ? 'Reçete Var' : 'Reçete Yok'}
                                                </span>
                                                <span className="text-[10px] text-gray-500">Marj: %{profitMargin.toFixed(0)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={()=>copyProduct(p)} className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition" title="Kopyala"><Copy size={16}/></button>
                                                <button onClick={()=>openManager(p)} className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
                                                    <Settings size={14}/> Yönet
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* SAYFALAMA */}
                <div className="flex justify-between items-center mt-4 bg-[#111827] p-3 rounded-xl border border-gray-800 shrink-0">
                    <span className="text-sm text-gray-500">Sayfa {currentPage} / {totalPages || 1} (Toplam {totalCount})</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50 text-white"><ChevronLeft size={18}/></button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pNum = i + 1;
                            if (currentPage > 3 && totalPages > 5) pNum = currentPage - 2 + i;
                            if (pNum > totalPages) return null;
                            return (
                                <button key={pNum} onClick={() => setCurrentPage(pNum)} 
                                    className={`w-8 h-8 rounded font-bold text-sm ${currentPage === pNum ? 'bg-blue-600 text-white' : 'border border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                    {pNum}
                                </button>
                            )
                        })}
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50 text-white"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>
        </main>

        {/* =================================================================================================
            SAĞ PANEL: EDİTÖR MODALI
           ================================================================================================= */}
        {isEditorOpen && selectedProduct && (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#111827] w-full max-w-[95vw] h-[95vh] rounded-2xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
                    
                    {/* MODAL HEADER */}
                    <div className="h-16 border-b border-gray-700 bg-[#1F2937] flex justify-between items-center px-6 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-2 rounded-lg text-white"><Package size={20}/></div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{selectedProduct.id === 0 ? "YENİ ÜRÜN OLUŞTUR" : selectedProduct.name}</h2>
                                <div className="flex gap-4 text-xs text-gray-400 mt-0.5">
                                    <span className="font-mono bg-gray-800 px-1.5 rounded">{selectedProduct.code}</span>
                                    <span className="text-orange-400 flex items-center gap-1"><Calculator size={12}/> Canlı Maliyet: ₺{costs.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={()=>setIsEditorOpen(false)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition"><X size={20}/></button>
                    </div>

                    {/* MODAL BODY */}
                    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                        <div className="flex-1 border-r border-gray-700 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-[#0B1120]">
                            <div className="flex gap-2 mb-6 border-b border-gray-700 pb-1 shrink-0">
                                {["Genel Bilgiler", "Kesim Listesi", "Hırdavat & İşçilik", "Maliyet Analizi"].map(tab => (
                                    <button key={tab} onClick={()=>setActiveTab(tab)} 
                                        className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeTab===tab ? 'border-blue-500 text-blue-400 bg-blue-500/5':'border-transparent text-gray-400 hover:text-white'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* 1. GENEL BİLGİLER */}
                            {activeTab === "Genel Bilgiler" && (
                                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400 font-bold block mb-1">Ürün Adı</label>
                                            <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition"
                                                value={selectedProduct.name} onChange={e=>setSelectedProduct({...selectedProduct!, name: e.target.value})}/>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 font-bold block mb-1">Model Kodu</label>
                                            <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white font-mono focus:border-blue-500 outline-none transition"
                                                value={selectedProduct.code} onChange={e=>setSelectedProduct({...selectedProduct!, code: e.target.value})}/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400 font-bold block mb-1">Satış Fiyatı (Ana)</label>
                                            <div className="relative">
                                                <DollarSign size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                                                <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 pl-10 text-white font-bold focus:border-blue-500 outline-none transition"
                                                    value={selectedProduct.price} onChange={e=>setSelectedProduct({...selectedProduct!, price: Number(e.target.value)})}/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 font-bold block mb-1">Stok Adedi</label>
                                            <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition"
                                                value={selectedProduct.stock} onChange={e=>setSelectedProduct({...selectedProduct!, stock: Number(e.target.value)})}/>
                                        </div>
                                    </div>
                                    
                                    {/* GENİŞLETİLMİŞ AÇIKLAMA ALANI */}
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold block mb-1">Ürün Açıklaması</label>
                                        <textarea rows={10} className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none transition min-h-[150px]"
                                            value={selectedProduct.description || ""} onChange={e => setSelectedProduct({...selectedProduct!, description: e.target.value})} 
                                            placeholder="Ürün özelliklerini detaylı bir şekilde buraya girebilirsiniz..."/>
                                    </div>

                                    {/* PAZARYERİ DURUMU */}
                                    <div className="pt-6 border-t border-gray-800">
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Globe size={18} className="text-blue-500"/> Pazaryeri Entegrasyon Durumu
                                        </h3>
                                        {marketLoading ? <div className="text-gray-500 text-sm">Yükleniyor...</div> : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {marketData.length > 0 ? marketData.map(mp => (
                                                    <div key={mp.id} className="bg-[#1F2937] border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-600 transition">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                                                                <ShoppingBag size={18} className="text-black"/>
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{mp.marketplaces?.name || 'Pazaryeri'}</p>
                                                                <div className="flex gap-2 text-[10px] mt-1">
                                                                    <span className="text-gray-400 bg-gray-800 px-1 rounded">SKU: {mp.remote_sku || '-'}</span>
                                                                    <span className={mp.is_active ? "text-green-400" : "text-red-400"}>{mp.is_active ? "Yayında" : "Pasif"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Satış Fiyatı</p>
                                                                <p className="text-white font-bold">₺{mp.sale_price.toLocaleString()}</p>
                                                            </div>
                                                            <div className="bg-gray-800 px-3 py-1 rounded text-center min-w-[60px]">
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Stok</p>
                                                                <p className="text-white font-bold">{mp.stock_quantity}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="p-4 bg-gray-800/30 border border-gray-700 rounded-xl text-center">
                                                        <div className="text-orange-400 font-bold text-sm mb-1 flex items-center justify-center gap-2">
                                                            <AlertCircle size={16}/> Bağlantı Bulunamadı
                                                        </div>
                                                        <p className="text-gray-500 text-xs">
                                                            Bu ürün WooCommerce veya diğer pazaryerleri ile eşleşmiş görünmüyor.
                                                            Eğer ürün import edildiyse, entegrasyon servisleri henüz çalışmamış olabilir.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2. KESİM LİSTESİ */}
                            {activeTab === "Kesim Listesi" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700">
                                        <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide"><Ruler size={16} className="text-orange-500"/> Parça Ekle</h3>
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-3">
                                                <label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">Parça Adı</label>
                                                <input id="cutDesc" placeholder="Örn: Yan Dikme" className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs focus:border-orange-500 outline-none"/>
                                            </div>
                                            <div className="col-span-1"><label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">Boy</label><input type="number" id="cutH" className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-orange-500 outline-none"/></div>
                                            <div className="col-span-1"><label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">En</label><input type="number" id="cutW" className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-orange-500 outline-none"/></div>
                                            <div className="col-span-1"><label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">Adet</label><input type="number" id="cutQ" defaultValue={1} className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-orange-500 outline-none"/></div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">Sunta Seçimi</label>
                                                <div className="flex gap-1">
                                                    <select id="cutMat" className="w-full bg-[#0B1120] border border-gray-600 rounded-l p-2 text-white text-xs outline-none focus:border-orange-500">
                                                        <option value="">Seçiniz...</option>
                                                        {materials.filter(m=>m.category==='Levha').map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                                                    </select>
                                                    <button onClick={()=>openAddMaterial('Levha')} className="bg-green-700 px-2 text-white text-xs hover:bg-green-600 transition" title="Yeni Ekle">+</button>
                                                    <button onClick={() => { const s=Number((document.getElementById('cutMat') as HTMLSelectElement).value); if(s)openEditMaterial(s); }} className="bg-yellow-600 px-2 rounded-r text-white text-xs hover:bg-yellow-500 transition"><Pencil size={12}/></button>
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">Bant (U/K)</label>
                                                <div className="flex gap-1">
                                                    <input id="bL" placeholder="0" className="w-1/2 bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-orange-500 outline-none"/>
                                                    <input id="bS" placeholder="0" className="w-1/2 bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-orange-500 outline-none"/>
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <button onClick={()=>{
                                                    const desc = (document.getElementById('cutDesc') as HTMLInputElement).value;
                                                    const h = Number((document.getElementById('cutH') as HTMLInputElement).value);
                                                    const w = Number((document.getElementById('cutW') as HTMLInputElement).value);
                                                    const q = Number((document.getElementById('cutQ') as HTMLInputElement).value);
                                                    const mid = Number((document.getElementById('cutMat') as HTMLSelectElement).value);
                                                    const bl = Number((document.getElementById('bL') as HTMLInputElement).value);
                                                    const bs = Number((document.getElementById('bS') as HTMLInputElement).value);
                                                    const defaultBand = (bl>0 || bs>0) ? (materials.find(m=>m.category==='Kenar Bandı')?.id || 0) : 0;
                                                    if(!desc || !h || !w || !mid) return toast.error("Eksik bilgi!");
                                                    setCuts([...cuts, { description: desc, width: w, height: h, quantity: q, material_id: mid, band_long: bl, band_short: bs, band_material_id: defaultBand }]);
                                                    (document.getElementById('cutDesc') as HTMLInputElement).value = "";
                                                }} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded text-xs shadow-lg transition">EKLE</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                                        <table className="w-full text-xs text-left text-gray-400">
                                            <thead className="bg-[#1F2937] text-gray-200 uppercase font-bold"><tr><th className="p-3">Parça</th><th className="p-3">Ebat</th><th className="p-3">Adet</th><th className="p-3">Levha</th><th className="p-3">Net Alan</th><th className="p-3">Bant</th><th className="p-3 text-right">Sil</th></tr></thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {cuts.map((c,i)=>(
                                                    <tr key={i} className="hover:bg-gray-800/50 transition">
                                                        <td className="p-3 text-white font-medium">{c.description}</td><td className="p-3 font-mono">{c.height} x {c.width}</td><td className="p-3 text-white">{c.quantity}</td>
                                                        <td className="p-3 text-gray-500 truncate max-w-[120px]">{materials.find(m=>m.id===c.material_id)?.name}</td>
                                                        <td className="p-3 text-blue-400 font-mono font-bold">{((c.width*c.height*c.quantity)/1000000).toFixed(3)} m²</td>
                                                        <td className="p-3 text-orange-400 font-mono">{(((c.width*c.band_short)+(c.height*c.band_long))*c.quantity/1000).toFixed(2)} mt</td>
                                                        <td className="p-3 text-right"><button onClick={()=>setCuts(cuts.filter((_,x)=>x!==i))} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition"><Trash2 size={14}/></button></td>
                                                    </tr>
                                                ))}
                                                {cuts.length===0 && <tr><td colSpan={7} className="p-8 text-center text-gray-600">Henüz parça girilmedi.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex gap-4 text-xs text-gray-400 bg-gray-800/30 p-3 rounded-lg border border-gray-700"><span>Toplam Levha Alanı: <b className="text-white">{costs.suntaArea.toFixed(3)} m²</b></span><span>Toplam Bant Metrajı: <b className="text-white">{costs.bantLength.toFixed(2)} mt</b></span></div>
                                </div>
                            )}

                            {/* 3. HIRDAVAT & İŞÇİLİK */}
                            {activeTab === "Hırdavat & İşçilik" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700">
                                        <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide"><Settings size={16} className="text-green-500"/> Diğer Giderler</h3>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex gap-1">
                                                <select id="compS" className="w-full bg-[#0B1120] border border-gray-600 rounded-l p-2 text-white text-xs outline-none focus:border-green-500">
                                                    <option value="">Seçiniz...</option>{materials.filter(m=>!['Levha','Kenar Bandı'].includes(m.category)).map(m=>(<option key={m.id} value={m.id}>{m.name} ({m.category}) - {m.unit_price}₺</option>))}
                                                </select>
                                                <button onClick={()=>openAddMaterial('Hırdavat')} className="bg-green-700 px-3 text-white text-xs hover:bg-green-600 transition" title="Yeni Ekle">+</button>
                                                <button onClick={()=>{const s=Number((document.getElementById('compS') as HTMLSelectElement).value); if(s)openEditMaterial(s);}} className="bg-yellow-600 px-3 rounded-r text-white text-xs hover:bg-yellow-500 transition"><Pencil size={12}/></button>
                                            </div>
                                            <input type="number" id="compQ" placeholder="Miktar" className="w-24 bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-green-500 outline-none"/>
                                            <button onClick={()=>{
                                                const m=Number((document.getElementById('compS') as HTMLSelectElement).value), q=Number((document.getElementById('compQ') as HTMLInputElement).value);
                                                if(!m||!q) return toast.error("Seçim yapınız");
                                                setComponents([...components, { material_id: m, quantity: q }]);
                                            }} className="bg-green-600 hover:bg-green-500 text-white px-6 rounded text-xs font-bold shadow-lg transition">EKLE</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {components.map((c,i)=>{
                                            const mat = materials.find(m=>m.id===c.material_id);
                                            return (<div key={i} className="flex justify-between items-center bg-[#111827] p-3 rounded-xl border border-gray-800 shadow-sm hover:border-gray-600 transition"><div><div className="text-white font-bold text-sm">{mat?.name}</div><div className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded w-fit mt-1">{mat?.category}</div></div><div className="flex items-center gap-4"><div className="text-right"><div className="text-white font-mono text-sm font-bold">{c.quantity} {mat?.unit}</div><div className="text-green-400 font-mono text-xs">₺{(c.quantity * (mat?.unit_price||0)).toFixed(2)}</div></div><button onClick={()=>setComponents(components.filter((_,x)=>x!==i))} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition"><Trash2 size={16}/></button></div></div>)
                                        })}
                                        {components.length===0 && <div className="col-span-2 text-center py-10 text-gray-600 bg-gray-800/20 rounded-xl border border-gray-800/50">Eklenmiş malzeme yok.</div>}
                                    </div>
                                </div>
                            )}

                            {/* 4. MALİYET ANALİZİ */}
                            {activeTab === "Maliyet Analizi" && (
                                <div className="h-full flex items-center justify-center p-10 animate-in fade-in zoom-in duration-300">
                                    <div className="w-full max-w-md bg-[#111827] border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                        <h3 className="text-2xl font-bold text-white text-center mb-8 flex items-center justify-center gap-2"><PieChart size={24} className="text-purple-500"/> Maliyet Raporu</h3>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex justify-between items-center group"><span className="text-gray-400 group-hover:text-white transition">Sunta & Levha</span><span className="text-white font-mono font-bold">₺{costs.sunta.toFixed(2)}</span></div>
                                            <div className="flex justify-between items-center group"><span className="text-gray-400 group-hover:text-white transition">Kenar Bandı</span><span className="text-white font-mono font-bold">₺{costs.bant.toFixed(2)}</span></div>
                                            <div className="flex justify-between items-center group"><span className="text-gray-400 group-hover:text-white transition">Hırdavat & Aksesuar</span><span className="text-white font-mono font-bold">₺{costs.hirdavat.toFixed(2)}</span></div>
                                            <div className="flex justify-between items-center group"><span className="text-gray-400 group-hover:text-white transition">İşçilik Giderleri</span><span className="text-white font-mono font-bold">₺{costs.iscilik.toFixed(2)}</span></div>
                                            <div className="flex justify-between items-center group"><span className="text-gray-400 group-hover:text-white transition">Ambalaj & Kargo</span><span className="text-white font-mono font-bold">₺{(costs.ambalaj + costs.kargo).toFixed(2)}</span></div>
                                            <div className="h-px bg-gray-700 my-6"></div>
                                            <div className="flex justify-between items-center text-lg"><span className="font-bold text-white">TOPLAM MALİYET</span><span className="font-bold text-red-500 font-mono text-2xl">₺{costs.total.toFixed(2)}</span></div>
                                            <div className="mt-6 p-4 rounded-xl flex justify-between items-center font-bold shadow-inner bg-gray-800/50 border border-gray-700"><span className="uppercase tracking-wider text-xs text-gray-400">NET KÂR</span><span className={`text-xl font-mono ${selectedProduct.price - costs.total > 0 ? 'text-green-400' : 'text-red-400'}`}>₺{(selectedProduct.price - costs.total).toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SAĞ KOLON: ÖZET */}
                        <div className="w-full lg:w-[350px] bg-[#161f32] border-l border-gray-700 flex flex-col p-6 overflow-y-auto shrink-0">
                            <div className="mb-8">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 tracking-wide"><Truck size={14}/> Koli Ebatları (cm)</h4>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div><label className="text-[9px] text-gray-500 block mb-1">En</label><input type="number" className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-blue-500 outline-none" value={packageInfo.w} onChange={e=>setPackageInfo({...packageInfo, w: Number(e.target.value)})}/></div>
                                    <div><label className="text-[9px] text-gray-500 block mb-1">Boy</label><input type="number" className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-blue-500 outline-none" value={packageInfo.h} onChange={e=>setPackageInfo({...packageInfo, h: Number(e.target.value)})}/></div>
                                    <div><label className="text-[9px] text-gray-500 block mb-1">Yük.</label><input type="number" className="w-full bg-[#0B1120] border border-gray-600 rounded p-2 text-white text-xs text-center focus:border-blue-500 outline-none" value={packageInfo.d} onChange={e=>setPackageInfo({...packageInfo, d: Number(e.target.value)})}/></div>
                                </div>
                                <div className="bg-[#0B1120] p-3 rounded-lg border border-gray-700 flex justify-between text-xs items-center">
                                    <span className="text-gray-400 font-bold">Toplam Desi:</span><span className="text-blue-400 font-mono font-bold text-sm bg-blue-900/20 px-2 py-0.5 rounded">{costs.desi.toFixed(2)} Ds</span>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <div className="bg-[#0B1120] p-5 rounded-xl border border-gray-700 shadow-inner">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wide">Hızlı Özet</h4>
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between"><span className="text-gray-500">Hammadde</span><span className="text-white font-mono">₺{(costs.sunta+costs.bant).toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Ek Giderler</span><span className="text-white font-mono">₺{(costs.hirdavat+costs.iscilik+costs.ambalaj).toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Kargo</span><span className="text-white font-mono">₺{costs.kargo.toFixed(2)}</span></div>
                                        <div className="border-t border-gray-700 my-2 pt-3 flex justify-between text-sm font-bold items-center"><span className="text-white">TOPLAM</span><span className="text-red-500 font-mono text-lg">₺{costs.total.toFixed(2)}</span></div>
                                    </div>
                                    <button onClick={saveAll} className="w-full mt-5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition transform hover:scale-[1.02]">
                                        <Save size={18}/> KAYDET VE BİTİR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MALZEME MODALI */}
        {isMaterialModalOpen && (
            <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#1F2937] p-6 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold text-lg mb-4">{editingMaterial.id ? 'Malzeme Düzenle' : 'Yeni Malzeme Ekle'}</h3>
                        <button onClick={()=>setIsMaterialModalOpen(false)}><X size={20} className="text-gray-400 hover:text-white transition"/></button>
                    </div>
                    <div className="space-y-4">
                        <div><label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Malzeme Adı</label><input type="text" placeholder="Örn: 18mm Beyaz Sunta" className="w-full bg-[#0B1120] border border-gray-600 rounded-lg p-3 text-white text-sm focus:border-green-500 outline-none transition" value={editingMaterial.name} onChange={e=>setEditingMaterial({...editingMaterial, name: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Kategori</label><select className="w-full bg-[#0B1120] border border-gray-600 rounded-lg p-3 text-white text-sm outline-none transition" value={editingMaterial.category} onChange={e=>setEditingMaterial({...editingMaterial, category: e.target.value, unit: e.target.value==='Levha'?'plaka':e.target.value==='Kenar Bandı'?'mt':'adet'})}><option>Levha</option><option>Kenar Bandı</option><option>Hırdavat</option><option>İşçilik</option><option>Ambalaj</option></select></div>
                            <div><label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Birim</label><input type="text" className="w-full bg-[#0B1120] border border-gray-600 rounded-lg p-3 text-white text-sm text-center focus:border-green-500 outline-none transition" value={editingMaterial.unit} onChange={e=>setEditingMaterial({...editingMaterial, unit: e.target.value})}/></div>
                        </div>
                        {editingMaterial.category === 'Levha' && (
                            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 animate-in slide-in-from-top-2">
                                <label className="text-[10px] text-orange-400 font-bold uppercase block mb-2 flex items-center gap-1"><Ruler size={10}/> Plaka Ebatları (mm)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><span className="text-[9px] text-gray-500 block mb-1">Boy (mm)</span><input type="number" className="w-full bg-[#0B1120] rounded p-2 text-white text-sm focus:border-orange-500 outline-none transition" value={editingMaterial.sheet_width} onChange={e=>setEditingMaterial({...editingMaterial, sheet_width: Number(e.target.value)})}/></div>
                                    <div><span className="text-[9px] text-gray-500 block mb-1">En (mm)</span><input type="number" className="w-full bg-[#0B1120] rounded p-2 text-white text-sm focus:border-orange-500 outline-none transition" value={editingMaterial.sheet_height} onChange={e=>setEditingMaterial({...editingMaterial, sheet_height: Number(e.target.value)})}/></div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Birim Fiyat (₺)</label>
                            <div className="relative"><input type="number" placeholder="0.00" className="w-full bg-[#0B1120] border border-gray-600 rounded-lg p-3 pl-8 text-white text-lg font-bold focus:border-green-500 outline-none transition" value={editingMaterial.unit_price} onChange={e=>setEditingMaterial({...editingMaterial, unit_price: Number(e.target.value)})}/><span className="absolute left-3 top-4 text-gray-500">₺</span></div>
                            <p className="text-[10px] text-gray-500 mt-1 text-right italic">{editingMaterial.category === 'Levha' ? '* Plaka Fiyatı giriniz' : '* Adet/Metre Fiyatı giriniz'}</p>
                        </div>
                        <button onClick={saveMaterial} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl mt-2 transition transform hover:scale-[1.02] shadow-lg shadow-green-900/30">{editingMaterial.id ? 'GÜNCELLE' : 'KAYDET'}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}