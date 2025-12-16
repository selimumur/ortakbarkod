"use client";
import React, { useState, useEffect } from 'react';
import { MessageSquareQuote, Star, User, MessageCircle, Send, Sparkles, CheckCircle2 } from 'lucide-react';

import { getQuestionsAction, answerQuestionAction, syncQuestionsAction } from '@/app/actions/questionActions';
import { getReviewsAction, syncReviewsAction, replyReviewAction } from '@/app/actions/reviewActions';
import { toast } from 'sonner';

export default function CommentsQuestionsPage() {
    const [activeTab, setActiveTab] = useState<'comments' | 'questions'>('comments');
    const [comments, setComments] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [replying, setReplying] = useState(false);

    // Reply State
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'comments') {
                const data = await getReviewsAction();
                setComments(data);
            } else {
                const data = await getQuestionsAction();
                setQuestions(data.map((q: any) => ({
                    id: q.id,
                    userName: q.customer_name,
                    productName: q.product_name,
                    content: q.text,
                    date: new Date(q.created_date).toLocaleString('tr-TR'),
                    status: q.status === 'ANSWERED' ? 'replied' : 'pending',
                    reply: q.answer_text,
                    storeId: q.store_id // Needed for API answer
                })));
            }
        } catch (e) {
            console.error(e);
            toast.error("Veriler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            if (activeTab === 'comments') {
                await syncReviewsAction();
                toast.success("Yorumlar güncellendi");
            } else {
                await syncQuestionsAction();
                toast.success("Sorular güncellendi");
            }
            loadData();
        } catch (e: any) {
            toast.error("Senkronizasyon hatası: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAIReply = (content: string) => {
        // Mock AI for now
        let suggestion = "";
        if (content.toLowerCase().includes("beden") || content.toLowerCase().includes("kalıp")) {
            suggestion = "Merhabalar. Ürün kalıplarımız standarttır ancak daha rahat bir kullanım için bir beden büyük tercih edebilirsiniz. Keyifli alışverişler dileriz.";
        } else if (content.toLowerCase().includes("iade") || content.toLowerCase().includes("bozuldu")) {
            suggestion = "Yaşadığınız olumsuz deneyimden dolayı çok üzgünüz. İade talebinizi oluşturursanız ekibimiz hemen ilgilenecektir. Anlayışınız için teşekkür ederiz.";
        } else {
            suggestion = "Değerli geri bildiriminiz için çok teşekkür ederiz. Memnuniyetiniz bizim için çok önemli. Güzel günlerde kullanmanızı dileriz.";
        }
        setReplyText(suggestion);
        toast.success("AI yanıt önerisi oluşturuldu!");
    };

    const sendReply = async (item: any) => {
        if (!replyText) return;
        setReplying(true);

        try {
            if (activeTab === 'comments') {
                await replyReviewAction(item.id, replyText);
            } else {
                // For questions, we need storeId. If missing, might fail.
                await answerQuestionAction({
                    questionId: item.id,
                    text: replyText,
                    storeId: item.storeId || 0
                });
            }

            toast.success("Yanıt gönderildi!");
            setActiveReplyId(null);
            setReplyText("");
            loadData();

        } catch (e: any) {
            console.error(e);
            toast.error("Yanıt gönderilemedi: " + e.message);
        } finally {
            setReplying(false);
        }
    };

    const currentData = activeTab === 'comments' ? comments : questions;

    return (
        <div className="flex flex-col h-screen bg-[#0B1120] text-gray-200 p-6 overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquareQuote className="text-orange-500" /> Yorum & Soru Yönetimi
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Müşteri etkileşimlerini tek merkezden yönetin.</p>
                </div>

                <div className="flex gap-4">
                    <button onClick={handleSync} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-gray-300">
                        <Sparkles size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Yenileniyor..." : "Verileri Yenile"}
                    </button>

                    {/* Tabs */}
                    <div className="flex bg-[#111827] p-1 rounded-lg border border-gray-800">
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'comments' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Star size={14} className={activeTab === 'comments' ? 'text-yellow-400' : ''} /> Ürün Yorumları
                        </button>
                        <button
                            onClick={() => setActiveTab('questions')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'questions' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            <MessageCircle size={14} className={activeTab === 'questions' ? 'text-blue-400' : ''} /> Müşteri Soruları
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto space-y-4 custom-scrollbar pr-2">
                {loading && currentData.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">Yükleniyor...</div>
                ) : currentData.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <MessageSquareQuote size={32} className="opacity-20" />
                        </div>
                        <p>Kayıt bulunamadı.</p>
                        <button onClick={handleSync} className="text-indigo-400 text-sm mt-2 hover:underline">Verileri Çekmeyi Dene</button>
                    </div>
                ) : (
                    currentData.map((item: any) => (
                        <div key={item.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
                            {/* Item Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 border border-gray-700">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{item.userName}</span>
                                            <span className="text-gray-600 text-xs">• {item.date}</span>
                                        </div>
                                        <div className="text-xs text-blue-400 mt-0.5">{item.productName}</div>
                                    </div>
                                </div>

                                {/* Rating or Status */}
                                <div className="flex items-center gap-2">
                                    {activeTab === 'comments' && (
                                        <div className="flex text-yellow-500">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={i < item.rating ? "currentColor" : "none"} className={i >= item.rating ? "text-gray-700" : ""} />
                                            ))}
                                        </div>
                                    )}
                                    <span className={`text-[10px] px-2 py-1 rounded-full border uppercase font-bold ${item.status === 'replied' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-red-900/20 text-red-400 border-red-500/20'
                                        }`}>
                                        {item.status === 'replied' ? 'Yanıtlandı' : 'Bekliyor'}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <p className="text-gray-300 text-sm mb-4 pl-13 leading-relaxed">"{item.content}"</p>

                            {/* Reply Section */}
                            {item.status === 'replied' ? (
                                <div className="bg-green-900/5 border border-green-900/20 rounded-lg p-3 ml-12 text-sm text-gray-400 flex gap-2">
                                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-green-500 block text-xs mb-1">Yanıtınız:</span>
                                        {item.reply}
                                    </div>
                                </div>
                            ) : (
                                <div className="ml-12">
                                    {activeReplyId === item.id ? (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <textarea
                                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 outline-none min-h-[100px]"
                                                placeholder="Yanıtınızı yazın..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                            />
                                            <div className="flex justify-between items-center">
                                                <button
                                                    onClick={() => handleAIReply(item.content)}
                                                    className="text-orange-400 text-xs hover:text-white flex items-center gap-1.5 transition"
                                                >
                                                    <Sparkles size={14} /> AI Yanıt Öner
                                                </button>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setActiveReplyId(null)}
                                                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition"
                                                    >
                                                        İptal
                                                    </button>
                                                    <button
                                                        onClick={() => sendReply(item)}
                                                        disabled={replying}
                                                        className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition"
                                                    >
                                                        <Send size={12} /> {replying ? "Gönderiliyor..." : "Gönder"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setActiveReplyId(item.id); setReplyText(""); }}
                                            className="text-sm text-gray-500 hover:text-white flex items-center gap-2 transition"
                                        >
                                            <MessageCircle size={16} /> Yanıtla
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )))}
            </div>
        </div>
    );
}
