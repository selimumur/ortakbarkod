"use client";

import { useState, useEffect } from 'react';
import {
    CreditCard, Plus, MoreHorizontal, Calendar, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import FinancialTransactionModal from '../components/FinancialTransactionModal';
import { getCardsAction, addCardAction, getBanksAction } from '@/app/actions/financeActions';

export default function CreditCardsPage() {
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // YENİ KART MODALI
    const [isModalOpen, setIsModalOpen] = useState(false);

    // İŞLEM MODALI
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState("");
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');

    // Bankaları listelemek için (Kartı bankaya bağlamak isterse)
    const [banks, setBanks] = useState<any[]>([]);

    const [newCard, setNewCard] = useState({
        card_name: "",
        bank_id: "",
        card_number: "", // Sadece son 4 hane veya maskeli görsel için
        limit: "",
        cutoff_day: "1",
        due_day: "10"
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [cardData, bankData] = await Promise.all([
                getCardsAction(),
                getBanksAction()
            ]);
            setCards(cardData || []);
            setBanks(bankData || []);
        } catch (error: any) {
            console.error(error);
            toast.error("Veriler yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddCard() {
        if (!newCard.card_name || !newCard.limit) {
            toast.error("Kart adı ve limit zorunludur.");
            return;
        }

        try {
            await addCardAction({
                ...newCard,
                limit: Number(newCard.limit),
                cutoff_day: Number(newCard.cutoff_day),
                due_day: Number(newCard.due_day),
            });
            toast.success("Kredi kartı tanımlandı!");
            setIsModalOpen(false);
            setNewCard({ card_name: "", bank_id: "", card_number: "", limit: "", cutoff_day: "1", due_day: "10" });
            fetchData();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    const openTransaction = (cardId: string, type: 'EXPENSE' | 'TRANSFER') => {
        setSelectedCardId(cardId);
        setTransactionType(type);
        setIsTransactionModalOpen(true);
    };

    // Görsel Kart Bileşeni
    const CardItem = ({ card }: { card: any }) => {
        // Kullanılabilir limit hesabı
        const available = Number(card.limit) - Number(card.current_debt);
        const percent = Math.min(100, (Number(card.current_debt) / Number(card.limit)) * 100);

        return (
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/5 rounded-2xl p-6 relative overflow-hidden text-white shadow-xl hover:shadow-2xl hover:border-blue-500/30 transition-all group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-blue-500/10 transition-all"></div>

                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="w-12 h-8 bg-gradient-to-r from-yellow-300 to-yellow-500 rounded flex items-center justify-center shadow-lg">
                        <div className="w-8 h-5 border-2 border-yellow-600/20 rounded-sm"></div>
                    </div>
                    <button className="text-gray-500 hover:text-white"><MoreHorizontal /></button>
                </div>

                <div className="mb-6 relative z-10">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">{card.banks?.bank_name || 'Diğer Banka'}</p>
                    <h3 className="text-xl font-bold tracking-wide">{card.card_name}</h3>
                    <p className="text-gray-500 font-mono mt-2 tracking-widest text-sm">
                        **** **** **** {card.card_number || '0000'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">Limit</p>
                        <p className="font-bold">{Number(card.limit).toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase">Borç</p>
                        <p className="font-bold text-red-400">{Number(card.current_debt).toLocaleString('tr-TR')} ₺</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mb-4 relative z-10">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${percent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400 border-t border-white/5 pt-4 relative z-10">
                    <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        Kesim: Ayın {card.cutoff_day}'i
                    </div>
                    <div className="flex items-center gap-1 text-white">
                        <span className="text-gray-500">Kalan:</span>
                        {available.toLocaleString('tr-TR')} ₺
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-4 relative z-10 pt-3 border-t border-white/5">
                    <button
                        onClick={() => openTransaction(card.id, 'EXPENSE')}
                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition text-xs font-bold"
                    >
                        Harcama Ekle
                    </button>
                    <button
                        onClick={() => openTransaction(card.id, 'TRANSFER')} // Virman = Borç Ödeme
                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition text-xs font-bold"
                    >
                        Borç Öde
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <CreditCard className="text-pink-500" /> Kredi Kartları
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Şirket kredi kartlarının limit ve borç durumlarını yönetin.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-pink-900/20"
                >
                    <Plus size={20} /> Yeni Kart Tanımla
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center p-12"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {cards.map(card => <CardItem key={card.id} card={card} />)}

                    {cards.length === 0 && (
                        <div className="col-span-full py-16 text-center text-gray-500 bg-[#1e293b]/50 rounded-2xl border border-white/5 border-dashed flex flex-col items-center">
                            <CreditCard size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Henüz kredi kartı eklenmemiş.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-6">Yeni Kredi Kartı</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Kart Rumuzu</label>
                                <input type="text" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                    value={newCard.card_name} onChange={e => setNewCard({ ...newCard, card_name: e.target.value })} placeholder="Ör: Şirket Bonus" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Banka (Opsiyonel)</label>
                                    <select className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newCard.bank_id} onChange={e => setNewCard({ ...newCard, bank_id: e.target.value })}>
                                        <option value="">Seçiniz...</option>
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Son 4 Hane</label>
                                    <input type="text" maxLength={4} className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newCard.card_number} onChange={e => setNewCard({ ...newCard, card_number: e.target.value })} placeholder="1234" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Kart Limiti (₺)</label>
                                <input type="number" className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white text-lg font-bold"
                                    value={newCard.limit} onChange={e => setNewCard({ ...newCard, limit: e.target.value })} placeholder="0.00" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Hesap Kesim Günü</label>
                                    <select className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newCard.cutoff_day} onChange={e => setNewCard({ ...newCard, cutoff_day: e.target.value })}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                            <option key={d} value={d}>Her ayın {d}'si</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Son Ödeme Günü</label>
                                    <select className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white"
                                        value={newCard.due_day} onChange={e => setNewCard({ ...newCard, due_day: e.target.value })}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                            <option key={d} value={d}>Her ayın {d}'si</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-white font-bold transition">İptal</button>
                                <button onClick={handleAddCard} className="flex-1 bg-pink-600 hover:bg-pink-500 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-pink-500/20">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* İŞLEM MODALI */}
            <FinancialTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                }}
                preSelectedSourceType={transactionType === 'EXPENSE' ? 'CREDIT_CARD' : undefined}
                preSelectedSourceId={transactionType === 'EXPENSE' ? selectedCardId : undefined}
                preSelectedType={transactionType}
            />
        </div>
    );
}
