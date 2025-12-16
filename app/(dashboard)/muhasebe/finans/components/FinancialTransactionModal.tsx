"use client";

import { useState, useEffect } from 'react';
import { X, ArrowRight, Wallet, Landmark, CreditCard, Tag, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SearchableSelect from '@/app/components/SearchableSelect';
import {
    addFinancialTransactionAction,
    getFinanceDropdownsAction
} from '@/app/actions/financeActions';

interface FinancialTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    preSelectedSourceType?: 'BANK' | 'SAFE' | 'CREDIT_CARD';
    preSelectedSourceId?: string;
    preSelectedType?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    initialAmount?: string;
    initialDescription?: string;
}

export default function FinancialTransactionModal({
    isOpen, onClose, onSuccess,
    preSelectedSourceType, preSelectedSourceId, preSelectedType,
    initialAmount, initialDescription
}: FinancialTransactionModalProps) {
    const [loading, setLoading] = useState(false);

    // Veriler
    const [banks, setBanks] = useState<any[]>([]);
    const [safes, setSafes] = useState<any[]>([]);
    const [cards, setCards] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Form
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>(preSelectedType || 'INCOME');
    const [sourceType, setSourceType] = useState(preSelectedSourceType || 'SAFE');
    const [sourceId, setSourceId] = useState(preSelectedSourceId || "");
    const [targetType, setTargetType] = useState<'BANK' | 'SAFE' | 'CREDIT_CARD'>('BANK');
    const [targetId, setTargetId] = useState("");

    // Detaylar
    const [amount, setAmount] = useState(initialAmount || "");
    const [contactId, setContactId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(initialDescription || "");

    useEffect(() => {
        if (isOpen) {
            fetchDropdowns();
            if (initialAmount) setAmount(initialAmount);
            if (initialDescription) setDescription(initialDescription);
        }
    }, [isOpen, initialAmount, initialDescription]);

    async function fetchDropdowns() {
        try {
            const data = await getFinanceDropdownsAction();
            if (data) {
                setBanks(data.banks);
                setSafes(data.safes);
                setCards(data.cards);
                setCategories(data.categories);
                setContacts(data.contacts);
            }
        } catch (error) {
            console.error("Veri yüklenirken hata:", error);
            toast.error("Veriler yüklenemedi.");
        }
    }

    const handleSave = async () => {
        if (!amount || !sourceId || !categoryId) {
            toast.error("Tutar, Kasa/Banka ve Kategori zorunludur.");
            return;
        }

        if (transactionType === 'TRANSFER' && !targetId) {
            toast.error("Virman için hedef hesap seçilmelidir.");
            return;
        }

        setLoading(true);

        try {
            // Determine contact type from selected contact
            let contactType: 'customer' | 'supplier' | undefined = undefined;
            if (contactId) {
                const selectedContact = contacts.find((c: any) => c.id === Number(contactId));
                if (selectedContact) contactType = selectedContact.type;
            }

            await addFinancialTransactionAction({
                transaction_type: transactionType,
                source_type: sourceType,
                source_id: sourceId,
                target_type: transactionType === 'TRANSFER' ? targetType : undefined,
                target_id: transactionType === 'TRANSFER' ? targetId : undefined,
                category_id: categoryId,
                contact_id: contactId ? Number(contactId) : undefined,
                amount: Number(amount),
                description: description,
                date: date,
                contact_type: contactType
            });

            toast.success("İşlem başarıyla kaydedildi.");
            onSuccess();
            onClose();

        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1f2937] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* HEAD */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111827]">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        Yeni Finansal İşlem
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X /></button>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                    {/* 1. İŞLEM TÜRÜ */}
                    <div className="grid grid-cols-3 gap-3 p-1 bg-black/20 rounded-xl">
                        {[
                            { id: 'INCOME', label: 'GELİR (Tahsilat)', color: 'text-green-500', bg: 'bg-green-500/20' },
                            { id: 'EXPENSE', label: 'GİDER (Ödeme)', color: 'text-red-500', bg: 'bg-red-500/20' },
                            { id: 'TRANSFER', label: 'VİRMAN (Transfer)', color: 'text-blue-500', bg: 'bg-blue-500/20' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTransactionType(t.id as any)}
                                className={`py-3 rounded-lg text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${transactionType === t.id ? `${t.bg} ${t.color} shadow-lg` : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* 2. KAYNAK VE HEDEF SEÇİMİ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-4 rounded-xl border border-white/5">
                        {/* KAYNAK */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                {transactionType === 'INCOME' ? 'Şuraya Girecek:' : 'Şuradan Çıkacak:'}
                            </label>

                            {/* Tip Seç */}
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => setSourceType('SAFE')} className={`px-3 py-1 rounded text-xs font-bold transition ${sourceType === 'SAFE' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>Kasa</button>
                                <button onClick={() => setSourceType('BANK')} className={`px-3 py-1 rounded text-xs font-bold transition ${sourceType === 'BANK' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>Banka</button>
                                <button onClick={() => setSourceType('CREDIT_CARD')} className={`px-3 py-1 rounded text-xs font-bold transition ${sourceType === 'CREDIT_CARD' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>Kart</button>
                            </div>

                            {/* Hesap Seç */}
                            <div className="relative">
                                {sourceType === 'SAFE' && <Wallet className="absolute left-3 top-3 text-gray-500" size={16} />}
                                {sourceType === 'BANK' && <Landmark className="absolute left-3 top-3 text-gray-500" size={16} />}
                                {sourceType === 'CREDIT_CARD' && <CreditCard className="absolute left-3 top-3 text-gray-500" size={16} />}

                                <select
                                    className="w-full bg-[#111827] border border-white/10 rounded-xl p-2.5 pl-10 text-white text-sm outline-none focus:border-blue-500"
                                    value={sourceId} onChange={e => setSourceId(e.target.value)}
                                >
                                    <option value="">Seçiniz...</option>
                                    {sourceType === 'SAFE' && safes.map(x => <option key={x.id} value={x.id}>{x.name} ({x.currency})</option>)}
                                    {sourceType === 'BANK' && banks.map(x => <option key={x.id} value={x.id}>{x.account_name} ({x.currency})</option>)}
                                    {sourceType === 'CREDIT_CARD' && cards.map(x => <option key={x.id} value={x.id}>{x.card_name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* HEDEF (Sadece Virmanda) */}
                        {transactionType === 'TRANSFER' && (
                            <div className="space-y-3 md:pl-6 md:border-l border-white/10">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <ArrowRight size={14} /> Şuraya Gidecek:
                                </label>

                                {/* Tip Seç */}
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setTargetType('BANK')} className={`px-3 py-1 rounded text-xs font-bold transition ${targetType === 'BANK' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>Banka</button>
                                    <button onClick={() => setTargetType('SAFE')} className={`px-3 py-1 rounded text-xs font-bold transition ${targetType === 'SAFE' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>Kasa</button>
                                    <button onClick={() => setTargetType('CREDIT_CARD')} className={`px-3 py-1 rounded text-xs font-bold transition ${targetType === 'CREDIT_CARD' ? 'bg-white text-black' : 'bg-black/40 text-gray-500'}`}>Kart (Borç Öde)</button>
                                </div>

                                {/* Hesap Seç */}
                                <div className="relative">
                                    {targetType === 'SAFE' && <Wallet className="absolute left-3 top-3 text-gray-500" size={16} />}
                                    {targetType === 'BANK' && <Landmark className="absolute left-3 top-3 text-gray-500" size={16} />}
                                    {targetType === 'CREDIT_CARD' && <CreditCard className="absolute left-3 top-3 text-gray-500" size={16} />}

                                    <select
                                        className="w-full bg-[#111827] border border-white/10 rounded-xl p-2.5 pl-10 text-white text-sm outline-none focus:border-blue-500"
                                        value={targetId} onChange={e => setTargetId(e.target.value)}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {targetType === 'SAFE' && safes.map(x => <option key={x.id} value={x.id}>{x.name} ({x.currency})</option>)}
                                        {targetType === 'BANK' && banks.map(x => <option key={x.id} value={x.id}>{x.account_name} ({x.currency})</option>)}
                                        {targetType === 'CREDIT_CARD' && cards.map(x => <option key={x.id} value={x.id}>{x.card_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. TUTAR VE CARİ VE KATEGORİ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">İşlem Tutarı</label>
                            <input
                                type="number"
                                className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white text-2xl font-black focus:border-blue-500 outline-none placeholder-gray-700"
                                placeholder="0.00"
                                value={amount} onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">İşlem Tarihi</label>
                            <input
                                type="date"
                                className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                value={date} onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">
                                Kategori ({transactionType === 'INCOME' ? 'Gelir Türü' : 'Gider Türü'})
                            </label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-3 text-gray-500" size={16} />
                                <select
                                    className="w-full bg-[#111827] border border-white/10 rounded-xl p-2.5 pl-10 text-white text-sm outline-none"
                                    value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                >
                                    <option value="">Kategori Seçin...</option>
                                    {categories
                                        .filter(c => c.type === transactionType || transactionType === 'TRANSFER')
                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                    }
                                </select>
                            </div>
                        </div>

                        {transactionType !== 'TRANSFER' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Cari Firma</label>
                                <div className="relative">
                                    <SearchableSelect
                                        options={contacts.map((c: any) => ({
                                            ...c,
                                            label: `${c.name} (${c.type === 'customer' ? 'Müşteri' : 'Tedarikçi'})`
                                        }))}
                                        value={contactId ? Number(contactId) : ""}
                                        onChange={(opt: any) => setContactId(opt.id)}
                                        placeholder="Cari Seçiniz..."
                                        labelKey="label"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Açıklama</label>
                        <textarea
                            className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white h-20 resize-none outline-none focus:border-blue-500"
                            placeholder="İşlem hakkında notlar..."
                            value={description} onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-white/10 bg-[#111827] flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-white font-bold transition">
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                        {loading ? 'İşleniyor...' : <><CheckCircle2 size={18} /> İşlemi Kaydet</>}
                    </button>
                </div>

            </div>
        </div>
    );
}
