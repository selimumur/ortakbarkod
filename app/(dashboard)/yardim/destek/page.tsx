"use client";

import { useEffect, useState } from 'react';
import { getTenantTicketsAction, createTicketAction } from '@/app/actions/supportActions';
import Link from 'next/link';
import { MessageSquare, Plus, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantSupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ subject: '', message: '' });
    const [submitting, setSubmitting] = useState(false);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const data = await getTenantTicketsAction();
            setTickets(data);
        } catch (error) {
            toast.error("Ticketlar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const handleCreate = async () => {
        if (!formData.subject || !formData.message) return toast.error("Konu ve mesaj zorunludur.");
        setSubmitting(true);
        try {
            const res = await createTicketAction(formData.subject, formData.message);
            if (res.success) {
                toast.success("Destek talebi oluşturuldu.");
                setFormData({ subject: '', message: '' });
                setIsModalOpen(false);
                loadTickets();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#0B1120] border border-white/5 p-6 rounded-2xl">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <MessageSquare className="text-blue-500" />
                        Destek Merkezi
                    </h1>
                    <p className="text-gray-400 mt-1">Sorularınız ve teknik destek için talepleriniz.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                    <Plus size={18} /> Yeni Destek Talebi
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
            ) : tickets.length === 0 ? (
                <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-10 text-center text-gray-400">
                    <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
                    Henüz bir destek talebiniz bulunmuyor.
                </div>
            ) : (
                <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">Konu</th>
                                <th className="p-4">Durum</th>
                                <th className="p-4">Son Güncelleme</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {tickets.map((t) => (
                                <tr key={t.id} className="hover:bg-white/5 transition group">
                                    <td className="p-4">
                                        <div className="font-bold text-white text-sm">{t.subject}</div>
                                        <div className="text-xs text-gray-500">#{t.id}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                                            ${t.status === 'open' ? 'bg-red-500/20 text-red-500' :
                                                t.status === 'answered' ? 'bg-green-500/20 text-green-500' :
                                                    'bg-gray-500/20 text-gray-500'}`}>
                                            {t.status === 'open' ? 'Açık (Bekliyor)' : t.status === 'answered' ? 'Cevaplandı' : 'Kapalı'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {new Date(t.updated_at).toLocaleDateString("tr-TR")}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Link href={`/yardim/destek/${t.id}`} className="inline-flex items-center gap-1 text-sm text-blue-400 font-bold hover:text-blue-300">
                                            Görüntüle <ChevronRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121826] border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 text-white">Yeni Destek Talebi</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Konu</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                                    placeholder="Örn: Entegrasyon hatası alıyorum"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Mesajınız</label>
                                <textarea
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none resize-none h-32"
                                    placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition font-bold text-sm"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2"
                            >
                                {submitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={18} />}
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
