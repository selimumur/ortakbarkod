"use client";

import { useEffect, useState } from 'react';
import { getModulesAdminAction, upsertModuleAction, deleteModuleAction } from '@/app/actions/moduleActions';
import { toast } from 'sonner';
import { Plus, Trash, Edit, Package } from 'lucide-react';

export default function ModulesPage() {
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        price: 0,
        is_active: true
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadModules();
    }, []);

    const loadModules = async () => {
        setLoading(true);
        try {
            const data = await getModulesAdminAction();
            setModules(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await upsertModuleAction(formData);
            toast.success(isEditing ? "Modül güncellendi" : "Modül oluşturuldu");
            setIsModalOpen(false);
            loadModules();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu modülü silmek istediğinize emin misiniz?")) return;
        try {
            await deleteModuleAction(id);
            toast.success("Modül silindi");
            loadModules();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        }
    };

    const openModal = (module?: any) => {
        if (module) {
            setFormData({
                id: module.id,
                name: module.name,
                description: module.description || '',
                price: parseFloat(module.price),
                is_active: module.is_active
            });
            setIsEditing(true);
        } else {
            setFormData({
                id: '',
                name: '',
                description: '',
                price: 0,
                is_active: true
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-8">Yükleniyor...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Modül Yönetimi</h1>
                    <p className="text-gray-500">Pazaryerinde satılacak ek paketleri yönetin.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 transition"
                >
                    <Plus size={18} /> Yeni Modül Ekle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(module => (
                    <div key={module.id} className={`border rounded-xl p-6 bg-white shadow-sm relative ${!module.is_active ? 'opacity-60 grayscale' : ''}`}>
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => openModal(module)} className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(module.id)} className="p-2 hover:bg-gray-100 rounded-lg text-red-600 transition"><Trash size={16} /></button>
                        </div>

                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                            <Package size={24} />
                        </div>

                        <h3 className="font-bold text-lg mb-1">{module.name}</h3>
                        <p className="text-sm text-gray-500 mb-4 h-10 overflow-hidden text-ellipsis">{module.description}</p>

                        <div className="flex justify-between items-center border-t pt-4">
                            <span className="font-mono text-xs text-gray-400">ID: {module.id}</span>
                            <span className="font-bold text-xl">{parseFloat(module.price).toLocaleString()} ₺</span>
                        </div>

                        {!module.is_active && (
                            <div className="mt-2 text-center text-xs font-bold text-red-500 bg-red-50 py-1 rounded">PASİF</div>
                        )}
                    </div>
                ))}

                {modules.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                        Henüz modül eklenmemiş.
                    </div>
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6">{isEditing ? 'Modülü Düzenle' : 'Yeni Modül'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Modül ID (Teknik İsim)</label>
                                <input
                                    required
                                    disabled={isEditing}
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    placeholder="örn: stock_ai"
                                    className="w-full border rounded-lg p-2 font-mono text-sm"
                                />
                                {!isEditing && <p className="text-xs text-gray-400 mt-1">Benzersiz olmalı, boşluk içermemeli (örn: arbitraj)</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Modül Adı</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="örn: Yapay Zeka Paketi"
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Modül detayları..."
                                    className="w-full border rounded-lg p-2 h-24 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fiyat (Aylık ₺)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <label className="text-sm font-medium">Satışta (Aktif)</label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
