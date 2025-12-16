"use client";

import { adminReplyTicketAction } from "@/app/actions/supportActions";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, Loader2, Send, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
    ticket: any;
    initialMessages: any[];
    companyName: string;
}

export default function AdminTicketDetailView({ ticket, initialMessages, companyName }: Props) {
    const router = useRouter();
    const [messages, setMessages] = useState(initialMessages);
    const [replyMessage, setReplyMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [ticketStatus, setTicketStatus] = useState(ticket.status);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function handleReply(e: React.FormEvent) {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        setSending(true);
        try {
            // Optimistic update
            const tempId = Date.now();
            const tempMsg = {
                id: tempId,
                message: replyMessage,
                is_admin_reply: true,
                created_at: new Date().toISOString(),
                sender_id: 'ADMIN'
            };
            setMessages(prev => [...prev, tempMsg]);

            await adminReplyTicketAction(ticket.id, replyMessage, 'answered');

            toast.success("Yanıt gönderildi");
            setReplyMessage("");
            setTicketStatus('answered');
            router.refresh(); // Sync actual data

        } catch (error) {
            console.error(error);
            toast.error("Mesaj gönderilemedi");
        } finally {
            setSending(false);
        }
    }

    async function handleStatusChange(newStatus: string) {
        if (!confirm(`Talebi '${newStatus}' olarak işaretlemek istediğinize emin misiniz?`)) return;

        try {
            // We reuse the reply action to update status without message? 
            // Or we check the existing action. `adminReplyTicketAction` takes message.
            // Let's just send a system note or create a refined action later.
            // For now, let's send a status update message with it or modify implementation.
            // ACTUALLY, I'll assume for MVP we just reply to change status OR 
            // I should have created a separate updateStatusAction.
            // Let's use reply for now with a generic message if needed, OR just update status on reply.

            // Wait, looking at supportActions.ts, `adminReplyTicketAction` TAKES `newStatus`.
            // So we can send an empty message? No, message is likely required.
            // Let's force a "Durum Güncellemesi" message.

            await adminReplyTicketAction(ticket.id, `[SİSTEM] Talep durumu '${newStatus}' olarak güncellendi.`, newStatus);
            toast.success("Durum güncellendi");
            setTicketStatus(newStatus);
            router.refresh();
        } catch (error) {
            toast.error("Hata oluştu");
        }
    }

    return (
        <div className="flex flex-col h-full gap-6">

            <div className="flex gap-6 h-full">
                {/* Main Chat */}
                <div className="flex-1 flex flex-col bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.map((msg: any) => (
                            <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col max-w-[80%] ${msg.is_admin_reply ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-xs font-bold text-gray-500">
                                            {msg.is_admin_reply ? 'Moderatör' : companyName}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                            {format(new Date(msg.created_at), 'HH:mm', { locale: tr })}
                                        </span>
                                    </div>
                                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.is_admin_reply
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
                                        }`}>
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-gray-900 border-t border-gray-800">
                        <form onSubmit={handleReply} className="flex gap-4">
                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply(e);
                                    }
                                }}
                                placeholder="Yanıtınızı yazın... (Enter ile gönder)"
                                className="flex-1 bg-[#0B1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-14 custom-scrollbar"
                            />
                            <button
                                type="submit"
                                disabled={sending || !replyMessage.trim()}
                                className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="w-80 shrink-0 space-y-6">
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Talep Bilgileri</h3>

                        <div className="space-y-4 text-sm">
                            <div>
                                <div className="text-gray-500 mb-1">Durum</div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={ticketStatus} />
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Açılma Tarihi</div>
                                <div className="text-white">{format(new Date(ticket.created_at), 'd MMMM yyyy HH:mm', { locale: tr })}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Kiracı</div>
                                <div className="text-white font-medium">{companyName}</div>
                                <div className="text-gray-600 text-xs mt-0.5">{ticket.tenant_id}</div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-800 space-y-3">
                            {ticketStatus !== 'closed' && (
                                <button
                                    onClick={() => handleStatusChange('closed')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition text-sm font-bold"
                                >
                                    <XCircle size={16} /> Talebi Kapat
                                </button>
                            )}
                            {ticketStatus === 'closed' && (
                                <button
                                    onClick={() => handleStatusChange('open')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl transition text-sm font-bold"
                                >
                                    <CheckCircle size={16} /> Talebi Tekrar Aç
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'open') return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-2 w-fit"><AlertCircle size={14} /> Açık</span>;
    if (status === 'answered') return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-2 w-fit"><Clock size={14} /> Yanıtlandı</span>;
    if (status === 'closed') return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-2 w-fit"><CheckCircle size={14} /> Kapalı</span>;
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400">{status}</span>;
}
