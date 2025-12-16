"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MessageCircle, Send, ChevronLeft, Paperclip, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getTenantTicketsAction, getTicketDetailsAction, replyTicketAction } from '@/app/actions/supportActions';

interface Ticket {
    id: number;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: number;
    message: string;
    is_admin_reply: boolean;
    created_at: string;
    attachments: string[];
}

export default function TenantSupportView() {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [ticketDetails, setTicketDetails] = useState<{ ticket: Ticket, messages: Message[] } | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Initial Load
    useEffect(() => {
        loadTickets();
    }, []);

    async function loadTickets() {
        setLoading(true);
        try {
            const data = await getTenantTicketsAction();
            setTickets(data);
        } catch (error) {
            console.error(error);
            toast.error("Talepler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectTicket(id: number) {
        setSelectedTicketId(id);
        setView('detail');
        setTicketDetails(null); // Clear previous

        try {
            const data = await getTicketDetailsAction(id);
            setTicketDetails(data as any);
        } catch (error) {
            console.error(error);
            toast.error("Detaylar yüklenemedi.");
            setView('list');
        }
    }

    async function handleReply(e: React.FormEvent) {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicketId) return;

        setSendingReply(true);
        try {
            await replyTicketAction(selectedTicketId, replyMessage);
            toast.success("Yanıtınız gönderildi.");
            setReplyMessage('');
            // Refresh details
            const data = await getTicketDetailsAction(selectedTicketId);
            setTicketDetails(data as any);
        } catch (error) {
            console.error(error);
            toast.error("Yanıt gönderilemedi.");
        } finally {
            setSendingReply(false);
        }
    }

    // LIST VIEW
    if (view === 'list') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Destek Taleplerim</h2>
                        <p className="text-gray-400 text-sm">Teknik ekibimizle yaptığınız tüm görüşmeler.</p>
                    </div>
                    <button onClick={loadTickets} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition">
                        <Clock size={16} />
                    </button>
                </header>

                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 bg-[#111827] rounded-2xl border border-gray-800">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <MessageCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Henüz Destek Talebiniz Yok</h3>
                        <p className="text-gray-400 text-sm">Soldaki butonu kullanarak yeni bir talep oluşturabilirsiniz.</p>
                    </div>
                ) : (
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-4">Konu</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {tickets.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-800/50 transition cursor-pointer" onClick={() => handleSelectTicket(t.id)}>
                                        <td className="px-6 py-4 font-medium text-white">{t.subject}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={t.status} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {format(new Date(t.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronLeft className="inline-block rotate-180 text-gray-500" size={16} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    // DETAIL VIEW
    return (
        <div className="h-[600px] flex flex-col bg-[#111827] border border-gray-800 rounded-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center gap-4 bg-gray-900/50">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                    <ChevronLeft size={20} />
                </button>
                {ticketDetails ? (
                    <div>
                        <h3 className="text-white font-bold text-lg">{ticketDetails.ticket.subject}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={ticketDetails.ticket.status} />
                            <span className="text-xs text-gray-500">#{ticketDetails.ticket.id}</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-32 h-6 bg-gray-800 rounded animate-pulse"></div>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {!ticketDetails ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : (
                    ticketDetails.messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.is_admin_reply
                                    ? 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
                                    : 'bg-blue-600 text-white rounded-tr-none shadow-lg'
                                }`}>
                                <div className="text-xs opacity-50 mb-1 font-bold flex items-center gap-2">
                                    {msg.is_admin_reply ? 'Destek Ekibi' : 'Siz'}
                                    <span className="font-normal">{format(new Date(msg.created_at), 'HH:mm', { locale: tr })}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/30">
                <form onSubmit={handleReply} className="flex gap-3">
                    <input
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder={ticketDetails?.ticket.status === 'closed' ? 'Bu talep kapatılmıştır.' : "Yanıtınızı yazın..."}
                        disabled={!ticketDetails || sendingReply || ticketDetails.ticket.status === 'closed'}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!ticketDetails || sendingReply || !replyMessage.trim() || ticketDetails.ticket.status === 'closed'}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white p-3 rounded-xl transition flex items-center justify-center min-w-[50px]"
                    >
                        {sendingReply ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'open') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Açık</span>;
    if (status === 'answered') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">Yanıtlandı</span>;
    if (status === 'closed') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">Kapalı</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-gray-400">{status}</span>;
}
