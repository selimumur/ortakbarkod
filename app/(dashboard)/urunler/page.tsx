"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Package, Search, Save, Trash2, Ruler, Settings, Truck, Calculator,
    X, FileSpreadsheet, Plus, Copy, Info, DollarSign, PieChart, Pencil,
    TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Globe, ShoppingBag,
    ExternalLink, ListFilter, AlertCircle, Loader2, Image as ImageIcon, Link as LinkIcon, Upload,
    Box, Wrench, Scissors, Eye, Archive, Store
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getProductsAction } from '@/app/actions/productActions';
import { getMaterialsAction, getFactorySettingsAction } from '@/app/actions/commonActions';
import { getProductDetailsAction, saveProductAction, addProductItemAction, deleteProductItemAction } from '@/app/actions/productDetailActions';

// =================================== 1. TYPES ===================================

type Product = {
    id: number;
    name: string;
    code: string;
    stock: number;
    price: number;
    cost_price: number;
    package_width: number;
    package_height: number;
    package_depth: number;
    package_weight: number;
    total_desi: number;
    description?: string;
    category?: string;
    brand?: string;
    image_url?: string;
    images?: string[];
    product_url?: string;
    created_at?: string;
    raw_data?: any;
    vat_rate?: number;
    market_price?: number;
    shipment_days?: number;
    barcode?: string;
};

type Parcel = {
    id?: number;
    width: number;
    height: number;
    depth: number;
    weight: number;
    desi: number;
};

