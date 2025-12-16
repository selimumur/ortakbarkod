// Dosya: components/uretim/MaterialManager.tsx
"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabaseClient';
import { Pencil, Trash2, Plus, Save, X, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

type Material = {
    id: number;
    name: string;
    category: string;
    unit: string;
    unit_price: number;
    stock: number;
    min_stock: number;
};

export default function MaterialManager() {
    const { getToken } = useAuth();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form State
    const [formData, setFormData] = useState<Partial<Material>>({
        name: "", category: "Genel", unit: "Adet", unit_price: 0, stock: 0, min_stock: 10
    });
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => { fetchMaterials(); }, []);

    async function fetchMaterials() {
        setLoading(true);
        try {
            const token = await getToken({ template: 'supabase' });
            const supabase = createClerkSupabaseClient(token);
            const { data, error } = await supabase.from('materials').select('*').order('name');
            if (error) throw error;
            if (data) setMaterials(data);
        } catch (error: any) {
            toast.error("Veri çekilemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const openModal = (mat?: Material) => {
        if (mat) {
            setFormData(mat);
            setEditingId(mat.id);
        } else {
            setFormData({ name: "", category: "Genel", unit: "Adet", unit_price: 0, stock: 0, min_stock: 10 });
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Hammadde adı gereklidir.");

        const payload = {
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            unit_price: formData.unit_price,
            stock: formData.stock,
            min_stock: formData.min_stock
        };

        try {
            const token = await getToken({ template: 'supabase' });
            const supabase = createClerkSupabaseClient(token);

            if (editingId) {
                const { error } = await supabase.from('materials').update(payload).eq('id', editingId);
                if (error) throw error;
                toast.success("Güncellendi.");
            } else {
                const { error } = await supabase.from('materials').insert([payload]);
                if (error) throw error;
                toast.success("Eklendi.");
            }
            setIsModalOpen(false);
            fetchMaterials();
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bunu silmek istediğinize emin misiniz?")) return;
        try {
            const token = await getToken({ template: 'supabase' });
            const supabase = createClerkSupabaseClient(token);
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) throw error;
            toast.success("Silindi.");
            fetchMaterials();
        } catch (error: any) {
            toast.error("Silinemedi: " + error.message);
        }
    };

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-[#111827] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
            {/* TOOLBAR */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center shrink-0">
                <h3 className="text-white font-bold flex items-center gap-2"><Package size={18} className="text-blue-500" /> Hammadde Listesi</h3>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                        <input type="text" placeholder="Hammadde Ara..." className="bg-[#0B1120] border border-gray-700 rounded-lg pl-9 py-2 text-xs text-white outline-none focus:border-blue-500"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-2 transition shadow-lg">
                        <Plus size={16} /> Yeni Ekle
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#1F2937] text-xs uppercase font-bold sticky top-0 z-10 text-gray-300">
                        <tr>
                            <th className="p-4">Ad</th>
                            <th className="p-4">Kategori</th>
                            <th className="p-4">Birim</th>
                            <th className="p-4">Birim Fiyat</th>
                            <th className="p-4">Stok</th>
                            <th className="p-4 text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? <tr><td colSpan={6} className="p-10 text-center">Yükleniyor...</td></tr> :
                            filteredMaterials.length === 0 ? <tr><td colSpan={6} className="p-10 text-center">Kayıt Yok</td></tr> :
                                filteredMaterials.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-800/50 transition group">
                                        <td className="p-4 font-bold text-white">{m.name}</td>
                                        <td className="p-4"><span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs">{m.category}</span></td>
                                        <td className="p-4 text-xs">{m.unit}</td>
                                        <td className="p-4 font-mono text-gray-300">{m.unit_price} ₺</td>
                                        <td className="p-4">
                                            <div className={`font-bold ${m.stock <= m.min_stock ? 'text-red-400' : 'text-green-400'}`}>
                                                {m.stock} {m.unit}
                                            </div>
                                            {m.stock <= m.min_stock && <div className="text-[9px] text-red-500 font-bold">KRİTİK</div>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => openModal(m)} className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50"><Pencil size={14} /></button>
                                                <button onClick={() => handleDelete(m.id)} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-[#1F2937] p-6 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Düzenle' : 'Yeni Hammadde'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Hammadde Adı</label>
                                <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Örn: 18mm Sunta" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Kategori</label>
                                    <select className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
                                        value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="Genel">Genel</option>
                                        <option value="Ahşap">Ahşap</option>
                                        <option value="Metal">Metal</option>
                                        <option value="Hırdavat">Hırdavat</option>
                                        <option value="Kumaş">Kumaş</option>
                                        <option value="Boya">Boya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Birim</label>
                                    <select className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
                                        value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                        <option value="Adet">Adet</option>
                                        <option value="Metre">Metre (m)</option>
                                        <option value="M2">Metrekare (m²)</option>
                                        <option value="Kg">Kilogram (kg)</option>
                                        <option value="Litre">Litre (L)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Birim Fiyat (₺)</label>
                                    <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
                                        value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Mevcut Stok</label>
                                    <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
                                        value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Kritik Stok Uyarı Limiti</label>
                                <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
                                    value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: Number(e.target.value) })} />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition">İptal</button>
                            <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg transition flex items-center justify-center gap-2">
                                <Save size={16} /> {editingId ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}