"use client";

import { useState, useEffect } from 'react';
import {
    ScrollText, Plus, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getChequesNotesAction, addChequeNoteAction, getFinanceDropdownsAction } from '@/app/actions/financeActions';

export default function ChequeNotePage() {
    // TABLAR: Alınan Çek, Verilen Çek, Alınan Senet, Verilen Senet
    type TabType = 'cheque_in' | 'cheque_out' | 'note_in' | 'note_out';
    const [activeTab, setActiveTab] = useState<TabType>('cheque_in');

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<any[]>([]); // Müşteri veya Tedarikçi listesi

    // MODAL STATE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        document_no: "",
        bank_name: "",
        contact_id: "",
        issue_date: new Date().toISOString().split('T')[0],
        due_date: "",
        amount: "",
        description: "" // Fixed typo in previous code which had description but typed as string
    });

    useEffect(() => {
        fetchData();
        fetchContacts();
    }, [activeTab]);

    async function fetchContacts() {
        // We can fetch all contacts effectively or depends on direction
        const result = await getFinanceDropdownsAction();
        // result.contacts has type 'customer' or 'supplier'.
        setContacts(result.contacts || []);
    }

    async function fetchData() {
        setLoading(true);
        try {
            const [type, direction] = activeTab === 'cheque_in' ? ['CHEQUE', 'IN'] :
                activeTab === 'cheque_out' ? ['CHEQUE', 'OUT'] :
                    activeTab === 'note_in' ? ['PROMISSORY_NOTE', 'IN'] :
                        ['PROMISSORY_NOTE', 'OUT'];

            const data = await getChequesNotesAction(type as any, direction as any);
            setItems(data || []);
        } catch (error: any) {
            console.error("Hata:", error);
            toast.error("Veriler yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    // Filter contacts based on current tab direction
    // IN -> Alınan -> From Customer
    // OUT -> Verilen -> To Supplier
    // But sometimes we might take from supplier (refund)? Usually: 
    // In code: direction === 'IN' ? 'customers' : 'suppliers'
    const filteredContacts = contacts.filter(c =>
        (activeTab.includes('in') && c.type === 'customer') ||
        (activeTab.includes('out') && c.type === 'supplier')
    );

    async function handleSave() {
        if (!newItem.document_no || !newItem.amount || !newItem.due_date || !newItem.contact_id) {
            toast.error("Lütfen zorunlu alanları doldurun.");
            return;
        }

        try {
            const [type, direction] = activeTab === 'cheque_in' ? ['CHEQUE', 'IN'] :
                activeTab === 'cheque_out' ? ['CHEQUE', 'OUT'] :
                    activeTab === 'note_in' ? ['PROMISSORY_NOTE', 'IN'] :
                        ['PROMISSORY_NOTE', 'OUT'];

            await addChequeNoteAction({
                type,
                direction,
                document_no: newItem.document_no,
                bank_name: newItem.bank_name,
                contact_id: Number(newItem.contact_id),
                issue_date: newItem.issue_date,
                due_date: newItem.due_date,
                amount: Number(newItem.amount),
                description: newItem.description
            });

            toast.success("Kayıt oluşturuldu!");
            setIsModalOpen(false);
            setNewItem({ document_no: "", bank_name: "", contact_id: "", issue_date: new Date().toISOString().split('T')[0], due_date: "", amount: "", description: "" });
            fetchData();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    // Yardımcı: Status Badge Rengi
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PORTFOLIO': return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">PORTFÖYDE</span>;
            case 'COLLECTED': return <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">TAHSİL EDİLDİ</span>;
            case 'BOUNCED': return <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">KARŞILIKSIZ</span>;
            case 'ENDORSED': return <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded border border-orange-500/20">CİRO EDİLDİ</span>;
            case 'PAID': return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 text-xs rounded border border-gray-500/20">ÖDENDİ</span>;
            default: return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 text-xs rounded">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* BAŞLIK */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <ScrollText className="text-purple-500" /> Çek & Senet Yönetimi
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Alınan ve verilen kıymetli evrakların vadelerini ve durumlarını takip edin.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-purple-900/20"
                >
                    <Plus size={20} /> Yeni Kayıt
                </button>
            </div>

            {/* TABLAR */}
            <div className="flex p-1 bg-[#1e293b] rounded-xl border border-white/5 w-fit">
                {[
                    { id: 'cheque_in', label: 'Alınan Çekler' },
                    { id: 'cheque_out', label: 'Verilen Çekler' },
                    { id: 'note_in', label: 'Alınan Senetler' },
                    { id: 'note_out', label: 'Verilen Senetler' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === tab.id
                            ? 'bg-purple-500 text-white shadow'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TABLO */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
            ) : (
                <div className="bg-[#1e293b] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-black/20 text-gray-400 text-xs uppercase font-bold border-b border-white/5">
                                    <th className="p-4">Vade Tarihi</th>
                                    <th className="p-4">Evrak No</th>
                                    <th className="p-4">{activeTab.includes('_in') ? 'Kimden Alındı (Cari)' : 'Kime Verildi (Cari)'}</th>
                                    <th className="p-4">{activeTab.includes('cheque') ? 'Banka Adı' : 'Açıklama'}</th>
                                    <th className="p-4 text-right">Tutar</th>
                                    <th className="p-4 text-center">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                {items.map((item) => {
                                    // Cari Adını Bul (Basit Eşleştirme)
                                    const contactName = contacts.find(c => c.id === item.contact_id)?.name || "Bilinmiyor";
                                    return (
                                        <tr key={item.id} className="hover:bg-white/5 transition group">
                                            <td className="p-4 font-mono text-white">
                                                {new Date(item.due_date).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="p-4 font-mono">{item.document_no}</td>
                                            <td className="p-4 font-medium text-white">{contactName}</td>
                                            <td className="p-4">{activeTab.includes('cheque') ? item.bank_name : item.description}</td>
                                            <td className="p-4 text-right font-black text-white text-base">
                                                {Number(item.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </td>
                                            <td className="p-4 text-center">
                                                {getStatusBadge(item.status)}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-500">
                                            Bu kategoride kayıt bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white">
                                {activeTab === 'cheque_in' && "Yeni Alınan Çek"}
                                {activeTab === 'cheque_out' && "Yeni Verilen Çek"}
                                {activeTab === 'note_in' && "Yeni Alınan Senet"}
                                {activeTab === 'note_out' && "Yeni Verilen Senet"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Evrak No</label>
                                    <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newItem.document_no} onChange={e => setNewItem({ ...newItem, document_no: e.target.value })} placeholder="Çek/Senet No" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Vade Tarihi</label>
                                    <input type="date" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newItem.due_date} onChange={e => setNewItem({ ...newItem, due_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">
                                    {activeTab.includes('_in') ? 'Müşteri (Kimden)' : 'Tedarikçi (Kime)'}
                                </label>
                                <select
                                    className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                    value={newItem.contact_id}
                                    onChange={e => setNewItem({ ...newItem, contact_id: e.target.value })}
                                >
                                    <option value="">Seçiniz...</option>
                                    {filteredContacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {activeTab.includes('cheque') && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Banka Adı</label>
                                    <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newItem.bank_name} onChange={e => setNewItem({ ...newItem, bank_name: e.target.value })} placeholder="Ör: Garanti, Akbank" />
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Tutar (₺)</label>
                                <input type="number" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white font-bold text-lg"
                                    value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} placeholder="0.00" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Açıklama</label>
                                <textarea className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white h-24 resize-none"
                                    value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Notlar..." />
                            </div>

                            <button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl text-white font-bold transition shadow-lg shadow-purple-500/20 mt-4">
                                KAYDET
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
