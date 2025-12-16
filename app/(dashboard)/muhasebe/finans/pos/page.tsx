"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    CreditCard,
    Landmark,
    Wallet,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getPOSDevicesAction, addPOSDeviceAction, addPOSSaleAction, settlePOSAction } from "@/app/actions/financeActions";
import { getBanksAction } from "@/app/actions/financeActions"; // We need banks for dropdown

export default function PosManagementPage() {
    const [posDevices, setPosDevices] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isAddPosModalOpen, setIsAddPosModalOpen] = useState(false);
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false); // Gün Sonu

    const [selectedPos, setSelectedPos] = useState<any>(null);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    // Yeni POS Form
    const [newPos, setNewPos] = useState({
        name: "",
        bank_id: "",
        commission_rate: "0"
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [posData, bankData] = await Promise.all([
                getPOSDevicesAction(),
                getBanksAction()
            ]);
            setPosDevices(posData || []);
            setBanks(bankData || []);
        } catch (error: any) {
            console.error("Veri çekme hatası:", error);
            toast.error("Veriler yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddPos() {
        if (!newPos.name) return toast.error("POS adı giriniz");

        try {
            await addPOSDeviceAction({
                name: newPos.name,
                bank_id: newPos.bank_id || null,
                commission_rate: parseFloat(newPos.commission_rate) || 0
            });

            toast.success("POS cihazı eklendi");
            setIsAddPosModalOpen(false);
            setNewPos({ name: "", bank_id: "", commission_rate: "0" });
            fetchData();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    async function handleAddSale() {
        if (!selectedPos || !amount) return;

        try {
            const amountVal = parseFloat(amount);
            await addPOSSaleAction(selectedPos.id, amountVal, description || `POS Satış: ${selectedPos.name}`);

            toast.success("Satış eklendi");
            setIsSaleModalOpen(false);
            setAmount("");
            setDescription("");
            fetchData();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    }

    async function handleSettlement() {
        if (!selectedPos || !amount) return;

        const settlementAmount = parseFloat(amount);
        if (settlementAmount > (Number(selectedPos.current_balance) || 0)) return toast.error("Yetersiz bakiye");

        const targetBankId = selectedPos.bank_id;
        if (!targetBankId) return toast.error("Bu POS için bağlı banka hesabı yok!");

        try {
            await settlePOSAction(selectedPos.id, settlementAmount, targetBankId, Number(selectedPos.commission_rate) || 0);

            toast.success("Gün sonu işlemi başarılı.");
            setIsSettlementModalOpen(false);
            setAmount("");
            fetchData();

        } catch (err: any) {
            toast.error("Hata: " + err.message);
        }
    }

    return (
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-[#0f1115] text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        POS Yönetimi
                    </h1>
                    <p className="text-gray-400 mt-1">Sanal POS cihazları ve gün sonu işlemleri</p>
                </div>
                <button
                    onClick={() => setIsAddPosModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border border-blue-500/30 shadow-lg shadow-blue-500/20"
                >
                    <Plus size={18} /> Yeni POS Ekle
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posDevices.map((pos) => (
                        <div key={pos.id} className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all shadow-lg group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CreditCard size={100} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-lg">
                                        <CreditCard className="text-blue-400 w-6 h-6" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Komisyon</p>
                                        <p className="font-mono text-sm text-yellow-400">%{pos.commission_rate}</p>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">{pos.name}</h3>
                                <p className="text-sm text-gray-400 flex items-center gap-1">
                                    <Landmark size={12} />
                                    {pos.banks?.bank_name || "Bağlı Banka Yok"}
                                </p>

                                <div className="my-6">
                                    <p className="text-xs text-gray-500 mb-1">Bekleyen Bakiye</p>
                                    <p className="text-3xl font-bold text-white tracking-tight">
                                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: pos.currency || 'TRY' }).format(pos.current_balance)}
                                    </p>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => { setSelectedPos(pos); setIsSaleModalOpen(true); }}
                                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-gray-600"
                                    >
                                        + Satış Ekle
                                    </button>
                                    <button
                                        onClick={() => { setSelectedPos(pos); setIsSettlementModalOpen(true); }}
                                        className="flex-1 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20 hover:border-emerald-500/40"
                                    >
                                        Gün Sonu Al
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {posDevices.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-[#1a1d24]/50 rounded-xl border border-dashed border-gray-800">
                            <CreditCard className="mx-auto w-12 h-12 mb-3 opacity-20" />
                            <p>Henüz kayıtlı POS cihazı bulunmuyor.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: YENİ POS */}
            {isAddPosModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">Yeni POS Cihazı</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">POS Adı</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Örn: Garanti Sanal POS"
                                    value={newPos.name}
                                    onChange={e => setNewPos({ ...newPos, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Bağlı Banka Hesabı</label>
                                <select
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={newPos.bank_id}
                                    onChange={e => setNewPos({ ...newPos, bank_id: e.target.value })}
                                >
                                    <option value="">Seçiniz...</option>
                                    {banks.map(b => (
                                        <option key={b.id} value={b.id}>{b.bank_name} ({b.currency})</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Gün sonu alindiğinda para bu hesaba geçecektir.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Komisyon Oranı (%)</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="2.5"
                                    value={newPos.commission_rate}
                                    onChange={e => setNewPos({ ...newPos, commission_rate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsAddPosModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">İptal</button>
                            <button onClick={handleAddPos} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SATIŞ EKLE */}
            {isSaleModalOpen && selectedPos && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <CreditCard className="text-blue-400 w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">POS Satışı Ekle</h2>
                                <p className="text-xs text-gray-400">{selectedPos.name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tutar</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Açıklama (Opsiyonel)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Müşteri adı, Sipariş no..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsSaleModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">İptal</button>
                            <button onClick={handleAddSale} className="px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200">Tahsil Et</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: GÜN SONU */}
            {isSettlementModalOpen && selectedPos && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-full">
                                <Wallet className="text-emerald-400 w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Gün Sonu Al (Banka Transferi)</h2>
                                <p className="text-xs text-gray-400">{selectedPos.name} &rarr; {selectedPos.banks?.bank_name}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-800/50 rounded-lg mb-4 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">POS Bakiyesi:</span>
                                <span className="font-mono text-white">{selectedPos.current_balance} {selectedPos.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Komisyon Oranı:</span>
                                <span className="font-mono text-yellow-400">%{selectedPos.commission_rate}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Aktarılacak Brüt Tutar</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#111318] border border-gray-700 rounded-lg px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-emerald-500"
                                    placeholder={selectedPos.current_balance.toString()}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>

                            {amount && (
                                <div className="text-sm p-3 border border-gray-700 rounded-lg">
                                    <div className="flex justify-between text-gray-400">
                                        <span>Kesinti:</span>
                                        <span>- {((parseFloat(amount) * selectedPos.commission_rate) / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-white font-bold mt-1 pt-1 border-t border-gray-700">
                                        <span>Bankaya Geçecek:</span>
                                        <span className="text-emerald-400">
                                            {(parseFloat(amount) - (parseFloat(amount) * selectedPos.commission_rate) / 100).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsSettlementModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">İptal</button>
                            <button onClick={handleSettlement} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Onayla</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
