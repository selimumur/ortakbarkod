"use client";

import { useState, useEffect } from 'react';
import {
    Wallet, Plus, MoreHorizontal, ArrowDown, ArrowUp, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import FinancialTransactionModal from '../components/FinancialTransactionModal';
import { getSafesAction, addSafeAction } from '@/app/actions/financeActions';

export default function SafesPage() {
    const [safes, setSafes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // YENİ KASA MODALI
    const [isModalOpen, setIsModalOpen] = useState(false);

    // İŞLEM MODALI
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedSafeId, setSelectedSafeId] = useState("");
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

    const [newSafe, setNewSafe] = useState({
        name: "",
        currency: "TRY"
    });

    useEffect(() => {
        fetchSafes();
    }, []);

    async function fetchSafes() {
        setLoading(true);
        try {
            const data = await getSafesAction();
            setSafes(data || []);
        } catch (error: any) {
            console.error("Kasalar yüklenirken hata:", error);
            toast.error("Kasalar yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSafe() {
        if (!newSafe.name) {
            toast.error("Kasa adı zorunludur.");
            return;
        }

        try {
            await addSafeAction(newSafe);
            toast.success("Kasa başarıyla oluşturuldu!");
            setIsModalOpen(false);
            setNewSafe({ name: "", currency: "TRY" });
            fetchSafes();
        } catch (error: any) {
            toast.error("Kasa oluşturulurken hata: " + error.message);
        }
    }

    const openTransaction = (safeId: string, type: 'INCOME' | 'EXPENSE') => {
        setSelectedSafeId(safeId);
        setTransactionType(type);
        setIsTransactionModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* BAŞLIK VE AKSİYON */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Wallet className="text-green-500" /> Kasa Yönetimi
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Nakit akışınızı ve fiziksel kasalarınızı yönetin.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-green-900/20"
                >
                    <Plus size={20} /> Yeni Kasa Ekle
                </button>
            </div>

            {/* LİSTE */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-gray-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {safes.map((safe) => (
                        <div key={safe.id} className="bg-[#1e293b] border border-white/5 rounded-2xl p-6 hover:border-green-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Link href={`/muhasebe/finans/kasalar/${safe.id}`} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white flex items-center justify-center" title="Hareketleri Gör">
                                    <MoreHorizontal size={20} />
                                </Link>
                            </div>

                            <Link href={`/muhasebe/finans/kasalar/${safe.id}`} className="flex items-start gap-4 mb-6 cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-lg transition">
                                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-xl">{safe.name}</h3>
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-black/30 text-gray-400 border border-white/5">
                                        {safe.currency}
                                    </span>
                                </div>
                            </Link>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">ANLIK BAKİYE</p>
                                    <p className={`text-3xl font-black tracking-tight ${Number(safe.current_balance) < 0 ? 'text-red-400' : 'text-white'}`}>
                                        {Number(safe.current_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        <span className="text-lg text-gray-500 font-medium ml-1">{safe.currency}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => openTransaction(safe.id, 'INCOME')}
                                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition text-sm font-bold"
                                    >
                                        <ArrowDown size={16} /> Tahsilat
                                    </button>
                                    <button
                                        onClick={() => openTransaction(safe.id, 'EXPENSE')}
                                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition text-sm font-bold"
                                    >
                                        <ArrowUp size={16} /> Ödeme
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {safes.length === 0 && (
                        <div className="col-span-full py-16 text-center text-gray-500 bg-[#1e293b]/50 rounded-2xl border border-white/5 border-dashed flex flex-col items-center">
                            <Wallet size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Henüz bir kasa tanımlanmamış.</p>
                            <p className="text-sm">"Yeni Kasa Ekle" butonunu kullanarak ilk kasanızı oluşturun.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: Yeni Kasa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-6">Yeni Kasa Oluştur</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Kasa Adı</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none transition"
                                    value={newSafe.name}
                                    onChange={e => setNewSafe({ ...newSafe, name: e.target.value })}
                                    placeholder="Ör: Merkez TL Kasası"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Para Birimi</label>
                                <select
                                    className="w-full bg-[#111827] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition"
                                    value={newSafe.currency}
                                    onChange={e => setNewSafe({ ...newSafe, currency: e.target.value })}
                                >
                                    <option value="TRY">TRY (Türk Lirası)</option>
                                    <option value="USD">USD (Amerikan Doları)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-white font-bold transition"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleAddSafe}
                                    className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-green-500/20"
                                >
                                    Oluştur
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Finansal İşlem (Tahsilat / Ödeme) */}
            <FinancialTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    fetchSafes(); // Bakiyeyi yenile
                }}
                preSelectedSourceType="SAFE"
                preSelectedSourceId={selectedSafeId}
                preSelectedType={transactionType}
            />
        </div>
    );
}
