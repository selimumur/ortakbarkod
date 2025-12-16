"use client";

import { useEffect, useState, useRef } from 'react';
import { getTicketDetailsAction, replyTicketAction } from '@/app/actions/supportActions';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantTicketDetail({ params }: { params: { id: string } }) {
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadDetails = async () => {
        try {
            const data = await getTicketDetailsAction(Number(params.id));
            setTicket(data.ticket);
            setMessages(data.messages);
        } catch (error) {
            toast.error("Detaylar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleReply = async () => {
        if (!replyText.trim()) return toast.error("Mesaj yazın.");
        setSending(true);

        try {
            const res = await replyTicketAction(Number(params.id), replyText);
            if (res.success) {
                toast.success("Mesaj gönderildi.");
                setReplyText("");
                loadDetails();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-gray-500">Yükleniyor...</div>;
    if (!ticket) return <div className="text-center py-20 text-gray-500">Ticket bulunamadı.</div>;

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            {/* HEADER */}
            <div className="bg-[#0B1120] border border-white/5 p-4 rounded-t-2xl flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/yardim/destek" className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-bold text-white">#{ticket.id} - {ticket.subject}</h1>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                ${ticket.status === 'open' ? 'bg-red-500/20 text-red-500' :
                                    ticket.status === 'answered' ? 'bg-green-500/20 text-green-500' :
                                        'bg-gray-500/20 text-gray-500'}`}>
                                {ticket.status === 'open' ? 'Açık' : ticket.status === 'answered' ? 'Cevaplandı' : 'Kapalı'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">Son Güncelleme: {new Date(ticket.updated_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 bg-black/20 border-x border-white/5 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 ${msg.is_admin_reply ? 'bg-[#1C2536] text-gray-200 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                            <div className="text-sm font-bold mb-1 opacity-70">
                                {msg.is_admin_reply ? 'Destek Ekibi' : 'Siz'}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.message}</div>
                            <div className="text-[10px] opacity-50 text-right mt-2">{new Date(msg.created_at).toLocaleTimeString()}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="bg-[#0B1120] border border-white/5 p-4 rounded-b-2xl shrink-0">
                <textarea
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none resize-none h-24 mb-3"
                    placeholder="Mesajınız..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending || ticket.status === 'closed'}
                ></textarea>
                <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        {ticket.status === 'closed' ? 'Bu konu kapatılmıştır.' : 'Ek dosya yüklemek için şimdilik mail atınız.'}
                    </p>
                    <button
                        onClick={handleReply}
                        disabled={sending || ticket.status === 'closed'}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                        {sending ? 'Gönderiliyor...' : (
                            <>
                                <Send size={16} /> Gönder
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
