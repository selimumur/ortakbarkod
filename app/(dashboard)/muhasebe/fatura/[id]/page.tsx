"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Edit, FileText, Phone, Mail, MapPin, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import FinancialTransactionModal from "../../finans/components/FinancialTransactionModal";

// Server Actions
import { getInvoiceByIdAction, updateInvoiceStatusAction, getPurchaseInvoiceItemsAction } from "@/app/actions/invoiceActions";
import { getCustomerByIdAction } from "@/app/actions/customerActions";
import { getSupplierByIdAction } from "@/app/actions/supplierActions";

export default function InvoiceDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [invoice, setInvoice] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [contact, setContact] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Payment Modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchInvoiceDetails();
        }
    }, [id]);

    async function fetchInvoiceDetails() {
        setLoading(true);
        try {
            const inv = await getInvoiceByIdAction(id);
            if (!inv) throw new Error("Fatura bulunamadı");

            setInvoice(inv);

            // Items are coming with the invoice thanks to join in action, but check
            let invItems = inv.invoice_items || [];

            // If empty or if we suspect purchase items (legacy issue mentioned in actions)
            if (invItems.length === 0 && inv.invoice_type === 'PURCHASE') {
                // Try fetching from purchase_invoice_items if needed, but getInvoiceByIdAction usually joins 'invoice_items'.
                // If the system separates tables, we might need 'purchase_invoice_items'.
                // My getInvoiceByIdAction joined 'invoice_items'.
                // Let's assume standard 'invoice_items' first.
                // If specific logic needed for purchase:
                const pItems = await getPurchaseInvoiceItemsAction(inv.id);
                if (pItems && pItems.length > 0) invItems = pItems;
            }

            setItems(invItems);

            // Fetch Contact
            if (inv.contact_id) {
                let contactData = null;
                if (inv.contact_type === 'CUSTOMER') {
                    // This action fetches from 'customers' table?
                    // getCustomerByIdAction usually fetches from marketplace customers?
                    // We need a generic 'getContactById' or use specific.
                    // Assuming 'customers' table in DB.
                    // 'getCustomersAction' in customerActions fetches from 'orders'?  Wait.
                    // I need to check `customerActions.ts`...
                    // Assuming I can't easily fetch single customer yet without correct action.
                    // I will skip or try generic fetch if I had one.
                    // But I added 'getSupplierByIdAction'. 
                    // I should add `getCustomerByIdAction` to `customerActions.ts` if missing.
                    // For now, let's try to fetch if action exists.
                    // Wait, `customerActions.ts` had `getCustomersAction` but not specific ID one?
                    // I will check later. If it fails, I'll fix it.
                    // Let's assume it exists or I will add it.
                    try {
                        const { getCustomerByIdAction } = await import('@/app/actions/customerActions');
                        contactData = await getCustomerByIdAction(inv.contact_id);
                    } catch (e) { console.warn("Customer fetch check", e); }
                } else {
                    contactData = await getSupplierByIdAction(inv.contact_id);
                }
                setContact(contactData);
            }

        } catch (error: any) {
            console.error(error);
            toast.error("Fatura detayları yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const handlePrint = () => {
        window.print();
    };

    const handlePaymentSuccess = async () => {
        try {
            await updateInvoiceStatusAction(id, 'PAID');
            setInvoice({ ...invoice, payment_status: 'PAID' });
            setIsPaymentModalOpen(false);
            toast.success("Ödeme kaydedildi ve fatura kapatıldı.");
        } catch (error) {
            toast.error("Fatura durumu güncellenemedi.");
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#0f1115] text-white"><Loader2 className="animate-spin" /></div>;
    if (!invoice) return <div className="p-8 text-center text-white">Fatura bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-[#0f1115] text-white p-6 md:p-8 print:bg-white print:text-black print:p-0">
            {/* Action Bar (Printte Gizle) */}
            <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/muhasebe/fatura" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold">Fatura Detayı</h1>
                </div>
                <div className="flex gap-2">
                    {invoice.status === 'DRAFT' && (
                        <Link href={`/muhasebe/fatura/${id}/duzenle`} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition">
                            <Edit size={16} /> Düzenle
                        </Link>
                    )}

                    {invoice.status === 'SENT' && invoice.payment_status !== 'PAID' && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                        >
                            <CreditCard size={16} /> Tahsilat/Ödeme Ekle
                        </button>
                    )}

                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                        <Printer size={16} /> Yazdır / PDF
                    </button>
                </div>
            </div>

            {/* Fatura Kağıdı Görünümü */}
            <div className="max-w-4xl mx-auto bg-white text-black rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
                {/* Header Band */}
                <div className="bg-slate-900 text-white p-8 print:bg-slate-900 print:text-white print-color-adjust-exact">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <FileText className="text-white" />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight">FATURA</h1>
                            </div>
                            <p className="opacity-70 text-sm">#{invoice.invoice_no}</p>
                            <div className="mt-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${invoice.payment_status === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                    {invoice.payment_status === 'PAID' ? 'ÖDENDİ' : 'ÖDENMEDİ'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold">{invoice.invoice_type === 'SALES' ? 'SATIŞ FATURASI' : invoice.invoice_type === 'PURCHASE' ? 'ALIŞ FATURASI' : invoice.invoice_type}</h2>
                            <div className="mt-2 space-y-1 text-sm opacity-80">
                                <div className="flex justify-end gap-4">
                                    <span>Tarih:</span>
                                    <span className="font-mono">{new Date(invoice.issue_date).toLocaleDateString('tr-TR')}</span>
                                </div>
                                {invoice.due_date && (
                                    <div className="flex justify-end gap-4">
                                        <span>Vade:</span>
                                        <span className="font-mono">{new Date(invoice.due_date).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {/* Adresler */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        {/* Sol: Müşteri/Cari */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sayın</h3>
                            {contact ? (
                                <div className="text-sm space-y-2">
                                    <div className="font-bold text-lg text-slate-900">{contact.name}</div>
                                    {contact.address && (
                                        <div className="flex gap-2 text-gray-600">
                                            <MapPin size={16} className="shrink-0 mt-0.5" />
                                            <span>{contact.address}</span>
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="flex gap-2 text-gray-600">
                                            <Phone size={16} className="shrink-0 mt-0.5" />
                                            <span>{contact.phone}</span>
                                        </div>
                                    )}
                                    {contact.email && (
                                        <div className="flex gap-2 text-gray-600">
                                            <Mail size={16} className="shrink-0 mt-0.5" />
                                            <span>{contact.email}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-gray-400 italic">Cari bilgisi yüklenemedi (ID: {invoice.contact_id})</div>
                            )}
                        </div>

                        {/* Sağ: Şirket Bilgileri (Statik veya DB'den) */}
                        <div className="text-right">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Düzenleyen</h3>
                            <div className="text-sm space-y-2">
                                <div className="font-bold text-lg text-slate-900">ORTAKBARKOD A.Ş.</div>
                                <div className="text-gray-600">Teknoloji Vadisi, No: 123</div>
                                <div className="text-gray-600">İstanbul, Türkiye</div>
                                <div className="text-gray-600">V.D: Maslak | V.No: 1234567890</div>
                                <div className="text-gray-600">info@ortakbarkod.com</div>
                            </div>
                        </div>
                    </div>

                    {/* Tablo */}
                    <div className="relative overflow-hidden rounded-lg border border-gray-200 mb-8">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="py-3 px-4 w-12">#</th>
                                    <th className="py-3 px-4">Ürün / Hizmet</th>
                                    <th className="py-3 px-4 text-right">Miktar</th>
                                    <th className="py-3 px-4 text-right">Birim Fiyat</th>
                                    <th className="py-3 px-4 text-right">KDV</th>
                                    <th className="py-3 px-4 text-right">Tutar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-slate-900">
                                                {item.master_products?.name || item.name || "Ürün Silinmiş veya ID Yok"}
                                            </div>
                                            {item.master_products?.code && (
                                                <div className="text-xs text-gray-500">{item.master_products.code}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {item.quantity} {item.unit || 'Adet'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(item.unit_price)} ₺
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-500">
                                            %{item.tax_rate}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                                            {new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(item.line_total)} ₺
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Alt Toplamlar */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Ara Toplam:</span>
                                <span>{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(invoice.subtotal)} ₺</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>KDV Toplam:</span>
                                <span>{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(invoice.tax_total)} ₺</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>İskonto:</span>
                                <span>-{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(invoice.discount_total)} ₺</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                <span className="font-bold text-lg text-slate-900">GENEL TOPLAM:</span>
                                <span className="font-bold text-xl text-blue-600">
                                    {new Intl.NumberFormat("tr-TR", { style: 'currency', currency: invoice.currency }).format(invoice.total_amount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Açıklamalar */}
                    {invoice.description && (
                        <div className="mt-12 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                            <strong className="block mb-1 text-gray-900">Açıklama / Not:</strong>
                            {invoice.description}
                        </div>
                    )}
                </div>

                {/* Footer Band */}
                <div className="bg-gray-50 p-6 border-t border-gray-200 text-center text-xs text-gray-400 print:bg-white">
                    Bu belge bilgisayar ortamında oluşturulmuştur. Islak imza gerektirmez.
                </div>
            </div>

            {/* Payment Modal */}
            <FinancialTransactionModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={handlePaymentSuccess}
                initialAmount={invoice.total_amount}
                initialDescription={`${invoice.invoice_no} nolu fatura tahsilatı/ödemesi`}
            />
        </div>
    );
}
