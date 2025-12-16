'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
// import { useAuth } from '@clerk/nextjs'; // REMOVED
import { toast } from 'sonner';
import {
    User, Phone, MapPin, CreditCard, Box, Search, Plus, Trash2,
    Save, X, ShoppingCart, Truck, Percent, FileText, Loader2, ArrowLeft
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getManualOrderAction,
    searchProductsForOrderAction,
    saveManualOrderAction
} from '@/app/actions/orderActions';

// Type Definitions
type Product = {
    id: number;
    name: string;
    code: string;
    stock: number;
    price: number;
    image_url?: string;
    weight?: number;
};

type OrderLine = {
    productId: number;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    imageUrl?: string;
};

function ManualOrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    // const { userId, getToken } = useAuth(); // REMOVED

    // --- FORM STATE ---
    const [source, setSource] = useState("Instagram");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerCity, setCustomerCity] = useState("");
    const [customerDistrict, setCustomerDistrict] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Havale / EFT");
    const [orderNote, setOrderNote] = useState("");

    const [orderStatus, setOrderStatus] = useState("Yeni");
    const [cargoProvider, setCargoProvider] = useState("");
    const [cargoTracking, setCargoTracking] = useState("");

    // --- PRODUCT & CART STATE ---
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cart, setCart] = useState<OrderLine[]>([]);
    const [originalCart, setOriginalCart] = useState<OrderLine[]>([]);

    // --- FINANCIAL STATE ---
    const [shippingCost, setShippingCost] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // --- CALCULATIONS ---
    const subTotal = cart.reduce((acc: number, item: OrderLine) => acc + (item.quantity * item.unitPrice), 0);
    const grandTotal = Math.max(0, subTotal + shippingCost - discount);

    // --- PRODUCT SEARCH (SERVER ACTION) ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const data = await searchProductsForOrderAction(searchTerm);
                setSearchResults(data || []);
            } catch (e) {
                console.error(e);
                toast.error("Ürün arama hatası");
            } finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // --- FETCH ORDER (SERVER ACTION) ---
    useEffect(() => {
        if (!editId) return;
        async function fetchOrder() {
            setIsLoading(true);
            try {
                const data = await getManualOrderAction(Number(editId));

                if (!data) {
                    toast.error("Sipariş bulunamadı.");
                    router.push('/siparisler');
                    return;
                }

                setSource(data.manual_source || "Instagram");
                setCustomerName(data.customer_name || "");
                setCustomerPhone(data.customer_phone || (data.raw_data?.shipmentAddress?.phone) || "");
                setCustomerCity(data.customer_city || (data.raw_data?.shipmentAddress?.city) || "");
                setCustomerDistrict(data.customer_district || (data.raw_data?.shipmentAddress?.district) || "");
                setCustomerAddress(data.delivery_address || (data.raw_data?.shipmentAddress?.fullAddress) || "");
                setPaymentMethod(data.payment_method || "Havale/EFT");
                setOrderNote(data.notes || "");
                setOrderStatus(data.status || "Yeni");
                setCargoProvider(data.cargo_provider_name || "");
                setCargoTracking(data.cargo_tracking_number || "");
                setShippingCost(data.manual_shipping_cost || (data.raw_data?.manual_shipping_cost) || 0);
                setDiscount(data.discount_amount || (data.raw_data?.discount_amount) || 0);

                const raw = data.raw_data || {};
                const lines = raw.lines || raw.items || raw.line_items || [];
                const mappedCart: OrderLine[] = lines.map((l: any) => ({
                    productId: l.productId || 0,
                    productName: l.productName || l.name,
                    sku: l.merchantSku || l.sku || l.barcode,
                    quantity: Number(l.quantity),
                    unitPrice: Number(l.price || l.amount),
                    taxRate: l.vatRate || 20,
                    imageUrl: l.imageUrl || l.image_url
                }));

                setCart(mappedCart);
                setOriginalCart(JSON.parse(JSON.stringify(mappedCart)));

            } catch (e: any) {
                toast.error("Yükleme hatası: " + e.message);
                router.push('/siparisler');
            } finally {
                setIsLoading(false);
            }
        }
        fetchOrder();
    }, [editId]);

    // --- CART ACTIONS ---
    const addToCart = (product: Product) => {
        const existing = cart.find(i => i.productId === product.id);
        if (existing) {
            setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, {
                productId: product.id,
                productName: product.name,
                sku: product.code,
                quantity: 1,
                unitPrice: product.price,
                taxRate: 20,
                imageUrl: product.image_url
            }]);
        }
        setSearchTerm("");
        setSearchResults([]);
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const updateCartItem = (index: number, field: keyof OrderLine, value: any) => {
        const newCart = [...cart];
        newCart[index] = { ...newCart[index], [field]: value };
        setCart(newCart);
    };

    // --- SUBMIT (SERVER ACTION) ---
    const handleSubmit = async () => {
        if (!customerName) return toast.error("Müşteri Adı zorunludur.");
        if (cart.length === 0) return toast.error("En az 1 adet ürün eklemelisiniz.");

        setIsSubmitting(true);
        try {
            const orderNumber = editId ? (cart[0]?.sku ? `MAN-${cart[0].sku}-${Math.floor(Math.random() * 1000)}` : `MAN-${editId}`) : `MAN-${Math.floor(Date.now() / 1000)}`;

            const rawData = {
                id: orderNumber,
                orderNumber: orderNumber,
                orderDate: new Date().toISOString(),
                status: orderStatus,
                customerFirstName: customerName,
                customerLastName: "",
                customerId: customerPhone,
                cargoProviderName: cargoProvider,
                cargoTrackingNumber: cargoTracking,
                shipmentAddress: {
                    fullName: customerName,
                    fullAddress: customerAddress,
                    city: customerCity,
                    district: customerDistrict,
                    phone: customerPhone
                },
                lines: cart.map(item => ({
                    quantity: item.quantity,
                    price: item.unitPrice,
                    amount: item.unitPrice,
                    productName: item.productName,
                    merchantSku: item.sku,
                    productId: item.productId,
                    imageUrl: item.imageUrl,
                    vatBaseAmount: item.unitPrice / (1 + item.taxRate / 100),
                    vatRate: item.taxRate
                })),
                totalPrice: grandTotal,
                manual_shipping_cost: shippingCost,
                discount_amount: discount,
                paymentMethod: paymentMethod, // Added for safe keeping
                manualSource: source,        // Added for safe keeping
                notes: orderNote             // Added for safe keeping
            };

            const payload = {
                id: editId ? parseInt(editId!) : undefined,
                orderData: {
                    store_id: null, // Fixed: "MANUAL" string causes invalid input syntax for type bigint
                    order_number: orderNumber,
                    customer_name: customerName,
                    status: orderStatus,
                    total_price: grandTotal,
                    platform: 'Manuel', // Keep this as identifier
                    // REMOVED potential non-existent columns to fix Insert Error
                    // manual_source: source,
                    // customer_phone: customerPhone,
                    // customer_city: customerCity, 
                    // customer_district: customerDistrict,
                    // delivery_address: customerAddress,
                    // payment_method: paymentMethod,
                    // cargo_tracking_number: cargoTracking,
                    // cargo_provider_name: cargoProvider,
                    // notes: orderNote,
                    // is_manual: true,
                    // product_count: cart.reduce((a, b) => a + b.quantity, 0),
                    // product_name: cart.map(c => c.productName).join(', '),
                    // product_code: cart.map(c => c.sku).join(', '),
                    // img_url: cart[0]?.imageUrl || "",
                    // manual_shipping_cost: shippingCost,
                    // discount_amount: discount,
                    raw_data: rawData
                },
                cart: cart,
                originalCart: originalCart
            };

            await saveManualOrderAction(payload, !!editId);

            toast.success(editId ? "Sipariş güncellendi." : "Sipariş oluşturuldu.");
            router.push('/siparisler');
        } catch (error: any) {
            console.error(error);
            toast.error("İşlem hatası: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0B1120] text-white"><Loader2 className="animate-spin mr-2" /> Sipariş yükleniyor...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-blue-500" /> {editId ? `Sipariş Düzenle (#${editId})` : 'Manuel Sipariş Girişi'}
                </h1>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 transition"
                >
                    <ArrowLeft size={16} className="inline mr-1" /> İptal & Geri Dön
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SOL KOLON: Müşteri Bilgileri */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <User size={18} className="text-purple-500" /> Müşteri Bilgileri
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Sipariş Kaynağı</label>
                                <select
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none"
                                    value={source} onChange={e => setSource(e.target.value)}
                                >
                                    <option value="Instagram">Instagram</option>
                                    <option value="Whatsapp">Whatsapp</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Telefon">Telefon</option>
                                    <option value="Mağaza">Mağaza (Fiziksel)</option>
                                    <option value="Diğer">Diğer</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Ad Soyad <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none"
                                    placeholder="Örn: Ahmet Yılmaz"
                                    value={customerName} onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Telefon <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="tel"
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-lg pl-9 p-2.5 text-white text-sm focus:border-purple-500 outline-none"
                                        placeholder="5XX..."
                                        value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">İl</label>
                                    <input type="text" className="w-full bg-[#1F2937] border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                                        value={customerCity} onChange={e => setCustomerCity(e.target.value)} placeholder="İl" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">İlçe</label>
                                    <input type="text" className="w-full bg-[#1F2937] border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                                        value={customerDistrict} onChange={e => setCustomerDistrict(e.target.value)} placeholder="İlçe" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Açık Adres</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-3 text-gray-500" />
                                    <textarea
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-lg pl-9 p-2.5 text-white text-sm focus:border-purple-500 outline-none min-h-[80px] resize-none"
                                        placeholder="Mahalle, Cadde, Sokak, No..."
                                        value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Sipariş Notu</label>
                                <textarea
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none min-h-[60px] resize-none"
                                    placeholder="Varsa özel not..."
                                    value={orderNote} onChange={e => setOrderNote(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SAĞ KOLON: Ürün Seçimi ve Özet */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Ürün Arama */}
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Box size={18} className="text-blue-500" /> Ürün Ekle
                        </h2>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                className="w-full bg-[#1F2937] border border-gray-700 rounded-lg pl-10 p-2.5 text-white focus:border-blue-500 outline-none"
                                placeholder="Ürün adı, barkod veya stok kodu ara..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            />
                            {isSearching && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}

                            {/* Arama Sonuçları Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-[#1F2937] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {searchResults.map(prod => (
                                        <div
                                            key={prod.id}
                                            className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 flex justify-between items-center group"
                                            onClick={() => addToCart(prod)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {prod.image_url ? (
                                                    <img src={prod.image_url} className="w-10 h-10 object-cover rounded bg-gray-800" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center text-xs">Yok</div>
                                                )}
                                                <div>
                                                    <div className="text-sm text-white font-medium">{prod.name}</div>
                                                    <div className="text-xs text-gray-400">{prod.code} • Stok: {prod.stock}</div>
                                                </div>
                                            </div>
                                            <div className="mr-2 opacity-0 group-hover:opacity-100 transition text-blue-400">
                                                <Plus size={18} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sepet Tablosu */}
                        <div className="overflow-x-auto border border-gray-700 rounded-lg">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-400 uppercase bg-[#1F2937]">
                                    <tr>
                                        <th className="px-4 py-3">Ürün</th>
                                        <th className="px-4 py-3 text-center">Adet</th>
                                        <th className="px-4 py-3 text-right">Birim Fiyat</th>
                                        <th className="px-4 py-3 text-right">Toplam</th>
                                        <th className="px-4 py-3 text-center">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                Henüz ürün eklenmedi.
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800/50">
                                                <td className="px-4 py-3 font-medium text-white">
                                                    <div>{item.productName}</div>
                                                    <div className="text-xs text-gray-500">{item.sku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number" min="1"
                                                        className="w-16 bg-[#111827] border border-gray-600 rounded p-1 text-center text-white focus:border-blue-500"
                                                        value={item.quantity}
                                                        onChange={e => updateCartItem(idx, 'quantity', Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        className="w-24 bg-[#111827] border border-gray-600 rounded p-1 text-right text-white focus:border-blue-500"
                                                        value={item.unitPrice}
                                                        onChange={e => updateCartItem(idx, 'unitPrice', Number(e.target.value))}
                                                    />TL
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-white">
                                                    {(item.quantity * item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-400 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Finansal Özet */}
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CreditCard size={18} className="text-green-500" /> Ödeme & Tutar
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Ödeme Yöntemi</label>
                                    <select
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-green-500 outline-none"
                                        value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="Havale / EFT">Havale / EFT</option>
                                        <option value="Nakit">Nakit</option>
                                        <option value="Kredi Kartı">Kredi Kartı</option>
                                        <option value="Kapıda Ödeme - Nakit">Kapıda Ödeme - Nakit</option>
                                        <option value="Kapıda Ödeme - Kredi Kartı">Kapıda Ödeme - Kredi Kartı</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-[#1F2937] p-4 rounded-lg space-y-3">
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Ara Toplam</span>
                                    <span>{subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm items-center">
                                    <div className="flex items-center gap-1"><Truck size={14} /> Kargo Ücreti</div>
                                    <input
                                        type="number" min="0"
                                        className="w-20 bg-[#111827] border border-gray-600 rounded p-1 text-right text-white text-xs"
                                        value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm items-center">
                                    <div className="flex items-center gap-1"><Percent size={14} /> İndirim</div>
                                    <input
                                        type="number" min="0"
                                        className="w-20 bg-[#111827] border border-gray-600 rounded p-1 text-right text-white text-xs"
                                        value={discount} onChange={e => setDiscount(Number(e.target.value))}
                                    />
                                </div>
                                <div className="h-px bg-gray-600 my-2"></div>
                                <div className="flex justify-between text-white font-bold text-lg">
                                    <span>GENEL TOPLAM</span>
                                    <span>{grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-green-900/20 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <span className="animate-spin">⌛</span> : <Save size={20} />}
                                Siparişi Oluştur
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function ManualOrderEntry() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0B1120] text-white"><Loader2 className="animate-spin mr-2" /> Yükleniyor...</div>}>
            <ManualOrderContent />
        </Suspense>
    );
}
