"use client";

import { useState, useEffect } from 'react';
import { Building2, Phone, Mail, ArrowLeft, FileText, Wallet, ArrowUpRight, ArrowDownRight, Plus, X, RefreshCw, Eye, Edit, Trash2, Banknote, CreditCard, Landmark, ScrollText, Bitcoin, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

// Server Actions
import {
    getSupplierByIdAction,
    getSupplierMovementsAction,
    addSupplierPaymentAction,
    deleteSupplierPaymentAction
} from '@/app/actions/supplierActions';
import { getFinancialAccountsAction } from '@/app/actions/financeActions';
import { getPurchaseInvoiceItemsAction } from '@/app/actions/invoiceActions';

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [supplier, setSupplier] = useState<any>(null);
    const [movements, setMovements] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // MODALLAR
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Edit logic might need separate action or simplified for now

    // SEÇİLİ İŞLEM VERİLERİ
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

    // ÖDEME FORMU
    const [payment, setPayment] = useState({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        account_id: "",
        method: "Nakit",
        description: ""
    });

    const paymentMethods = [
        { id: "Nakit", icon: <Banknote size={16} />, label: "Nakit" },
        { id: "Kredi Kartı", icon: <CreditCard size={16} />, label: "Kredi Kartı" },
        { id: "Havale/EFT", icon: <Landmark size={16} />, label: "Havale/EFT" },
        { id: "Çek", icon: <ScrollText size={16} />, label: "Çek" },
        { id: "Senet", icon: <FileText size={16} />, label: "Senet" },
        { id: "Kripto", icon: <Bitcoin size={16} />, label: "Kripto" },
    ];

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    async function fetchData() {
        setLoading(true);
        try {
            const [sup, movementsData, accs] = await Promise.all([
                getSupplierByIdAction(id),
                getSupplierMovementsAction(id),
                getFinancialAccountsAction()
            ]);

            setSupplier(sup);
            setAccounts(accs || []);

            // Normalize Movements
            const combined = [
                ...(movementsData.invoices || []).map((i: any) => ({
                    ...i, source: 'invoice', type: 'Fatura', date: i.issue_date, amount: i.total_amount, desc: `Fatura: ${i.invoice_no}`, original_id: i.id
                })),
                ...(movementsData.payments || []).map((p: any) => ({
                    ...p, source: 'payment', type: 'Ödeme', date: p.date, amount: p.amount, desc: p.description, original_id: p.id
                }))
            ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setMovements(combined);

        } catch (error: any) {
            console.error(error);
            toast.error("Veri yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    // --- ÖDEME YAPMA İŞLEMİ ---
    async function handlePayment() {
        if (!payment.amount) return toast.error("Tutar giriniz");
        if (!payment.account_id && payment.method !== 'Çek' && payment.method !== 'Senet') return toast.error("Kasa/Banka seçiniz");

        const amount = Number(payment.amount);
        const accountId = payment.account_id ? Number(payment.account_id) : null;

        try {
            await addSupplierPaymentAction({
                supplier_id: Number(id),
                account_id: accountId,
                amount: amount,
                date: payment.date,
                description: payment.description,
                method: payment.method
            });

            toast.success("Ödeme başarıyla işlendi!");
            setIsPayModalOpen(false);
            setPayment({ amount: "", date: new Date().toISOString().split('T')[0], account_id: "", method: "Nakit", description: "" });
            fetchData(); // Refresh UI
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    // --- DETAY GÖR ---
    async function openDetail(item: any) {
        setSelectedItem(item);
        if (item.source === 'invoice') {
            try {
                const items = await getPurchaseInvoiceItemsAction(item.original_id);
                setInvoiceItems(items || []);
            } catch (e) { console.error(e) }
        }
        setIsDetailModalOpen(true);
    }

    // --- SİLME ---
    async function handleDelete(item: any) {
        if (!confirm("Bu işlemi silmek istediğine emin misin? Bakiyeler geri alınacak.")) return;

        try {
            if (item.source === 'payment') {
                await deleteSupplierPaymentAction(item.original_id, Number(id), item.amount, item.account_id);
                toast.success("Ödeme silindi ve bakiyeler güncellendi.");
                fetchData();
            }
            else if (item.source === 'invoice') {
                // Fatura silme işlemi henüz implemente edilmedi (fatura sayfasından yapılması önerilir)
                // Ancak burada basitçe hata verelim veya implemente edelim.
                // Şimdilik pasif.
                toast.info("Faturaları 'Faturalar' sayfasından silmeniz önerilir.");
            }

        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    if (loading) return <div className="w-full h-full flex items-center justify-center bg-[#0B1120] text-gray-500"><RefreshCw className="animate-spin mr-2" /> Yükleniyor...</div>;

    if (!supplier) return <div className="text-white p-8">Tedarikçi bulunamadı.</div>;

    return (
        <div className="w-full h-full bg-[#0B1120]">
            <main className="flex-1 overflow-y-auto h-full">

                {/* HEADER */}
                <header className="px-8 py-6 border-b border-gray-800/50 bg-[#0B1120] flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Building2 className="text-blue-500" /> {supplier?.name}</h2>
                            <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><Phone size={12} /> {supplier?.phone || "-"}</span>
                                <span className="flex items-center gap-1"><Mail size={12} /> {supplier?.email || "-"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GÜNCEL BAKİYE</p>
                            <p className={`text-3xl font-black ${supplier.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                ₺{(supplier.balance || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-gray-500">{supplier.balance < 0 ? "Borçluyuz" : "Alacaklıyız"}</p>
                        </div>
                        <button onClick={() => setIsPayModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                            <Wallet size={18} /> ÖDEME YAP
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    {/* ÖZET KARTLAR */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                            <div className="p-3 bg-blue-900/20 rounded-lg text-blue-500"><FileText size={24} /></div>
                            <div><p className="text-gray-400 text-xs font-bold uppercase">Toplam Fatura</p><h3 className="text-2xl font-bold text-white">{movements.filter(m => m.type === 'Fatura').length}</h3></div>
                        </div>
                        <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                            <div className="p-3 bg-red-900/20 rounded-lg text-red-500"><ArrowDownRight size={24} /></div>
                            <div><p className="text-gray-400 text-xs font-bold uppercase">Toplam Borç</p><h3 className="text-2xl font-bold text-white">₺{movements.filter(m => m.type === 'Fatura').reduce((a, b) => a + (b.amount || 0), 0).toLocaleString()}</h3></div>
                        </div>
                        <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 flex items-center gap-4">
                            <div className="p-3 bg-green-900/20 rounded-lg text-green-500"><ArrowUpRight size={24} /></div>
                            <div><p className="text-gray-400 text-xs font-bold uppercase">Toplam Ödenen</p><h3 className="text-2xl font-bold text-white">₺{movements.filter(m => m.type === 'Ödeme').reduce((a, b) => a + (b.amount || 0), 0).toLocaleString()}</h3></div>
                        </div>
                    </div>

                    {/* HAREKET TABLOSU */}
                    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-800 bg-[#161f32] flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2"><FileText size={18} /> Hesap Hareketleri (Ekstre)</h3>
                            <button onClick={fetchData} className="text-gray-400 hover:text-white"><RefreshCw size={16} /></button>
                        </div>
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-[#0f1623] text-gray-300 font-bold uppercase text-[10px]">
                                <tr><th className="px-6 py-4">Tarih</th><th>İşlem Türü</th><th>Açıklama</th><th className="text-right">Tutar</th><th className="px-6 py-4 text-right">İşlemler</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {movements.map((m, i) => (
                                    <tr key={i} className="hover:bg-[#1F2937]/50 transition group">
                                        <td className="px-6 py-4 text-xs font-mono text-white">{new Date(m.date).toLocaleDateString('tr-TR')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${m.type === 'Fatura' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                                {m.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white">
                                            {m.desc}
                                            <span className="text-gray-500 text-xs ml-2">
                                                {m.financial_accounts ? `(${m.financial_accounts.name})` : ''}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold text-base ${m.type === 'Fatura' ? 'text-red-400' : 'text-green-400'}`}>
                                            {m.type === 'Fatura' ? '-' : '+'}₺{(m.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openDetail(m)} className="text-blue-400 hover:text-white" title="Detay"><Eye size={16} /></button>
                                            {m.source === 'payment' && <button onClick={() => handleDelete(m)} className="text-red-500 hover:text-white" title="Sil"><Trash2 size={16} /></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {movements.length === 0 && <div className="p-12 text-center text-gray-500">Hareket yok.</div>}
                    </div>
                </div>

                {/* --- ÖDEME MODALI --- */}
                {isPayModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Wallet size={20} className="text-green-500" /> Ödeme Girişi</h3>
                                <button onClick={() => setIsPayModalOpen(false)}><X className="text-gray-500 hover:text-white" /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Ödeme Yöntemi Seçimi */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1.5 font-bold">ÖDEME YÖNTEMİ</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {paymentMethods.map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPayment({ ...payment, method: method.id })}
                                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition ${payment.method === method.id ? 'bg-green-600 text-white border-green-500' : 'bg-[#0f1623] border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                            >
                                                {method.icon}
                                                <span className="mt-1">{method.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 block mb-1.5 font-bold">KAYNAK HESAP (KASA/BANKA)</label>
                                    <select className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500" value={payment.account_id} onChange={e => setPayment({ ...payment, account_id: e.target.value })}>
                                        <option value="">Hesap Seçiniz...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Mevcut: {a.balance} TL)</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1.5 font-bold">TUTAR (TL)</label>
                                        <input type="number" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-green-400 font-black text-lg outline-none focus:border-green-500" placeholder="0.00" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1.5 font-bold">TARİH</label>
                                        <input type="date" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500" value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 block mb-1.5 font-bold">AÇIKLAMA</label>
                                    <input type="text" className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500" placeholder="Örn: Şubat ayı hammadde ödemesi" value={payment.description} onChange={e => setPayment({ ...payment, description: e.target.value })} />
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-800">
                                <button onClick={handlePayment} className="w-full bg-green-600 hover:bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95">
                                    <CheckCircle size={18} /> ÖDEMEYİ ONAYLA
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAY MODALI */}
                {isDetailModalOpen && selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95">
                            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button>
                            <h3 className="text-white font-bold text-lg mb-1">{selectedItem.type === 'Fatura' ? 'Fatura Detayı' : 'Ödeme Detayı'}</h3>
                            <p className="text-xs text-gray-500 mb-4">{new Date(selectedItem.date).toLocaleDateString('tr-TR')}</p>

                            {selectedItem.type === 'Fatura' ? (
                                <div className="bg-[#0f1623] rounded-lg border border-gray-800 overflow-hidden">
                                    <div className="p-2 bg-gray-800 text-[10px] text-gray-400 font-bold flex justify-between px-4">
                                        <span>MALZEME</span>
                                        <span>TUTAR</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {invoiceItems.map((item, i) => (
                                            <div key={i} className="flex justify-between p-3 border-b border-gray-800 text-sm hover:bg-gray-800/30">
                                                <div>
                                                    <p className="text-white font-medium">{item.raw_materials?.name}</p>
                                                    <p className="text-gray-400">{item.quantity} {item.raw_materials?.unit} x ₺{item.unit_price}</p>
                                                </div>
                                                <span className="text-white font-bold">₺{item.total_price.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-gray-900 text-right border-t border-gray-800">
                                        <span className="text-xs text-gray-400 mr-2">GENEL TOPLAM:</span>
                                        <span className="text-lg font-black text-white">₺{(selectedItem.amount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[#0f1623] p-4 rounded-xl border border-gray-800 text-sm space-y-3">
                                    <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-gray-500">Tutar</span>
                                        <span className="text-green-400 font-bold text-xl">₺{(selectedItem.amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Ödeme Yöntemi</span>
                                        <span className="text-white">{selectedItem.category}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Kaynak Hesap</span>
                                        <span className="text-blue-400 font-mono">{selectedItem.financial_accounts?.name}</span>
                                    </div>
                                    <div className="bg-gray-800/50 p-3 rounded-lg text-gray-300 text-xs italic mt-2">
                                        "{selectedItem.desc}"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}