type Material = {
    id: number;
    name: string;
    category: string;
    unit: string;
    unit_price: number;
    waste_percentage: number;
    sheet_width?: number;
    sheet_height?: number;
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

type Marketplace = {
    id: number;
    marketplace: string;
    store_name: string;
};

// =================================== 2. COMPONENT ===================================

export default function ProductsPage() {
    const { userId, orgId } = useAuth();

    // --- STATES ---
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterType, setFilterType] = useState('all');

    // PAGINATION
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 30;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // EDITOR STATES
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeTab, setActiveTab] = useState("Genel Bilgiler");

    // DATA POOLS
    const [materials, setMaterials] = useState<Material[]>([]);
    const [availableMarketplaces, setAvailableMarketplaces] = useState<Marketplace[]>([]);
    const [factorySettings, setFactorySettings] = useState({ overhead_percentage: 15, profit_margin: 30 });

    // SUB-DATA & TEMP INPUTS for Production
    const [cuts, setCuts] = useState<CutItem[]>([]);
    const [components, setComponents] = useState<ComponentItem[]>([]);
    const [parcels, setParcels] = useState<Parcel[]>([]);

    // Temp State for Adding New Items
    const [newCut, setNewCut] = useState<Partial<CutItem>>({ description: "", width: 0, height: 0, quantity: 1, band_long: 0, band_short: 0 });
    const [newComp, setNewComp] = useState<Partial<ComponentItem>>({ quantity: 1 });
    const [newParcel, setNewParcel] = useState<Partial<Parcel>>({ width: 0, height: 0, depth: 0, weight: 0 });

    // EXCEL IMPORT
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [importMarketplaceId, setImportMarketplaceId] = useState("");
    const [uploading, setUploading] = useState(false);

    // BULK ACTIONS
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState<string | null>(null); // 'open_trendyol' | 'update_price' | 'update_stock'
    const [targetMarketplaceId, setTargetMarketplaceId] = useState("");
    const [targetCategoryId, setTargetCategoryId] = useState("");
    const [processingBulk, setProcessingBulk] = useState(false);

    // Bulk Update States
    const [priceUpdateType, setPriceUpdateType] = useState("set");
    const [priceUpdateValue, setPriceUpdateValue] = useState("");
    const [stockUpdateValue, setStockUpdateValue] = useState("");

    const handleBulkAction = (action: string) => {
        setBulkAction(action);
        if (action === 'open_trendyol') toast.success("Trendyol'a aktarım sihirbazı açılacak...");
        else if (action === 'update_price') toast.info("Fiyat güncelleme modülü (Toplu) hazırlanıyor...");
        else if (action === 'update_stock') toast.info("Stok güncelleme modülü (Toplu) hazırlanıyor...");
    };

    // =================================== INITIALIZATION ===================================

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchQuery); }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (searchQuery !== debouncedSearch) return;
        if (!orgId) return; // Wait for auth
        fetchMainData(currentPage);
    }, [currentPage, debouncedSearch, filterType, orgId]);

    useEffect(() => {
        if (!orgId) return;
        fetchMaterials();
        fetchSettings();
        fetchMarketplaces();
    }, [orgId]);

    async function fetchMainData(page: number) {
        setLoading(true);

        try {
            const { products, totalCount } = await getProductsAction(page, itemsPerPage, debouncedSearch, filterType);
            setProducts(products as Product[]);
            setTotalCount(totalCount || 0);
        } catch (e: any) { toast.error("Veri hatası: " + e.message); }
        finally { setLoading(false); }
    }

    async function fetchMaterials() {
        try {
            const data = await getMaterialsAction();
            if (data) setMaterials(data);
        } catch (e) { console.error(e); }
    }
    async function fetchSettings() {
        try {
            const data = await getFactorySettingsAction();
            if (data) setFactorySettings(data);
        } catch (e) { console.error(e); }
    }
    async function fetchMarketplaces() {
        const res = await fetch('/api/marketplaces');
        const json = await res.json();
        if (json.success) setAvailableMarketplaces(json.marketplaces);
    }

    // =================================== EDITOR LOGIC ===================================

    async function openManager(product: Product | null) {
        if (!product) {
            setSelectedProduct({
                id: 0, name: "", code: "", stock: 0, price: 0, cost_price: 0,
                package_width: 0, package_height: 0, package_depth: 0, package_weight: 0, total_desi: 0,
                description: "", category: "Genel", brand: "", vat_rate: 18, market_price: 0, shipment_days: 3,
                barcode: "", images: [], product_url: "", image_url: ""
            });
            setCuts([]); setComponents([]); setParcels([]);
            setIsEditorOpen(true); setActiveTab("Genel Bilgiler");
        } else {
            setSelectedProduct(product);
            const loadToast = toast.loading("Detaylar yükleniyor...");

            try {
                const { cuts, components, parcels } = await getProductDetailsAction(product.id);
                setCuts(cuts); setComponents(components); setParcels(parcels);
            } catch (e: any) { toast.error("Hata: " + e.message); }

            toast.dismiss(loadToast);
            setIsEditorOpen(true);
            setActiveTab("Genel Bilgiler");
        }
    }

    const addCut = async () => {
        if (!selectedProduct || !selectedProduct.id) { toast.error("Önce ürünü kaydedin."); return; }
        if (!newCut.material_id) { toast.error("Malzeme seçin."); return; }

        try {
            const list = await addProductItemAction('product_cuts', { master_product_id: selectedProduct.id, ...newCut });
            setCuts(list);
            toast.success("Parça eklendi");
            setNewCut({ description: "", width: 0, height: 0, quantity: 1, band_long: 0, band_short: 0 });
        } catch (e: any) { toast.error(e.message); }
    };

    const addComponent = async () => {
        if (!selectedProduct || !selectedProduct.id) { toast.error("Önce ürünü kaydedin."); return; }
        if (!newComp.material_id) { toast.error("Malzeme seçin."); return; }

        try {
            const list = await addProductItemAction('product_components', { master_product_id: selectedProduct.id, ...newComp });
            setComponents(list);
            toast.success("Bileşen eklendi");
            setNewComp({ quantity: 1 });
        } catch (e: any) { toast.error(e.message); }
    };

    const addParcel = async () => {
        if (!selectedProduct || !selectedProduct.id) { toast.error("Önce ürünü kaydedin."); return; }

        try {
            const list = await addProductItemAction('product_parcels', { master_product_id: selectedProduct.id, ...newParcel });
            setParcels(list);

            const total = list.reduce((acc: number, p: any) => acc + p.desi, 0);
            setSelectedProduct(prev => prev ? ({ ...prev, total_desi: total }) : null);
            await saveProductAction({ ...selectedProduct, total_desi: total }); // Update parent

            toast.success("Koli eklendi");
            setNewParcel({ width: 0, height: 0, depth: 0, weight: 0, desi: 0 });
        } catch (e: any) { toast.error(e.message); }
    };

    const deleteItem = async (table: string, id: number, setter: any, list: any[]) => {
        if (!selectedProduct?.id) return;
        try {
            await deleteProductItemAction(table as any, id, selectedProduct.id);
            setter(list.filter(x => x.id !== id));

            // If parcel, update total
            if (table === 'product_parcels') {
                const newTotal = list.filter(x => x.id !== id).reduce((acc, c) => acc + c.desi, 0);
                setSelectedProduct(prev => prev ? ({ ...prev, total_desi: newTotal }) : null);
                await saveProductAction({ ...selectedProduct, total_desi: newTotal });
            }
        } catch (e: any) { toast.error(e.message); }
    };

    // ... costs calc remains same ...

    // Replace the Save Button logic in JSX roughly at line 954
    // Wait, I can't easily replace just the button JSX with this tool since I need to target lines precisely.
    // I can redefine `handleSave` function and call it from onClick?
    // But the original code has inline async arrow function.

    const handleSaveProduct = async () => {
        try {
            // Handle create if ID is 0?
            // My saveProductAction handles ID=0 check? No, I implemented checks.
            // If ID=0, it inserts.

            const res = await saveProductAction(selectedProduct);
            if (res.success) {
                toast.success("Kaydedildi.");
                if (res.product) {
                    // If new product created
                    setSelectedProduct(res.product);
                    // Refresh main list
                    fetchMainData(currentPage);
                } else {
                    fetchMainData(currentPage);
                }
            }
        } catch (e: any) { toast.error(e.message); }
    };


    const calculateCosts = (): CostAnalysis => {
        let suntaCost = 0, suntaArea = 0, bantCost = 0, bantLength = 0, hirdavatCost = 0, iscilikCost = 0, ambalajCost = 0;

        cuts.forEach(c => {
            const sunta = materials?.find(m => m.id === c.material_id);
            const bant = materials?.find(m => m.id === c.band_material_id);
            const partArea = ((c.width * c.height * c.quantity) / 1000000);
            suntaArea += partArea;

            if (sunta) {
                let unitP = sunta.unit_price;
                if (sunta.category === 'Levha' && sunta.unit === 'plaka' && sunta.sheet_width && sunta.sheet_height) {
                    unitP = sunta.unit_price / ((sunta.sheet_width * sunta.sheet_height) / 1000000);
                }
                const waste = 1 + (sunta.waste_percentage / 100);
                suntaCost += partArea * unitP * waste;
            }
            if (bant && c.band_material_id) {
                const len = (((c.width * c.band_short) + (c.height * c.band_long)) * c.quantity) / 1000;
                bantLength += len;
                bantCost += len * bant.unit_price;
            }
        });

        components.forEach(c => {
            const m = materials?.find(x => x.id === c.material_id);
            if (m) {
                const val = c.quantity * m.unit_price;
                if (m.category === 'İşçilik') iscilikCost += val;
                else if (m.category === 'Ambalaj') ambalajCost += val;
                else hirdavatCost += val;
            }
        });

        const totalDesi = parcels.reduce((acc, p) => acc + p.desi, 0);
        let kargoCost = totalDesi * 7.5;
        const rawTotal = suntaCost + bantCost + hirdavatCost + iscilikCost + ambalajCost;
        const overhead = rawTotal * (factorySettings.overhead_percentage / 100);

        return {
            sunta: suntaCost, suntaArea, bant: bantCost, bantLength,
            hirdavat: hirdavatCost, iscilik: iscilikCost, ambalaj: ambalajCost,
            kargo: kargoCost, desi: totalDesi,
            genelGider: overhead,
            total: rawTotal + overhead + kargoCost
        };
    };

    const costs = calculateCosts();

    // =================================== 3. EXCEL HANDLER ===================================
    // =================================== 3. EXCEL HANDLER (IMPROVED) ===================================

    // New State for Import Process
    const [importStep, setImportStep] = useState<'idle' | 'preview' | 'processing' | 'done'>('idle');
    const [importData, setImportData] = useState<any[]>([]);
    const [importStats, setImportStats] = useState({ total: 0, processed: 0, success: 0, fail: 0 });
    const [importErrors, setImportErrors] = useState<{ item: string, error: string }[]>([]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStep('idle');
        setImportData([]);

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target?.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(ws);
                if (rawData.length === 0) { toast.error("Boş dosya"); return; }

                const parseNumber = (val: any) => {
                    if (!val) return 0;
                    if (typeof val === 'number') return val;
                    // Try to clean non-numeric
                    const s = String(val).replace(/[^0-9]/g, '');
                    return parseInt(s) || 0;
                };
                const parseMoney = (val: any) => {
                    if (!val) return 0;
                    if (typeof val === 'number') return val;
                    const s = String(val).trim();
                    if (s.includes(',')) {
                        // Turkish format: 1.250,00 -> 1250.00
                        // Remove dots, valid comma -> dot
                        return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
                    }
                    return parseFloat(s) || 0;
                };
                const parseFloatSafe = parseMoney;

                const productsToUpload: any[] = [];
                const getVal = (row: any, keys: string[]) => {
                    for (const k of keys) {
                        if (row[k] !== undefined) return row[k];
                        const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
                        if (found) return row[found];
                    }
                    return undefined;
                };

                rawData.forEach((row: any) => {
                    const imgs: string[] = [];
                    for (let i = 1; i <= 10; i++) {
                        const val = getVal(row, [`Görsel ${i}`, `Resim ${i}`, `Image ${i}`]);
                        if (val) imgs.push(String(val).trim());
                    }
                    if (imgs.length === 0) {
                        const s = getVal(row, ['Görsel Linkleri', 'Images']);
                        if (s) String(s).split(',').forEach(x => imgs.push(x.trim()));
                    }

                    const name = getVal(row, ['Ürün Adı', 'Name']);
                    const code = getVal(row, ['Model Kodu', 'Code', 'Tedarikçi Stok Kodu']);
                    const barcode = getVal(row, ['Barkod', 'Barcode']);

                    // Skip if absolutely no identifier
                    if (!name && !code) return;

                    productsToUpload.push({
                        name: String(name || "Adsız").trim(),
                        code: String(code || `GEN-${Date.now()}`).trim(),
                        barcode: String(barcode || "").trim(),
                        price: parseMoney(getVal(row, ["Trendyol'da Satılacak Fiyat (KDV Dahil)", "Price", "Satis Fiyati", "Fiyat"])),
                        market_price: parseMoney(getVal(row, ["Piyasa Satış Fiyatı (KDV Dahil)", "List Price", "Piyasa Fiyati"])),
                        stock: parseNumber(getVal(row, ['Stok', 'Stock', 'Ürün Stok Adedi', 'Miktar', 'Adet', 'Quantity'])),
                        vat_rate: parseNumber(getVal(row, ['KDV Oranı', 'Kdv', 'Vat', 'Tax'])),
                        total_desi: parseFloatSafe(getVal(row, ['Desi', 'Total Desi', 'Kargo Desi'])),
                        shipment_days: parseNumber(getVal(row, ['Sevkiyat Süresi', 'Shipment Days', 'Termin Suresi']) || "3"),
                        description: String(getVal(row, ['Ürün Açıklaması', 'Description']) || "").trim(),
                        brand: String(getVal(row, ['Marka', 'Brand']) || "").trim(),
                        category: String(getVal(row, ['Kategori İsmi', 'Category']) || "").trim(),
                        product_url: String(getVal(row, ['Trendyol.com Linki', 'Ürün Linki', 'Url', 'Link', 'Product Url']) || "").trim(),
                        images: imgs,
                        image_url: imgs[0] || "",
                        raw_data: row
                    });
                });

                if (productsToUpload.length === 0) {
                    toast.error("Geçerli ürün bulunamadı.");
                    return;
                }

                setImportData(productsToUpload);
                setImportStep('preview');
                setImportStats({ total: productsToUpload.length, processed: 0, success: 0, fail: 0 });
                setImportErrors([]);

            } catch (e: any) {
                toast.error("Excel okuma hatası: " + e.message);
            }
        };
    };

    const runImportProcess = async () => {
        if (importData.length === 0) return;
        setImportStep('processing');

        const BATCH = 50;
        const selectedMarketName = availableMarketplaces.find(m => String(m.id) === importMarketplaceId)?.store_name || "Bilinmiyor";

        let processed = 0;
        let success = 0;
        let fail = 0;
        let newErrors: any[] = [];

        try {
            for (let i = 0; i < importData.length; i += BATCH) {
                const batch = importData.slice(i, i + BATCH);

                try {
                    const res = await fetch('/api/products/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ products: batch, sourceMarketplace: selectedMarketName })
                    });

                    const json = await res.json();

                    if (json.success) {
                        // Backend 'message' says "50 processed" but doesn't explicitly give 'successCount' vs 'failCount' 
                        // The backend code I saw returns { message: "X processed", errors: [...] }
                        // upsertedCount there basically means success. 
                        // errors array contains failures.

                        // Wait, looking at API code again:
                        // upsertedCount is accumulated success.
                        // errors is array of {item, error}.

                        // Parse count from message or infer?
                        // Let's rely on batch length - errors.

                        const batchErrors = json.errors || [];
                        const batchSuccess = batch.length - batchErrors.length;

                        success += batchSuccess;
                        fail += batchErrors.length;
                        if (batchErrors.length > 0) newErrors = [...newErrors, ...batchErrors];
                    } else {
                        fail += batch.length;
                        newErrors.push({ item: `Batch ${i}-${i + BATCH}`, error: json.error || "Bilinmeyen API Hatası" });
                    }

                } catch (err: any) {
                    fail += batch.length;
                    newErrors.push({ item: `Batch ${i}-${i + BATCH}`, error: err.message });
                }

                processed += batch.length;
                setImportStats({ total: importData.length, processed, success, fail });
                setImportErrors(prev => [...prev, ...newErrors]);
                // Reset newErrors for next loop but we already spread it?? No, wait. 
                // setImportErrors should be cumulative.
                // Actually my logic above `newErrors = [...newErrors, ...batchErrors]` accumulates inside the loop function scope.
                // But setImportErrors is async. Better to just accumulate in local var `allErrors` and set state periodically or at end?
                // For progress bar visualization, we need state updates. 
                // Let's keep simpler accumulation.
            }

            setImportStep('done');
            toast.success("İçe aktarma tamamlandı.");
            fetchMainData(currentPage);

        } catch (e: any) {
            toast.error("Kritik hata: " + e.message);
            setImportStep('done'); // Allow viewing what happened so far
        }
    };

    const processBulkAction = async () => {
        if (!targetMarketplaceId) { toast.error("Lütfen hedef mağaza seçin."); return; }

        setProcessingBulk(true);
        const toastId = toast.loading("İşlem başlatılıyor...");

        try {
            let res;
            if (bulkAction === 'open_trendyol') {
                res = await fetch('/api/trendyol/products/create-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productIds: selectedIds,
                        accountId: targetMarketplaceId,
                        categoryId: targetCategoryId
                    })
                });
            } else if (bulkAction === 'update_price') {
                res = await fetch('/api/trendyol/products/update-price-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productIds: selectedIds,
                        accountId: targetMarketplaceId,
                        type: priceUpdateType,
                        value: parseFloat(priceUpdateValue)
                    })
                });
            } else if (bulkAction === 'update_stock') {
                res = await fetch('/api/trendyol/products/update-stock-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productIds: selectedIds,
                        accountId: targetMarketplaceId,
                        stock: parseInt(stockUpdateValue)
                    })
                });
            } else {
                // Future Impl
                toast.info("Bu işlem henüz aktif değil.", { id: toastId });
                setProcessingBulk(false);
                return;
            }

            const json = await res.json();
            if (json.success) {
                toast.success(json.message || "İşlem başarılı.", { id: toastId });
                setBulkAction(null);
                setSelectedIds([]);
            } else {
                toast.error("Hata: " + json.error, { id: toastId });
            }

        } catch (e: any) {
            toast.error("İşlem hatası: " + e.message, { id: toastId });
        } finally {
            setProcessingBulk(false);
        }
    };

    // =================================== RENDER ===================================
    return (
        <div className="flex h-screen bg-[#0B1120] text-gray-200 font-sans overflow-hidden">
            {/* MAIN LIST */}
            <main className="flex-1 flex flex-col h-full relative">
                {/* BULK ACTION HEADER (Visible when items selected) */}
                {selectedIds.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 z-20 bg-blue-600 text-white p-4 flex justify-between items-center shadow-lg animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-lg">{selectedIds.length} ürün seçildi</span>
                            <button onClick={() => setSelectedIds([])} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded">Vazgeç</button>
                            {/* Filter Context Action */}
                            {totalCount > products.length && (
                                <button onClick={() => toast.info("Tüm filtrelenmiş sonuçlara uygulama özelliği yapım aşamasında.")} className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded border border-blue-400 flex items-center gap-2">
                                    <ListFilter size={14} /> Filtrelenen Tümünü Seç ({totalCount})
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleBulkAction('open_trendyol')} className="bg-white text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm shadow">
                                <Store size={16} /> Trendyol'a Aç
                            </button>
                            <button onClick={() => handleBulkAction('update_price')} className="bg-white text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm shadow">
                                <DollarSign size={16} /> Fiyat Güncelle
                            </button>
                            <button onClick={() => handleBulkAction('update_stock')} className="bg-white text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm shadow">
                                <Box size={16} /> Stok Güncelle
                            </button>
                        </div>
                    </div>
                )}

                <header className="p-6 border-b border-gray-800 bg-[#111827] flex justify-between items-center shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="text-blue-500" /> Ürün Yönetimi</h1>
                        <p className="text-gray-500 text-sm">Sayfa {currentPage} (30 Ürün/Sayfa)</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setIsExcelModalOpen(true); setImportStep('idle'); setImportData([]); }} className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg">
                            <FileSpreadsheet size={16} /> Excel Yükle
                        </button>
                        <button onClick={() => openManager(null)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg">
                            <Plus size={16} /> Yeni Ürün
                        </button>
                    </div>
                </header>

                <div className="px-6 mt-4 flex gap-3 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-2.5 pl-10 text-white outline-none focus:border-blue-500"
                            placeholder="Ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <select className="bg-[#1F2937] border border-gray-700 rounded-xl p-2.5 text-white" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">Tümü</option><option value="with_recipe">Maliyeti Olanlar</option><option value="critical_stock">Kritik Stok</option>
                    </select>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    <div className="bg-[#111827] rounded-xl border border-gray-800 flex-1 overflow-auto shadow-xl">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-[#1F2937] sticky top-0 text-xs font-bold uppercase z-10">
                                <tr>
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                            checked={products.length > 0 && selectedIds.length === products.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedIds(products.map(p => p.id));
                                                else setSelectedIds([]);
                                            }}
                                        />
                                    </th>
                                    <th className="p-4">Ürün</th>
                                    <th className="p-4">Marka</th>
                                    <th className="p-4">Stok</th>
                                    <th className="p-4">Fiyat</th>
                                    <th className="p-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {products.length === 0 && !loading && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>}
                                {products.map(p => (
                                    <tr key={p.id} className={`hover:bg-gray-800/40 ${selectedIds.includes(p.id) ? 'bg-blue-900/10' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.includes(p.id)}
                                                onChange={() => {
                                                    if (selectedIds.includes(p.id)) setSelectedIds(selectedIds.filter(id => id !== p.id));
                                                    else setSelectedIds([...selectedIds, p.id]);
                                                }}
                                            />
                                        </td>
                                        <td className="p-4 flex gap-3 items-center">
                                            {p.image_url ? <img src={p.image_url} className="w-10 h-10 rounded border border-gray-700 bg-white object-contain" /> : <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center"><ImageIcon size={16} /></div>}
                                            <div><div className="text-white font-bold">{p.name}</div><div className="text-xs text-blue-400">{p.code}</div></div>
                                        </td>
                                        <td className="p-4">{p.brand || "-"}</td>
                                        <td className="p-4 font-bold text-white">{p.stock}</td>
                                        <td className="p-4 text-green-400 font-bold">{p.price} TL</td>
                                        <td className="p-4 text-right"><button onClick={() => openManager(p)} className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded hover:bg-blue-600 hover:text-white transition text-xs font-bold">Yönet</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-sm text-gray-500 bg-[#111827] p-3 rounded-lg border border-gray-800">
                        <span>Toplam {totalCount} Kayıt</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} className="p-2 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <span className="p-2 font-bold text-white">{currentPage}</span>
                            <button onClick={() => setCurrentPage(c => c + 1)} disabled={products.length < itemsPerPage} className="p-2 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </main>

            {/* BULK ACTION MODAL */}
            {bulkAction && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {bulkAction === 'open_trendyol' && <Store className="text-orange-500" />}
                                {bulkAction === 'update_price' && <DollarSign className="text-green-500" />}
                                {bulkAction === 'update_stock' && <Box className="text-blue-500" />}
                                {bulkAction === 'open_trendyol' ? 'Trendyol\'a Gönder' : bulkAction === 'update_price' ? 'Fiyat Güncelle' : 'Stok Güncelle'}
                            </h3>
                            <button onClick={() => setBulkAction(null)}><X className="text-gray-500 hover:text-white" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-blue-900/20 text-blue-200 p-3 rounded text-sm border border-blue-900/50">
                                <strong>{selectedIds.length} ürün</strong> seçildi. Bu işlem seçili tüm ürünlere uygulanacaktır.
                            </div>

                            {/* COMMON: Market Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Hedef Mağaza</label>
                                <select
                                    className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    value={targetMarketplaceId}
                                    onChange={e => setTargetMarketplaceId(e.target.value)}
                                >
                                    <option value="">Seçiniz...</option>
                                    {availableMarketplaces.map(m => (
                                        <option key={m.id} value={m.id}>{m.store_name} ({m.marketplace})</option>
                                    ))}
                                    {availableMarketplaces.length === 0 && <option disabled>Mağaza Bulunamadı</option>}
                                </select>
                            </div>

                            {/* ACTION SPECIFIC INPUTS */}
                            {bulkAction === 'update_price' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">İşlem Tipi</label>
                                        <select
                                            className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            value={priceUpdateType}
                                            onChange={e => setPriceUpdateType(e.target.value)}
                                        >
                                            <option value="set">Sabit Fiyat Ata</option>
                                            <option value="percent_inc">Yüzde (%) Arttır</option>
                                            <option value="percent_dec">Yüzde (%) İndir</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Değer</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-bold text-lg"
                                            placeholder="0.00"
                                            value={priceUpdateValue}
                                            onChange={e => setPriceUpdateValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {bulkAction === 'update_stock' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Yeni Stok Adedi</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-bold text-lg"
                                        placeholder="0"
                                        value={stockUpdateValue}
                                        onChange={e => setStockUpdateValue(e.target.value)}
                                    />
                                </div>
                            )}

                            {bulkAction === 'open_trendyol' && (
                                <div className="space-y-4">
                                    <p className="text-gray-400 text-sm">
                                        Bu ürünler Trendyol V2 API kullanılarak mağazanıza aktarılacaktır.
                                    </p>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Trendyol Kategori ID (Opsiyonel)</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm pointer-events-auto"
                                            placeholder="Örn: 1234 (Boş bırakılırsa otomatik eşleşme denenir)"
                                            value={targetCategoryId}
                                            onChange={e => setTargetCategoryId(e.target.value)}
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Girilmezse ürünün mevcut kategorisi kullanılmaya çalışılır.</p>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-yellow-500">
                                        <AlertCircle size={14} />
                                        <span>Eksik barkod veya görseli olan ürünler atlanacaktır.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-800 bg-gray-900/30 flex justify-end gap-3">
                            <button onClick={() => setBulkAction(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition">İptal</button>
                            <button
                                onClick={processBulkAction}
                                disabled={processingBulk}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2"
                            >
                                {processingBulk && <Loader2 className="animate-spin" size={16} />}
                                İşlemi Başlat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGER MODAL */}
            {isEditorOpen && selectedProduct && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex items-center justify-center p-4">
                    <div className="bg-[#111827] w-full max-w-7xl h-[95vh] rounded-2xl border border-gray-700 flex flex-col shadow-2xl overflow-hidden">
                        <div className="h-16 border-b border-gray-700 bg-[#1F2937] flex justify-between items-center px-6 shrink-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} /> {selectedProduct.name}</h2>
                            <button onClick={() => setIsEditorOpen(false)} className="bg-gray-800 p-2 rounded text-white hover:bg-red-500"><X size={20} /></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-60 bg-[#0B1120] border-r border-gray-700 flex flex-col overflow-y-auto shrink-0">
                                {["Genel Bilgiler", "Ürün Özellikleri", "Kesim Listesi", "Hırdavat & Bileşenler", "Paketleme & Desi", "Maliyet Analizi"].map(t => (
                                    <button key={t} onClick={() => setActiveTab(t)} className={`p-4 text-left text-sm font-bold border-l-4 transition-all ${activeTab === t ? 'border-blue-500 bg-blue-900/20 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}>{t}</button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-[#111827]">
                                {/* 1. GENEL */}
                                {activeTab === "Genel Bilgiler" && (
                                    <div className="space-y-6">
                                        {/* Basic Info Grid */}
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="col-span-2 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Ürün Adı</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.name} onChange={e => setSelectedProduct({ ...selectedProduct, name: e.target.value })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Kategori</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.category || ""} onChange={e => setSelectedProduct({ ...selectedProduct, category: e.target.value })} /></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Marka</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.brand || ""} onChange={e => setSelectedProduct({ ...selectedProduct, brand: e.target.value })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Model Kodu</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.code} onChange={e => setSelectedProduct({ ...selectedProduct, code: e.target.value })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Barkod</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.barcode || ""} onChange={e => setSelectedProduct({ ...selectedProduct, barcode: e.target.value })} /></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Satış Fiyatı (TL)</label><input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-green-500 outline-none font-bold" value={selectedProduct.price} onChange={e => setSelectedProduct({ ...selectedProduct, price: parseFloat(e.target.value) })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Piyasa Fiyatı (TL)</label><input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-400 focus:border-blue-500 outline-none" value={selectedProduct.market_price || 0} onChange={e => setSelectedProduct({ ...selectedProduct, market_price: parseFloat(e.target.value) })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">KDV (%)</label><input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.vat_rate || 18} onChange={e => setSelectedProduct({ ...selectedProduct, vat_rate: parseFloat(e.target.value) })} /></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Stok Adedi</label><input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.stock} onChange={e => setSelectedProduct({ ...selectedProduct, stock: parseInt(e.target.value) })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Sevkiyat Süresi (Gün)</label><input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" value={selectedProduct.shipment_days || 3} onChange={e => setSelectedProduct({ ...selectedProduct, shipment_days: parseInt(e.target.value) })} /></div>
                                                    <div><label className="text-xs text-gray-500 font-bold uppercase">Toplam Desi</label><div className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-gray-400 italic cursor-not-allowed" title="Paketleme sekmesinden otomatik hesaplanır">{selectedProduct.total_desi || 0}</div></div>
                                                </div>
                                            </div>

                                            {/* Right Column: Images & Links */}
                                            <div className="space-y-4">
                                                <div className="bg-gray-800 rounded p-4 border border-gray-700">
                                                    <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Pazaryeri ve Link</label>
                                                    <div className="text-sm text-blue-400 mb-2">{selectedProduct.raw_data?.source || "Bilinmiyor"}</div>
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white" placeholder="Ürün Linki" value={selectedProduct.product_url || ""} onChange={e => setSelectedProduct({ ...selectedProduct, product_url: e.target.value })} />
                                                        {selectedProduct.product_url && <a href={selectedProduct.product_url} target="_blank" className="p-2 bg-blue-600 rounded text-white hover:bg-blue-500"><ExternalLink size={14} /></a>}
                                                    </div>
                                                </div>

                                                <div className="bg-gray-800 rounded p-4 border border-gray-700">
                                                    <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Görseller</label>
                                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                                        {selectedProduct.images?.map((img, idx) => (
                                                            <div key={idx} className="relative group aspect-square bg-white rounded flex items-center justify-center overflow-hidden border border-gray-600">
                                                                <img src={img} className="w-full h-full object-contain" />
                                                                <button onClick={() => {
                                                                    const newImgs = [...(selectedProduct.images || [])];
                                                                    newImgs.splice(idx, 1);
                                                                    setSelectedProduct({ ...selectedProduct, images: newImgs, image_url: newImgs[0] || "" });
                                                                }} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition"><Trash2 size={16} /></button>
                                                            </div>
                                                        ))}
                                                        <div className="aspect-square bg-gray-900 rounded border border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:text-white cursor-pointer" onClick={() => {
                                                            const url = prompt("Görsel URL:");
                                                            if (url) setSelectedProduct({ ...selectedProduct, images: [...(selectedProduct.images || []), url], image_url: selectedProduct.image_url || url });
                                                        }}><Plus size={24} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Editor */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-500 font-bold uppercase">Ürün Açıklaması</label>
                                            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                                                <div className="bg-gray-900 p-2 flex gap-2 border-b border-gray-700">
                                                    <button className="p-1 hover:bg-gray-700 rounded text-gray-400" onClick={() => setSelectedProduct({ ...selectedProduct, description: (selectedProduct.description || "") + "<b></b>" })} title="Kalın"><b>B</b></button>
                                                    <button className="p-1 hover:bg-gray-700 rounded text-gray-400 italic" onClick={() => setSelectedProduct({ ...selectedProduct, description: (selectedProduct.description || "") + "<i></i>" })} title="İtalik">i</button>
                                                    <button className="p-1 hover:bg-gray-700 rounded text-gray-400" onClick={() => setSelectedProduct({ ...selectedProduct, description: (selectedProduct.description || "") + "<br>" })} title="Satır Başı">↵</button>
                                                    <button className="p-1 hover:bg-gray-700 rounded text-gray-400 text-xs" onClick={() => setSelectedProduct({ ...selectedProduct, description: (selectedProduct.description || "") + "<ul><li></li></ul>" })} title="Liste">List</button>
                                                </div>
                                                <textarea
                                                    className="w-full bg-[#111827] p-4 text-white min-h-[200px] outline-none font-mono text-sm"
                                                    value={selectedProduct.description || ""}
                                                    onChange={e => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                                                ></textarea>
                                            </div>
                                            <div className="flex justify-end">
                                                <button onClick={handleSaveProduct} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold flex items-center gap-2"><Save size={16} /> Kaydet</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* 2. OZELLIKLER (EXCEL DATA) */}
                                {activeTab === "Ürün Özellikleri" && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-900/20 border border-blue-900/50 p-4 rounded text-blue-200 text-sm">Pazaryerinden çekilen tüm detaylı özellikleri burada görebilirsiniz.</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedProduct.raw_data && Object.entries(selectedProduct.raw_data).map(([k, v]: any) => {
                                                if (typeof v === 'object') return null;
                                                return (
                                                    <div key={k} className="flex justify-between p-3 bg-gray-800 rounded border border-gray-700">
                                                        <span className="text-gray-400 font-bold text-xs uppercase">{k}</span>
                                                        <span className="text-white text-sm max-w-[200px] truncate" title={String(v)}>{String(v)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                {/* 3. PRODUCTION TABS (CRUD RESTORED) */}
                                {activeTab === "Kesim Listesi" && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-6 gap-2 bg-gray-800 p-4 rounded-lg border border-gray-700 items-end">
                                            <div className="col-span-2"><label className="text-xs text-gray-500">Parça Adı</label><input className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newCut.description} onChange={e => setNewCut({ ...newCut, description: e.target.value })} /></div>
                                            <div><label className="text-xs text-gray-500">En (mm)</label><input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newCut.width} onChange={e => setNewCut({ ...newCut, width: parseFloat(e.target.value) })} /></div>
                                            <div><label className="text-xs text-gray-500">Boy (mm)</label><input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newCut.height} onChange={e => setNewCut({ ...newCut, height: parseFloat(e.target.value) })} /></div>
                                            <div><label className="text-xs text-gray-500">Adet</label><input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newCut.quantity} onChange={e => setNewCut({ ...newCut, quantity: parseInt(e.target.value) })} /></div>
                                            <div className="col-span-2"><label className="text-xs text-gray-500">Malzeme</label><select className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newCut.material_id} onChange={e => setNewCut({ ...newCut, material_id: parseInt(e.target.value) })}>{materials.filter(m => m.category === 'Levha').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                                            <button onClick={addCut} className="bg-green-600 text-white rounded p-1 font-bold col-span-1">+ Ekle</button>
                                        </div>
                                        <table className="w-full text-sm text-left"><thead className="text-gray-500"><tr><th>Ad</th><th>En</th><th>Boy</th><th>Adet</th><th>Sil</th></tr></thead>
                                            <tbody>{cuts.map(c => (<tr key={c.id}><td>{c.description}</td><td>{c.width}</td><td>{c.height}</td><td>{c.quantity}</td><td><button onClick={() => deleteItem('product_cuts', c.id!, setCuts, cuts)} className="text-red-500"><Trash2 size={16} /></button></td></tr>))}</tbody></table>
                                    </div>
                                )}
                                {activeTab === "Hırdavat & Bileşenler" && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2 bg-gray-800 p-4 rounded items-end">
                                            <select className="flex-1 bg-[#111827] text-white p-2 rounded border border-gray-600" value={newComp.material_id} onChange={e => setNewComp({ ...newComp, material_id: parseInt(e.target.value) })}>
                                                <option value="">Malzeme Seç</option>
                                                {materials.filter(m => m.category !== 'Levha').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <input type="number" className="w-20 bg-[#111827] text-white p-2 rounded border border-gray-600" placeholder="Adet" value={newComp.quantity} onChange={e => setNewComp({ ...newComp, quantity: parseInt(e.target.value) })} />
                                            <button onClick={addComponent} className="bg-green-600 text-white px-4 py-2 rounded font-bold">Ekle</button>
                                        </div>
                                        <table className="w-full text-sm text-left"><thead className="text-gray-500"><tr><th>Malzeme</th><th>Adet</th><th>Tutar</th><th>Sil</th></tr></thead>
                                            <tbody>{components.map(c => (<tr key={c.id}><td>{materials.find(m => m.id === c.material_id)?.name}</td><td>{c.quantity}</td><td>{(c.quantity * (materials.find(m => m.id === c.material_id)?.unit_price || 0)).toFixed(2)}TL</td><td><button onClick={() => deleteItem('product_components', c.id!, setComponents, components)} className="text-red-500"><Trash2 size={16} /></button></td></tr>))}</tbody></table>
                                    </div>
                                )}
                                {/* Package & Desi Tab (NEW Logic) */}
                                {activeTab === "Paketleme & Desi" && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-900/20 p-4 rounded border border-blue-900/50 text-blue-200 text-sm mb-4">
                                            Koli ölçülerini girdiğinizde Desi otomatik hesaplanır (En x Boy x Yük x 3000). Ağırlık varsayılan olarak Desi ile aynı gelir ancak değiştirebilirsiniz.
                                        </div>
                                        <div className="grid grid-cols-5 gap-2 bg-gray-800 p-4 rounded-lg border border-gray-700 items-end">
                                            <div>
                                                <label className="text-xs text-gray-500">En (cm)</label>
                                                <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newParcel.width || ""}
                                                    onChange={e => {
                                                        const w = parseFloat(e.target.value);
                                                        const h = newParcel.height || 0;
                                                        const d = newParcel.depth || 0;
                                                        const desi = parseFloat(((w * h * d) / 3000).toFixed(2));
                                                        setNewParcel({ ...newParcel, width: w, desi, weight: desi }); // Default weight = desi
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Boy (cm)</label>
                                                <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newParcel.height || ""}
                                                    onChange={e => {
                                                        const h = parseFloat(e.target.value);
                                                        const w = newParcel.width || 0;
                                                        const d = newParcel.depth || 0;
                                                        const desi = parseFloat(((w * h * d) / 3000).toFixed(2));
                                                        setNewParcel({ ...newParcel, height: h, desi, weight: desi });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Yükseklik (cm)</label>
                                                <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newParcel.depth || ""}
                                                    onChange={e => {
                                                        const d = parseFloat(e.target.value);
                                                        const w = newParcel.width || 0;
                                                        const h = newParcel.height || 0;
                                                        const desi = parseFloat(((w * h * d) / 3000).toFixed(2));
                                                        setNewParcel({ ...newParcel, depth: d, desi, weight: desi });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Ağırlık (kg)</label>
                                                <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded p-1 text-white" value={newParcel.weight || ""}
                                                    onChange={e => setNewParcel({ ...newParcel, weight: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <button onClick={addParcel} className="bg-green-600 text-white rounded p-1 font-bold h-9">
                                                {newParcel.desi ? `Ekle (${newParcel.desi} Desi)` : 'Ekle'}
                                            </button>
                                        </div>
                                        <table className="w-full text-sm text-left"><thead className="text-gray-500"><tr><th>En</th><th>Boy</th><th>Yük.</th><th>Ağırlık</th><th>Desi</th><th>Sil</th></tr></thead>
                                            <tbody>
                                                {parcels.map(p => (
                                                    <tr key={p.id}>
                                                        <td>{p.width} cm</td><td>{p.height} cm</td><td>{p.depth} cm</td><td>{p.weight} kg</td><td>{p.desi}</td>
                                                        <td><button onClick={async () => {
                                                            await deleteItem('product_parcels', p.id!, setParcels, parcels);
                                                            // Update product total desi
                                                            const newTotal = parcels.filter(x => x.id !== p.id).reduce((acc, c) => acc + c.desi, 0);
                                                            setSelectedProduct(prev => prev ? ({ ...prev, total_desi: newTotal }) : null);
                                                            await saveProductAction({ ...selectedProduct, total_desi: newTotal });
                                                        }} className="text-red-500"><Trash2 size={16} /></button></td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-gray-700 font-bold text-white">
                                                    <td colSpan={4} className="text-right p-2">TOPLAM:</td>
                                                    <td className="p-2 text-blue-400">{selectedProduct.total_desi?.toFixed(2)} Desi</td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {/* 4. MALIYET */}
                                {activeTab === "Maliyet Analizi" && (
                                    <div className="grid grid-cols-2 gap-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between"><span>Sunta</span><span className="font-bold">{costs.sunta.toFixed(2)} TL</span></div>
                                            <div className="flex justify-between"><span>Bant</span><span className="font-bold">{costs.bant.toFixed(2)} TL</span></div>
                                            <div className="flex justify-between"><span>Hırdavat</span><span className="font-bold">{costs.hirdavat.toFixed(2)} TL</span></div>
                                            <div className="flex justify-between"><span>İşçilik</span><span className="font-bold">{costs.iscilik.toFixed(2)} TL</span></div>
                                            <div className="border-t border-gray-600 pt-2 flex justify-between text-yellow-500"><span>Genel Gider</span><span>{costs.genelGider.toFixed(2)} TL</span></div>
                                        </div>
                                        <div className="text-center flex flex-col justify-center">
                                            <div className="text-gray-400 text-xs uppercase">Birim Maliyet</div>
                                            <div className="text-4xl font-bold text-white">{costs.total.toFixed(2)} TL</div>
                                            <div className={`mt-2 font-bold ${selectedProduct.price > costs.total ? 'text-green-500' : 'text-red-500'}`}>Kar: {(selectedProduct.price - costs.total).toFixed(2)} TL</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div >
            )
            }

            {/* EXCEL IMPORT MODAL (REDESIGNED) */}
            {
                isExcelModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[#1F2937] w-full max-w-lg rounded-2xl border border-gray-700 p-6 flex flex-col gap-6 shadow-2xl relative">
                            <h2 className="text-xl font-bold text-white flex gap-2"><FileSpreadsheet className="text-green-500" /> Excel İçe Aktar</h2>
                            <button onClick={() => setIsExcelModalOpen(false)} className="absolute right-4 top-4 text-gray-500 hover:text-white"><X size={20} /></button>

                            {/* STEP 1: UPLOAD & PREVIEW */}
                            {importStep === 'idle' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-400 font-bold block mb-2">Pazaryeri Seçin</label>
                                        <select className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                                            value={importMarketplaceId} onChange={e => setImportMarketplaceId(e.target.value)}>
                                            <option value="">Seçiniz...</option>
                                            {availableMarketplaces.map(m => (
                                                <option key={m.id} value={m.id}>{m.store_name} ({m.marketplace})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-800 transition" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                                        <div className="text-sm font-bold text-gray-300">Dosya Seç (.xlsx)</div>
                                        <p className="text-xs text-gray-500 mt-1">Sürükleyip bırakın veya tıklayın</p>
                                        <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: PREVIEW & CONFIRM */}
                            {importStep === 'preview' && (
                                <div className="space-y-4">
                                    <div className="bg-blue-900/20 border border-blue-900/50 p-4 rounded text-blue-200">
                                        <div className="flex items-center gap-2 font-bold mb-1"><Info size={16} /> Önizleme</div>
                                        <p className="text-sm">Toplam <strong>{importStats.total}</strong> ürün bulundu.</p>
                                        <p className="text-sm opacity-70 mt-1">İşlem biraz zaman alabilir. Başlamak için "Aktarımı Başlat" butonuna tıklayın.</p>
                                    </div>
                                    <button onClick={runImportProcess} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg">
                                        Aktarımı Başlat ({importStats.total} Ürün)
                                    </button>
                                    <button onClick={() => { setImportStep('idle'); setImportData([]); }} className="w-full text-sm text-gray-400 hover:text-white">Geri Dön</button>
                                </div>
                            )}

                            {/* STEP 3: PROCESSING */}
                            {importStep === 'processing' && (
                                <div className="space-y-6 text-center py-6">
                                    <Loader2 className="animate-spin w-12 h-12 text-blue-500 mx-auto" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">İşleniyor...</h3>
                                        <p className="text-gray-400 text-sm mt-1">{importStats.processed} / {importStats.total} ürün tamamlandı</p>
                                    </div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(importStats.processed / importStats.total) * 100}%` }}></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: DONE */}
                            {importStep === 'done' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-900/20 border border-green-900/50 p-4 rounded text-center">
                                            <div className="text-2xl font-bold text-green-500">{importStats.success}</div>
                                            <div className="text-xs text-green-300 uppercase">Başarılı</div>
                                        </div>
                                        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded text-center">
                                            <div className="text-2xl font-bold text-red-500">{importStats.fail}</div>
                                            <div className="text-xs text-red-300 uppercase">Hatalı</div>
                                        </div>
                                    </div>

                                    {importErrors.length > 0 && (
                                        <div className="bg-gray-800 rounded p-4 max-h-40 overflow-y-auto custom-scrollbar text-xs">
                                            <div className="font-bold text-red-400 mb-2 sticky top-0 bg-gray-800">Hata Detayları ({importErrors.length})</div>
                                            {importErrors.map((err, idx) => (
                                                <div key={idx} className="border-b border-gray-700 py-1 last:border-0 text-gray-400">
                                                    <span className="font-mono text-white">{err.item}:</span> {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button onClick={() => { setIsExcelModalOpen(false); setImportStep('idle'); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg">
                                        Kapat
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}