"use client";

import { useEffect, useState } from 'react';
import { getAdminPlansAction, upsertPlanAction, deletePlanAction } from '@/app/actions/planActions';
import { Plus, Edit, Trash2, Check, X, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);

    // Form Stats
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        price: 0,
        price_yearly: 0,
        currency: 'TRY',
        is_active: true,
        is_popular: false,
        features_json: '',
        limits_json: ''
    });

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await getAdminPlansAction();
            setPlans(data);
        } catch (e) {
            console.error(e);
            toast.error("Paketler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        setFormData({
            id: plan.id,
            name: plan.name,
            description: plan.description || '',
            price: plan.price,
            price_yearly: plan.price_yearly || 0,
            currency: plan.currency,
            is_active: plan.is_active,
            is_popular: plan.is_popular,
            features_json: JSON.stringify(plan.features, null, 2),
            limits_json: JSON.stringify(plan.limits, null, 2)
        });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingPlan(null);
        setFormData({
            id: '',
            name: '',
            description: '',
            price: 0,
            price_yearly: 0,
            currency: 'TRY',
            is_active: true,
            is_popular: false,
            features_json: JSON.stringify({
                marketplace: false,
                arbitrage: false,
                production: true,
                advanced_reports: false,
                api_access: false
            }, null, 2),
            limits_json: JSON.stringify({
                products: 500,
                users: 2,
                stores: 0
            }, null, 2)
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            // Parse JSONs
            let features = {};
            let limits = {};
            try {
                features = JSON.parse(formData.features_json);
            } catch (e) {
                return toast.error("Özellikler JSON formatı hatalı.");
            }
            try {
                limits = JSON.parse(formData.limits_json);
            } catch (e) {
                return toast.error("Limitler JSON formatı hatalı.");
            }

            const payload = {
                ...formData,
                features,
                limits
            };

            const res = await upsertPlanAction(payload);
            if (res.success) {
                toast.success("Paket kaydedildi.");
                setIsModalOpen(false);
                loadPlans();
            } else {
                toast.error(res.error || "Hata oluştu.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Bir hata oluştu.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu paketi silmek istediğinize emin misiniz?")) return;
        try {
            const res = await deletePlanAction(id);
            if (res.success) {
                toast.success("Paket silindi.");
                loadPlans();
            } else {
                toast.error(res.error || "Silinemedi.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Hata oluştu.");
        }
    };

    return (
        <div className="p-8 space-y-8 text-gray-800">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="text-blue-600" /> Paket Yönetimi
                </h1>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"
                >
                    <Plus size={18} /> Yeni Paket
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium text-sm">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Paket Adı</th>
                            <th className="p-4">Fiyat</th>
                            <th className="p-4">Limitler</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {plans.map(plan => (
                            <tr key={plan.id} className="hover:bg-gray-50/50">
                                <td className="p-4 font-mono text-xs text-gray-500">{plan.id}</td>
                                <td className="p-4 font-bold text-gray-900">
                                    {plan.name}
                                    {plan.is_popular && <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full">POPÜLER</span>}
                                </td>
                                <td className="p-4 font-medium text-gray-900">
                                    <div>{plan.price.toLocaleString()} {plan.currency} <span className="text-gray-400 text-xs">/ay</span></div>
                                    <div className="text-xs text-gray-500">{plan.price_yearly?.toLocaleString()} {plan.currency} /yıl</div>
                                </td>
                                <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                                    {JSON.stringify(plan.limits)}
                                </td>
                                <td className="p-4">
                                    {plan.is_active ? (
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full w-fit">
                                            <Check size={12} /> Aktif
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-100 px-2 py-1 rounded-full w-fit">
                                            Pasif
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEdit(plan)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(plan.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {plans.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">Paket bulunamadı.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">{editingPlan ? 'Paketi Düzenle' : 'Yeni Paket Ekle'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ID (Tekil Kod)</label>
                                    <input
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.id}
                                        onChange={e => setFormData({ ...formData, id: e.target.value })}
                                        disabled={!!editingPlan}
                                        placeholder="ornek: starter"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Paket Adı</label>
                                    <input
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
                                <input
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Aylık Fiyat</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Yıllık Fiyat</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.price_yearly}
                                        onChange={e => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Para Birimi</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-4 pt-6">
                                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        /> Aktif
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_popular}
                                            onChange={e => setFormData({ ...formData, is_popular: e.target.checked })}
                                        /> Popüler
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Özellikler (JSON)</label>
                                    <p className="text-xs text-gray-500 mb-1">marketplace, arbitrage, production...</p>
                                    <textarea
                                        className="w-full border rounded-lg p-2 text-sm font-mono h-40"
                                        value={formData.features_json}
                                        onChange={e => setFormData({ ...formData, features_json: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Limitler (JSON)</label>
                                    <p className="text-xs text-gray-500 mb-1">products, users, stores...</p>
                                    <textarea
                                        className="w-full border rounded-lg p-2 text-sm font-mono h-40"
                                        value={formData.limits_json}
                                        onChange={e => setFormData({ ...formData, limits_json: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2"
                            >
                                <Save size={18} /> Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
