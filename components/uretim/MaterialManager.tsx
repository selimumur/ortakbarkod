// Dosya: components/uretim/MaterialManager.tsx
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase'; // Yolunu kontrol et
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MaterialManager() {
    const [materials, setMaterials] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => { fetchMaterials(); }, []);

    async function fetchMaterials() {
        const { data } = await supabase.from('materials').select('*').order('name');
        if(data) setMaterials(data);
    }

    // Basitleştirilmiş Kaydet/Sil (Detayları önceki kodundan alabilirsin)
    async function handleSave() {
        // ... Kaydetme mantığı ...
        toast.success("Örnek: Malzeme Kaydedildi (Modüler yapı çalışıyor)");
        setIsModalOpen(false);
    }

    return (
        <div>
            <div className="flex justify-between mb-4">
                <h3 className="text-white font-bold">Kayıtlı Hammaddeler</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-green-600 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"><Plus size={16}/> Yeni Ekle</button>
            </div>
            
            <div className="overflow-hidden rounded-lg border border-gray-700">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800 text-gray-200">
                        <tr><th className="p-3">Ad</th><th className="p-3">Kategori</th><th className="p-3">Fiyat</th></tr>
                    </thead>
                    <tbody>
                        {materials.map(m => (
                            <tr key={m.id} className="border-t border-gray-800">
                                <td className="p-3">{m.name}</td>
                                <td className="p-3">{m.category}</td>
                                <td className="p-3">{m.unit_price} ₺</td>
                            </tr>
                        ))}
                        {materials.length === 0 && <tr><td colSpan={3} className="p-4 text-center">Veri yok</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal buraya gelecek */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-96">
                        <h3 className="text-white font-bold mb-4">Malzeme Ekle</h3>
                        <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded">Test Kayıt</button>
                        <button onClick={() => setIsModalOpen(false)} className="w-full mt-2 text-gray-400 py-2">Kapat</button>
                    </div>
                </div>
            )}
        </div>
    );
}