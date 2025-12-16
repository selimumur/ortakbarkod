"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Factory, Plus, Search,
    Package, CheckCircle2, RefreshCw, AlertTriangle,
    LayoutDashboard, ChevronRight, Calculator, Merge, Hammer
} from 'lucide-react';
import MaterialManager from '@/components/uretim/MaterialManager';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import {
    getPendingOrdersAction,
    getWorkOrdersAction,
    createWorkOrderAction,
    updateWorkOrderStatusAction,
    calculateMaterialsAction,
    searchProductionProductsAction,
    type GroupedOrder,
    type WorkOrder
} from '@/app/actions/productionActions';

// --- TYPES RE-EXPORTED FROM ACTIONS BUT LOCAL TYPE DEFS FOR UI STATE SIMPLIFIED ---
type MaterialNeed = {
    material_name: string;
    unit: string;
    required: number;
    stock: number;
    status: 'ok' | 'low' | 'critical';
};

export default function ProductionDataCenter() {
    const { orgId } = useAuth();
    const [activeTab, setActiveTab] = useState<"planning" | "materials">("planning");

    // DATA
    const [pendingGroups, setPendingGroups] = useState<GroupedOrder[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [stats, setStats] = useState({ active: 0, pending: 0, completedToday: 0 });

    // UI
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: "", statuses: ["Yeni", "Hazırlanıyor"] });

    // MODALS
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergeTarget, setMergeTarget] = useState<{ group: GroupedOrder, existingOrder: WorkOrder } | null>(null);
    const [materialCheck, setMaterialCheck] = useState<{ group: GroupedOrder, needs: MaterialNeed[] } | null>(null);

    // MANUEL EMİR STATE
    const [newOrder, setNewOrder] = useState({ product_id: 0, quantity: 1, note: "" });
    const [modalSearch, setModalSearch] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const searchLock = useRef(false);

    useEffect(() => { if (orgId) fetchData(); }, [orgId]);
    useEffect(() => { if (activeTab === 'planning') fetchPendingOrders(); }, [filters]);

    // --- INITIAL DATA FETCH ---
    async function fetchData() {
        setLoading(true);
        try {
            await Promise.all([fetchPendingOrders(), fetchWorkOrders()]);
        } catch (error) {
            console.error("Fetch Data Error:", error);
            toast.error("Veri yüklenemedi");
        } finally {
            setLoading(false);
        }
    }

    // --- 1. SİPARİŞ HAVUZU (SOL PANEL) ---
    async function fetchPendingOrders() {
        try {
            // REPLACED: client-side Supabase -> Server Action
            const data = await getPendingOrdersAction(filters.search, filters.statuses);

            if (data) {
                setPendingGroups(data);
                setStats(prev => ({ ...prev, pending: data.reduce((acc, g) => acc + g.total_quantity, 0) }));
            }
        } catch (e: any) {
            console.error("Orders Error:", e);
            toast.error("Siparişler çekilemedi: " + e.message);
        }
    }

    // --- 2. İŞ EMİRLERİ (KANBAN & DASHBOARD) ---
    async function fetchWorkOrders() {
        try {
            // REPLACED: client-side Supabase -> Server Action
            const data = await getWorkOrdersAction();

            if (data) {
                setWorkOrders(data);
                // Dashboard Stats
                const today = new Date().toISOString().split('T')[0];
                setStats(prev => ({
                    ...prev,
                    active: data.filter((w: any) => w.status !== 'Tamamlandı').length,
                    completedToday: data.filter((w: any) => w.status === 'Tamamlandı' && w.created_at.startsWith(today)).length
                }));
            }
        } catch (error: any) {
            console.error("Work Orders Error:", error);
            toast.error("İş emirleri çekilemedi: " + error.message);
        }
    }

    // --- 3. AKILLI ÜRETİM & BİRLEŞTİRME ---
    async function handleCheckProduction(group: GroupedOrder) {
        // 1. Önce bu ürün koduna ait AKTİF (Planlandı/Üretimde) iş emri var mı bak
        const activeOrder = workOrders.find(w =>
            w.master_products?.code === group.product_code &&
            w.status !== 'Tamamlandı'
        );

        // 2. Hammadde Kontrolü
        await calculateMaterials(group);

        if (activeOrder) {
            // Birleştirme Modalı Aç
            setMergeTarget({ group, existingOrder: activeOrder });
            setIsMergeModalOpen(true);
        } else {
            // Direkt Oluştur
            createWorkOrderFromPending(group);
        }
    }

    async function calculateMaterials(group: GroupedOrder) {
        try {
            const needs = await calculateMaterialsAction(group.product_code, group.total_quantity);
            if (needs && needs.length > 0) {
                setMaterialCheck({ group, needs: needs as MaterialNeed[] });
            } else {
                setMaterialCheck(null);
            }
        } catch (error) {
            console.error("Material Check Error:", error);
        }
    }

    // --- CREATION LOGIC ---
    async function createWorkOrderFromPending(group: GroupedOrder, mergeToId?: number) {
        const toastId = toast.loading("İşleniyor...");
        try {
            await createWorkOrderAction({
                product_code: group.product_code,
                product_name: group.product_name,
                quantity: group.total_quantity,
                order_ids: group.order_ids,
                merge_to_id: mergeToId
            });

            toast.success("Başarılı!", { id: toastId });
            setIsMergeModalOpen(false);
            setMaterialCheck(null);
            fetchData(); // Refresh all

        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        }
    }

    // --- KANBAN ACTIONS ---
    async function updateOrderStatus(id: number, newStatus: string) {
        const toastId = toast.loading("Durum güncelleniyor...");
        try {
            await updateWorkOrderStatusAction(id, newStatus);
            toast.success("Güncellendi", { id: toastId });
            fetchWorkOrders(); // Refresh (Action revalidates but we fetch here to update local state smoothly or rely on revalidation if page reload, but fetch is safer for SPA feel)
        } catch (error: any) {
            toast.error("Hata: " + error.message, { id: toastId });
        }
    }

    // --- MANUEL MODAL ARAMA ---
    useEffect(() => {
        if (!isManualModalOpen || searchLock.current) return;
        const t = setTimeout(() => { if (modalSearch) performSearch(modalSearch) }, 300);
        return () => clearTimeout(t);
    }, [modalSearch, isManualModalOpen]);

    async function performSearch(term: string) {
        setIsSearchingProducts(true);
        try {
            const data = await searchProductionProductsAction(term);
            setProducts(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingProducts(false);
        }
    }

    // --- MANUEL OLUŞTURMA (BUTON) ---
    async function handleManualCreate() {
        if (!newOrder.product_id) return toast.error("Ürün seçin");
        const toastId = toast.loading("Oluşturuluyor...");
        try {
            await createWorkOrderAction({
                product_id: newOrder.product_id,
                quantity: newOrder.quantity,
                note: newOrder.note
            });

            setIsManualModalOpen(false);
            fetchWorkOrders();
            toast.success("İş emri oluşturuldu", { id: toastId });
            setNewOrder({ product_id: 0, quantity: 1, note: "" });
            setModalSearch("");
        } catch (error: any) {
            toast.error("Hata: " + error.message, { id: toastId });
        }
    }

    return (
        <div className="w-full h-full bg-[#0B1120] p-6 overflow-hidden flex flex-col">
            {/* HEADER */}
            <header className="mb-6 flex justify-between items-center shrink-0 border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Factory className="text-blue-500" /> Üretim Ve Planlama
                    </h1>
                    <p className="text-gray-400 text-sm">İş emirleri ve sipariş havuzu</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-[#111827] px-4 py-2 rounded-lg border border-gray-700 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Aktif Emir</span>
                        <span className="text-lg font-bold text-blue-400">{stats.active}</span>
                    </div>
                    <div className="bg-[#111827] px-4 py-2 rounded-lg border border-gray-700 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Bekleyen Adet</span>
                        <span className="text-lg font-bold text-orange-400">{stats.pending}</span>
                    </div>
                    <div className="bg-[#111827] px-4 py-2 rounded-lg border border-gray-700 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Bugün Biten</span>
                        <span className="text-lg font-bold text-green-400">{stats.completedToday}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"><RefreshCw size={20} /></button>
                    <Link href="/uretim/hat" className="bg-orange-600 px-4 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2 hover:bg-orange-500"><LayoutDashboard size={16} /> Saha Ekranı</Link>
                </div>
            </header>

            {/* TABS */}
            <div className="flex gap-4 mb-4 border-b border-gray-800 shrink-0">
                <button onClick={() => setActiveTab("planning")} className={`pb-2 px-2 text-sm font-bold border-b-2 transition ${activeTab === 'planning' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500'}`}>Planlama & Kanban</button>
                <button onClick={() => setActiveTab("materials")} className={`pb-2 px-2 text-sm font-bold border-b-2 transition ${activeTab === 'materials' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500'}`}>Hammadde Yönetimi</button>
            </div>

            {activeTab === 'materials' ? (
                <div className="flex-1 overflow-auto"><MaterialManager /></div>
            ) : (
                <div className="flex flex-1 gap-6 overflow-hidden">

                    {/* LEFT: SİPARİŞ HAVUZU */}
                    <div className="w-1/3 min-w-[350px] bg-[#111827] rounded-xl border border-gray-800 flex flex-col shadow-xl">
                        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                            <h3 className="text-white font-bold flex items-center gap-2 mb-3"><Package size={18} className="text-purple-500" /> Sipariş Havuzu</h3>
                            <div className="bg-[#0B1120] rounded-lg p-1 flex mb-2">
                                {['Yeni', 'Hazırlanıyor'].map(s => (
                                    <button key={s} onClick={() => {
                                        setFilters(prev => ({ ...prev, statuses: prev.statuses.includes(s) ? prev.statuses.filter(x => x !== s) : [...prev.statuses, s] }))
                                    }} className={`flex-1 py-1 text-[10px] rounded font-bold transition ${filters.statuses.includes(s) ? 'bg-purple-900/40 text-purple-300' : 'text-gray-500'}`}>{s}</button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                                <input type="text" placeholder="Ara..." className="w-full bg-[#0B1120] border border-gray-700 rounded-lg p-2 pl-9 text-xs text-white"
                                    value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {pendingGroups.map((group, i) => (
                                <div key={i} className="bg-[#1F2937] p-3 rounded-xl border border-gray-700 hover:border-blue-500/50 transition group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-white text-sm font-bold truncate max-w-[200px]" title={group.product_name}>{group.product_name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">{group.product_code}</div>
                                        </div>
                                        <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-1 rounded-lg">{group.total_quantity} Adet</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="flex gap-1">
                                            {group.platforms.map(p => <span key={p} className="text-[9px] bg-gray-800 text-gray-400 px-1 rounded">{p}</span>)}
                                        </div>
                                        <button onClick={() => handleCheckProduction(group)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg transition transform active:scale-95">
                                            <Hammer size={14} /> Üret
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {pendingGroups.length === 0 && <div className="text-center text-gray-500 py-10 text-xs">Bekleyen sipariş yok.</div>}
                        </div>
                    </div>

                    {/* RIGHT: KANBAN BOARD */}
                    <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
                        {/* COLUMN 1: PLANLANDI */}
                        <KanbanColumn
                            title="Planlandı"
                            color="bg-gray-800/50 border-gray-700"
                            headerColor="text-gray-300"
                            orders={workOrders.filter(w => w.status === 'Planlandı')}
                            onMove={(id: number) => updateOrderStatus(id, 'Üretimde')}
                        />
                        {/* COLUMN 2: ÜRETİMDE */}
                        <KanbanColumn
                            title="Üretimde"
                            color="bg-blue-900/10 border-blue-500/30"
                            headerColor="text-blue-400"
                            orders={workOrders.filter(w => w.status === 'Üretimde')}
                            onMove={(id: number) => updateOrderStatus(id, 'Tamamlandı')}
                            isActive={true}
                        />
                        {/* COLUMN 3: TAMAMLANDI (Son 24 saat) */}
                        <KanbanColumn
                            title="Tamamlandı"
                            color="bg-green-900/10 border-green-500/30"
                            headerColor="text-green-400"
                            orders={workOrders.filter(w => w.status === 'Tamamlandı')}
                            isDone={true}
                        />

                        {/* ADD MANUAL CARD */}
                        <div className="w-12 flex flex-col gap-2 pt-10">
                            <button onClick={() => setIsManualModalOpen(true)} className="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 hover:border-white text-white flex items-center justify-center transition" title="Manuel Ekle"><Plus /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MERGE / MATERIAL MODAL --- */}
            {isMergeModalOpen && mergeTarget && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-[#1F2937] w-full max-w-2xl rounded-2xl border border-gray-700 p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="text-yellow-500" /> Üretim Birleştirme</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Bu ürün için zaten aktif bir iş emri mevcut.
                            <b>{mergeTarget.existingOrder.master_products?.name}</b> ürünü için <b>{mergeTarget.existingOrder.quantity} adet</b> planlanmış.
                            <br />Şu an eklemek istediğiniz miktar: <b>{mergeTarget.group.total_quantity} adet</b>.
                        </p>

                        {/* MATERIAL CHECK VISUALIZATION */}
                        {materialCheck && (
                            <div className="bg-[#111827] rounded-xl p-4 mb-6 border border-gray-800">
                                <h4 className="text-xs uppercase font-bold text-gray-500 mb-3 flex items-center gap-2"><Calculator size={14} /> Hammadde İhtiyaç Analizi</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                    {materialCheck.needs.map((n, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">{n.material_name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500 text-xs">Stok: {n.stock} {n.unit}</span>
                                                <span className={`font-bold px-2 py-0.5 rounded text-xs ${n.status === 'ok' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                    Gereken: {n.required} {n.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={() => createWorkOrderFromPending(mergeTarget.group, mergeTarget.existingOrder.id)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-bold transition border border-yellow-500/50">
                                <Merge size={24} />
                                <div className="text-left">
                                    <div className="text-sm">Mevcut Emre Ekle</div>
                                    <div className="text-[10px] opacity-80">Toplam: {mergeTarget.existingOrder.quantity + mergeTarget.group.total_quantity} Adet Olacak</div>
                                </div>
                            </button>
                            <button onClick={() => createWorkOrderFromPending(mergeTarget.group)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-bold transition border border-blue-500/50">
                                <Plus size={24} />
                                <div className="text-left">
                                    <div className="text-sm">Yeni Emir Aç</div>
                                    <div className="text-[10px] opacity-80">Ayrı bir kart olarak eklenir</div>
                                </div>
                            </button>
                        </div>
                        <button onClick={() => { setIsMergeModalOpen(false); setMergeTarget(null); setMaterialCheck(null); }} className="w-full mt-4 text-gray-500 hover:text-white text-sm">Vazgeç</button>
                    </div>
                </div>
            )}

            {/* --- MANUAL MODAL --- */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#1F2937] p-6 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Plus className="text-green-500" /> Manuel İş Emri</h3>

                        <div className="mb-4 relative">
                            <label className="text-xs text-gray-400 block mb-1">Ürün Ara</label>
                            <Search className="absolute left-3 top-8 text-gray-500" size={16} />
                            <input type="text" placeholder="Ürün adı veya kodu..." className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 pl-10 text-white outline-none focus:border-blue-500 text-sm"
                                value={modalSearch} onChange={e => setModalSearch(e.target.value)} />

                            {/* Dropdown Results */}
                            {products.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {products.map(p => (
                                        <div key={p.id} onClick={() => { setNewOrder({ ...newOrder, product_id: p.id }); setModalSearch(p.name); searchLock.current = true; setProducts([]) }}
                                            className="p-3 border-b border-gray-800 cursor-pointer hover:bg-blue-600/20 hover:text-blue-400 transition flex items-center gap-3">
                                            {p.image_url ?
                                                <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover bg-black" /> :
                                                <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center"><Package size={16} className="text-gray-500" /></div>
                                            }
                                            <div>
                                                <div className="text-white text-sm font-bold">{p.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{p.code} • Stok: {p.stock}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="col-span-1">
                                <label className="text-xs text-gray-400 block mb-1">Miktar</label>
                                <input type="number" placeholder="Adet" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 font-bold"
                                    value={newOrder.quantity} onChange={e => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-gray-400 block mb-1">Üretim Notu</label>
                                <textarea placeholder="Örn: Acil sipariş, Ahmet Bey için..." rows={3} className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-sm resize-none"
                                    value={newOrder.note} onChange={e => setNewOrder({ ...newOrder, note: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-gray-700">
                            <button onClick={() => setIsManualModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2.5 text-sm transition">İptal</button>
                            <button onClick={handleManualCreate} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg p-2.5 text-sm font-bold transition flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// --- SUB COMPONENTS ---

function KanbanColumn({ title, color, headerColor, orders, onMove, isDone, isActive }: any) {
    return (
        <div className={`flex-1 min-w-[300px] max-w-[400px] bg-[#111827] rounded-xl border ${color} flex flex-col h-full`}>
            <div className={`p-3 border-b border-gray-800 font-bold uppercase text-xs flex justify-between ${headerColor}`}>
                {title} <span className="bg-gray-800/50 px-2 rounded text-white">{orders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {orders.map((order: WorkOrder) => (
                    <div key={order.id} className="bg-[#1F2937] p-4 rounded-xl border border-gray-700 shadow-sm hover:border-gray-500 transition group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] text-gray-500 font-mono">#{order.id}</span>
                            <span className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1">{order.master_products?.name}</h4>
                        <div className="text-xs text-gray-500 mb-3">{order.master_products?.code}</div>

                        <div className="flex justify-between items-end">
                            <div className="bg-black/30 px-3 py-1 rounded text-white font-bold text-sm">{order.quantity} Adet</div>
                            {!isDone && !isActive && (
                                <button onClick={() => onMove(order.id)} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition bg-blue-600 hover:bg-blue-500 text-white`}>
                                    Başla <ChevronRight size={14} />
                                </button>
                            )}
                            {(isActive && !isDone) && ( // Check circle for completing
                                <button onClick={() => onMove(order.id)} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition bg-green-600 hover:bg-green-500 text-white`}>
                                    Tamamla <CheckCircle2 size={14} />
                                </button>
                            )}
                        </div>
                        {order.notes && <div className="mt-3 pt-2 border-t border-gray-700 text-[10px] text-gray-400">{order.notes}</div>}
                    </div>
                ))}
                {orders.length === 0 && <div className="text-center text-gray-600 py-10 italic text-xs">Boş</div>}
            </div>
        </div>
    )
}