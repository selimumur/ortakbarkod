import { getAdminTicketsAction } from "@/app/actions/supportActions";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { MessageCircle, Search, Filter, MoreHorizontal, Eye } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
    const tickets = await getAdminTicketsAction();

    return (
        <div className="p-8 max-w-[1600px] mx-auto text-gray-200">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <MessageCircle className="text-blue-500" size={32} />
                        Destek Talepleri
                    </h1>
                    <p className="text-gray-400">Kiracılardan gelen tüm teknik destek ve yardım talepleri.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            placeholder="Talep ara..."
                            className="bg-[#111827] border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-gray-700 rounded-xl text-gray-400 hover:text-white transition text-sm font-medium">
                        <Filter size={16} /> Filtrele
                    </button>
                </div>
            </header>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 font-bold uppercase text-xs border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-4">Firma / Kiracı</th>
                            <th className="px-6 py-4">Konu</th>
                            <th className="px-6 py-4">Durum</th>
                            <th className="px-6 py-4">Son Güncelleme</th>
                            <th className="px-6 py-4 text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {tickets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    Henüz hiç destek talebi yok.
                                </td>
                            </tr>
                        ) : (
                            tickets.map((t: any) => (
                                <tr key={t.id} className="hover:bg-gray-800/50 transition group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white">{t.company_name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">ID: #{t.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-300 font-medium">{t.subject}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={t.status} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 tabular-nums">
                                        {format(new Date(t.updated_at || t.created_at), 'd MMM HH:mm', { locale: tr })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/support/${t.id}`}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition text-xs font-bold border border-blue-600/20"
                                        >
                                            <Eye size={14} /> İncele
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'open') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">Açık</span>;
    if (status === 'answered') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">Yanıt Bekliyor</span>;
    if (status === 'closed') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">Tamamlandı</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400">{status}</span>;
}
