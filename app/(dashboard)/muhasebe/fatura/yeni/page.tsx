"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, Plus, Trash2, ArrowLeft,
    FileText, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import SearchableSelect from '@/app/components/SearchableSelect';
import {
    getInvoiceFormDataAction,
    createInvoiceAction
} from '@/app/actions/invoiceActions';
import { upsertProductAction } from '@/app/actions/productActions';

export default function NewInvoicePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data Sources
    const [contacts, setContacts] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Form State
    const [header, setHeader] = useState({
        type: 'SALES', // SALES, PURCHASE, PROFORMA
        invoice_no: `FAT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        contact_id: null as number | null,
        contact_type: 'CUSTOMER', // CUSTOMER, SUPPLIER
        description: '',
        currency: 'TRY',
        status: 'DRAFT'
    });

    const [items, setItems] = useState<any[]>([
        {
            product_id: null,
            quantity: 1,
            unit_price: 0,
            tax_rate: 20,
            discount_type: 'AMOUNT', // 'AMOUNT' | 'PERCENT'
            discount_value: 0,
            total: 0,
            unit: 'Adet'
        }
    ]);

    // Totals
    const [totals, setTotals] = useState({
        subtotal: 0,
        tax: 0,
        discount_total: 0,
        general_discount_type: 'AMOUNT',
        general_discount_value: 0,
        grandTotal: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [items, totals.general_discount_type, totals.general_discount_value]);

    async function fetchData() {
        setLoading(true);
        try {
            const data = await getInvoiceFormDataAction();

            const unifiedContacts = [
                ...(data.customers || []).map((c: any) => ({ ...c, contact_type: 'CUSTOMER', label: `${c.name} (Müşteri)` })),
                ...(data.suppliers || []).map((s: any) => ({ ...s, contact_type: 'SUPPLIER', label: `${s.name} (Tedarikçi)` }))
            ];

            setContacts(unifiedContacts);
            setProducts(data.products || []);

        } catch (error: any) {
            console.error(error);
            toast.error("Veriler yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    // Handlers
    const handleHeaderChange = (field: string, value: any) => {
        setHeader(prev => ({ ...prev, [field]: value }));
    };

    const handleContactSelect = (contact: any) => {
        setHeader(prev => ({
            ...prev,
            contact_id: contact.id,
            contact_type: contact.contact_type
        }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // If product selected, auto-fill price/unit
        if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].unit_price = header.type === 'PURCHASE' ? (product.cost_price || 0) : (product.price || 0);
                newItems[index].unit = 'Adet'; // Default unit
            }
        }

        // Quick recalc for immediate visual feedback (though useEffect handles strict totals)
        const qty = Number(newItems[index].quantity) || 0;
        const price = Number(newItems[index].unit_price) || 0;
        const tax = Number(newItems[index].tax_rate) || 0;
        const discVal = Number(newItems[index].discount_value) || 0;
        const discType = newItems[index].discount_type;

        let lineDisc = 0;
        if (discType === 'PERCENT') {
            lineDisc = (qty * price) * (discVal / 100);
        } else {
            lineDisc = discVal;
        }

        const baseTotal = (qty * price) - lineDisc;
        const taxAmount = baseTotal * (tax / 100);
        newItems[index].total = baseTotal + taxAmount;

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, {
            product_id: null, quantity: 1, unit_price: 0, tax_rate: 20,
            discount_type: 'AMOUNT', discount_value: 0,
            total: 0, unit: 'Adet'
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
        }
    };

    // Quick Product Creation
    const handleCreateProduct = async (name: string, index: number) => {
        const tempCode = `URUN-${Math.floor(Math.random() * 10000)}`;
        try {
            const data = await upsertProductAction({ name, code: tempCode, price: 0, stock: 0 });

            // Add to local list
            setProducts(prev => [...prev, data]);
            // Assign to row
            handleItemChange(index, 'product_id', data.id);
            toast.success("Hızlı ürün eklendi: " + name);
        } catch (e: any) {
            toast.error("Ürün eklenemedi: " + e.message);
        }
    };

    const calculateTotals = () => {
        let sub = 0;
        let lineDiscSum = 0;
        let tax = 0;

        items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const taxRate = Number(item.tax_rate) || 0;

            const discVal = Number(item.discount_value) || 0;
            let lineDiscAmount = 0;
            if (item.discount_type === 'PERCENT') {
                lineDiscAmount = (qty * price) * (discVal / 100);
            } else {
                lineDiscAmount = discVal;
            }

            const lineBase = (qty * price) - lineDiscAmount;
            const lineTax = lineBase * (taxRate / 100);

            sub += lineBase;
            tax += lineTax;
            lineDiscSum += lineDiscAmount;
        });

        let generalDiscAmount = 0;
        const genDiscVal = Number(totals.general_discount_value) || 0;
        if (totals.general_discount_type === 'PERCENT') {
            generalDiscAmount = sub * (genDiscVal / 100);
        } else {
            generalDiscAmount = genDiscVal;
        }

        setTotals(prev => ({
            ...prev,
            subtotal: sub,
            tax: tax,
            discount_total: lineDiscSum + generalDiscAmount,
            grandTotal: sub - generalDiscAmount + tax
        }));
    };

    async function handleSave() {
        if (!header.contact_id) return toast.error("Lütfen cari seçiniz.");
        if (items.some(i => !i.product_id)) return toast.error("Lütfen tüm satırlar için ürün seçiniz.");

        setSaving(true);
        try {
            await createInvoiceAction({
                ...header,
                invoice_type: header.type,
                subtotal: totals.subtotal,
                tax_total: totals.tax, // Backend expects consistent name
                total_amount: totals.grandTotal,
                items: items
            });

            toast.success("Fatura başarıyla kaydedildi.");
            router.push('/muhasebe/fatura');

        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#0f1115] text-white"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#0f1115] text-white p-6 md:p-8 animate-in fade-in">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/muhasebe/fatura" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Yeni Fatura</h1>
                        <p className="text-gray-400 text-sm">Fatura detaylarını giriniz</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-400 hover:text-white transition"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Kaydet
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6">

                {/* 1. HEADER DETAILS (Full Width) */}
                <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cari Hesap (Müşteri/Tedarikçi)</label>
                            <SearchableSelect
                                options={contacts}
                                value={header.contact_id}
                                onChange={handleContactSelect}
                                placeholder="Cari Seçiniz..."
                                labelKey="label"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fatura Tipi</label>
                            <select
                                className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={header.type}
                                onChange={(e) => handleHeaderChange('type', e.target.value)}
                            >
                                <option value="SALES">Satış Faturası</option>
                                <option value="PURCHASE">Alış Faturası</option>
                                <option value="RETURN_SALES">Satış İade</option>
                                <option value="PROFORMA">Proforma</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fatura No</label>
                            <input
                                type="text"
                                className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={header.invoice_no}
                                onChange={(e) => handleHeaderChange('invoice_no', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fatura Tarihi</label>
                            <input
                                type="date"
                                className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={header.issue_date}
                                onChange={(e) => handleHeaderChange('issue_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Vade Tarihi</label>
                            <input
                                type="date"
                                className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={header.due_date}
                                onChange={(e) => handleHeaderChange('due_date', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. PRODUCTS (Full Width) */}
                <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 shadow-sm min-h-[400px]">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" /> Ürünler
                    </h3>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="flex flex-col xl:flex-row gap-3 items-end p-4 bg-[#111318]/50 rounded-lg border border-gray-800/50 hover:border-gray-700 transition">
                                <div className="flex-[2] min-w-[250px] w-full">
                                    <label className="text-xs text-gray-500 mb-1 block">Ürün / Hizmet</label>
                                    <SearchableSelect
                                        options={products}
                                        value={item.product_id}
                                        onChange={(p: any) => handleItemChange(index, 'product_id', p.id)}
                                        placeholder="Ürün Ara..."
                                        subLabelKey="stock"
                                        onCreate={(name: string) => handleCreateProduct(name, index)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 md:flex gap-3 w-full xl:w-auto">
                                    <div className="w-full xl:w-24">
                                        <label className="text-xs text-gray-500 mb-1 block">Miktar</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-[#0f1115] border border-gray-700 rounded px-2 py-2 text-white"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-full xl:w-28">
                                        <label className="text-xs text-gray-500 mb-1 block">Birim Fiyat</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[#0f1115] border border-gray-700 rounded px-2 py-2 text-white"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-full xl:w-36 flex gap-1">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 mb-1 block">İskonto</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded px-2 py-2 text-white"
                                                value={item.discount_value}
                                                onChange={(e) => handleItemChange(index, 'discount_value', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-14">
                                            <label className="text-xs text-gray-500 mb-1 block">Tip</label>
                                            <select
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded px-1 py-2 text-white text-xs"
                                                value={item.discount_type}
                                                onChange={(e) => handleItemChange(index, 'discount_type', e.target.value)}
                                            >
                                                <option value="AMOUNT">TL</option>
                                                <option value="PERCENT">%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="w-full xl:w-20">
                                        <label className="text-xs text-gray-500 mb-1 block">KDV %</label>
                                        <select
                                            className="w-full bg-[#0f1115] border border-gray-700 rounded px-2 py-2 text-white text-sm"
                                            value={item.tax_rate}
                                            onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                                        >
                                            <option value="0">%0</option>
                                            <option value="1">%1</option>
                                            <option value="10">%10</option>
                                            <option value="20">%20</option>
                                        </select>
                                    </div>
                                    <div className="w-full xl:w-32 text-right pb-2 flex items-center justify-end xl:block">
                                        <div className="text-xs text-gray-500 hidden xl:block">Satır Toplam</div>
                                        <div className="font-bold text-emerald-400 text-lg xl:text-base">
                                            {Number(item.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="w-auto flex items-center">
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addItem}
                        className="mt-4 w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus size={18} /> Yeni Satır Ekle
                    </button>
                </div>

                {/* 3. BOTTOM SECTION: NOTES & SUMMARY */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: Notes & Status */}
                    <div className="lg:col-span-2 bg-[#1a1d24] border border-gray-800 rounded-xl p-6 shadow-sm h-fit">
                        <h3 className="font-bold text-lg mb-4 text-gray-200">Fatura Notları & Durum</h3>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Durum</label>
                                <select
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={header.status}
                                    onChange={(e) => handleHeaderChange('status', e.target.value)}
                                >
                                    <option value="DRAFT">Taslak (Stok/Cari etkilenmez)</option>
                                    <option value="SENT">Onaylı (Stok/Cari güncellenir)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    * "Onaylı" seçildiğinde stok miktarları düşülür ve cari hesap bakiyesi güncellenir.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Açıklama</label>
                                <textarea
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                                    placeholder="Fatura ile ilgili notlar..."
                                    value={header.description}
                                    onChange={(e) => handleHeaderChange('description', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Totals Summary */}
                    <div className="lg:col-span-1 bg-[#1a1d24] border border-gray-800 rounded-xl p-6 shadow-sm h-fit">
                        <h3 className="font-bold text-lg mb-4 text-gray-200">Özet</h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>Ara Toplam</span>
                                <span>{totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>KDV Toplam</span>
                                <span>{totals.tax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                            </div>

                            <div className="pt-2 border-t border-gray-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">Fatura Altı İskonto</span>
                                    <div className="flex gap-2 w-32">
                                        <input
                                            type="number"
                                            className="w-full bg-[#111318] border border-gray-700 rounded px-2 py-1 text-white text-right"
                                            value={totals.general_discount_value}
                                            onChange={(e) => setTotals(prev => ({ ...prev, general_discount_value: Number(e.target.value) }))}
                                        />
                                        <select
                                            className="bg-[#111318] border border-gray-700 rounded px-1 py-1 text-white text-xs"
                                            value={totals.general_discount_type}
                                            onChange={(e) => setTotals(prev => ({ ...prev, general_discount_type: e.target.value }))}
                                        >
                                            <option value="AMOUNT">TL</option>
                                            <option value="PERCENT">%</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-between text-red-400 text-xs">
                                    <span>Toplam İndirim</span>
                                    <span>-{totals.discount_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-700 flex justify-between items-center">
                                <span className="font-bold text-white text-lg">Genel Toplam</span>
                                <span className="font-bold text-white text-xl bg-blue-600/20 px-3 py-1 rounded text-blue-400">
                                    {totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
