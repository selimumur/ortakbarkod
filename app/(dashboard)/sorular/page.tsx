"use client";

import { useState, useEffect } from 'react';
import {
  Clock, RefreshCw, Send, MessageCircle,
  ChevronDown, CheckCircle,
  XCircle, Store, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getQuestionsAction,
  syncQuestionsAction,
  answerQuestionAction,
  getAccountsAction
} from '@/app/actions/questionActions';

export default function QuestionsPage() {
  // const { getToken } = useAuth(); // REMOVED

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Cevap Bekliyor");
  const [selectedStoreId, setSelectedStoreId] = useState("Tümü");
  const [accounts, setAccounts] = useState<any[]>([]);

  // Answering State
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    // Parallel Fetch
    setLoading(true);
    try {
      const [accs, qs] = await Promise.all([
        getAccountsAction(),
        getQuestionsAction()
      ]);
      setAccounts(accs?.filter((a: any) => a.platform.toLowerCase().includes('trendyol')) || []);
      setQuestions(qs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Refetch only questions
  async function refreshQuestions() {
    try {
      // If we had server side filtering, we'd pass args here. 
      // Current action returns all (limited 200), client filters.
      const qs = await getQuestionsAction();
      setQuestions(qs || []);
    } catch (e) { console.error(e); }
  }

  async function handleSync() {
    setLoading(true);
    const toastId = toast.loading("Trendyol'dan sorular çekiliyor...");
    try {
      const result = await syncQuestionsAction();
      if (result.success) {
        toast.success(result.message, { id: toastId });
        refreshQuestions();
      } else {
        toast.error(result.message || "Hata oluştu", { id: toastId });
        if (result.warnings && result.warnings.length > 0) {
          console.warn("Sync Warnings:", result.warnings);
        }
      }
    } catch (error) {
      toast.error("Bağlantı Hatası", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendAnswer(q: any) {
    if (!answerText.trim()) return;
    setSending(true);
    try {
      const result = await answerQuestionAction({
        questionId: q.id,
        text: answerText,
        storeId: q.store_id
      });

      if (result.success) {
        toast.success("Cevap gönderildi ve kaydedildi!");
        setAnsweringId(null);
        setAnswerText("");
        refreshQuestions();
      } else {
        toast.error("Gönderilemedi: " + result.error);
      }
    } catch (e) {
      toast.error("Beklenmeyen hata");
    } finally {
      setSending(false);
    }
  }

  // FILTERS
  const filteredList = questions.filter(q => {
    // 1. Store Filter
    // Note: selectedStoreId is string "Tümü" or number ID.
    if (selectedStoreId !== "Tümü" && q.store_id !== Number(selectedStoreId)) return false;

    // 2. Tab Filter
    if (activeTab === "Cevap Bekliyor") return q.status === "Cevap Bekliyor" || q.status === "WAITING_FOR_ANSWER";
    if (activeTab === "Cevaplandı") return q.status === "Cevaplandı" || q.status === "ANSWERED";
    if (activeTab === "Reddedildi") return q.status === "Reddedildi" || q.status === "REJECTED";
    if (activeTab === "Bildirildi") return q.status === "Bildirildi" || q.status === "REPORTED";

    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('bekliyor') || s.includes('waiting')) return <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={10} /> Cevap Bekliyor</span>;
    if (s.includes('cevaplandı') || s.includes('answered')) return <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={10} /> Cevaplandı</span>;
    if (s.includes('red') || s.includes('reject')) return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><XCircle size={10} /> Reddedildi</span>;
    return <span className="bg-gray-800 text-gray-400 border border-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
  }

  return (
    <div className="w-full h-full bg-[#020617] overflow-y-auto custom-scrollbar">

      {/* HEADER */}
      <header className="px-8 py-6 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 bg-[#020617]/95 backdrop-blur sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MessageSquare size={20} /></div>
            <h1 className="text-2xl font-bold text-white">Soru & Cevap Yönetimi</h1>
          </div>
          <p className="text-gray-500 text-xs pl-1">Trendyol mağazalarınızdan gelen müşteri sorularını tek panelden yönetin (Secure Mode).</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Store Select */}
          <div className="relative group">
            <select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              className="appearance-none bg-[#0F172A] border border-gray-700 text-white text-xs font-bold rounded-xl px-4 py-2.5 pr-8 focus:border-blue-500 outline-none cursor-pointer hover:border-gray-600 transition min-w-[150px]"
            >
              <option value="Tümü">Tüm Mağazalar</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.store_name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <button onClick={handleSync} disabled={loading} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-900/20">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Senkronize Ediliyor..." : "Soruları Çek"}
          </button>
        </div>
      </header>

      <div className="px-8 pb-12 max-w-5xl mx-auto">

        {/* TABS */}
        <div className="flex gap-2 mb-8 bg-[#0F172A] p-1 rounded-xl w-fit border border-gray-800">
          {['Cevap Bekliyor', 'Cevaplandı', 'Reddedildi', 'Bildirildi'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredList.map((q) => (
            <div key={q.id} className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition group">
              <div className="flex gap-5">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-700 bg-white flex-shrink-0 relative">
                  {q.product_image ? (
                    <img src={q.product_image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400"><Store size={20} /></div>
                  )}
                  {q.web_url && <a href={q.web_url} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition cursor-pointer">
                    <Store size={16} className="text-white" />
                  </a>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-bold text-sm truncate max-w-md" title={q.product_name}>{q.product_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500 font-mono bg-gray-900/50 px-1.5 py-0.5 rounded">{new Date(q.created_date).toLocaleString('tr-TR')}</span>
                        <span className="text-[10px] text-blue-400 font-bold">• {q.marketplace_accounts?.store_name}</span>
                      </div>
                    </div>
                    {getStatusBadge(q.status)}
                  </div>

                  {/* Question Bubble */}
                  <div className="relative bg-[#1E293B] p-4 rounded-2xl rounded-tl-none border border-gray-700/50 mt-2">
                    <p className="text-gray-200 text-sm leading-relaxed">"{q.text}"</p>
                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-wider text-right flex items-center justify-end gap-1">
                      <UserIcon name={q.customer_name} /> {q.customer_name}
                    </p>
                  </div>

                  {/* Action Area */}
                  {(q.status === 'Cevap Bekliyor' || q.status === 'WAITING_FOR_ANSWER') ? (
                    <div className="mt-4 pl-4 border-l-2 border-gray-800">
                      {answeringId === q.id ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <textarea
                            value={answerText}
                            onChange={e => setAnswerText(e.target.value)}
                            placeholder="Müşteriye cevabınız..."
                            className="w-full bg-[#020617] border border-blue-500/50 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={() => setAnsweringId(null)} className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition">İptal</button>
                            <button onClick={() => handleSendAnswer(q)} disabled={sending} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition">
                              {sending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />} Gönder
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setAnsweringId(q.id); setAnswerText(""); }} className="text-blue-400 text-xs font-bold hover:text-white transition flex items-center gap-1 group/btn">
                          <MessageCircle size={14} className="group-hover/btn:scale-110 transition" /> Cevapla
                        </button>
                      )}
                    </div>
                  ) : (
                    q.answer_text && (
                      <div className="mt-3 ml-8 relative bg-blue-600/10 p-4 rounded-2xl rounded-tr-none border border-blue-500/20">
                        <p className="text-blue-200 text-sm italic">{q.answer_text}</p>
                        <p className="text-[10px] text-blue-400/60 mt-2 text-right">Mağaza Yetkilisi • {q.answer_date ? new Date(q.answer_date).toLocaleDateString() : 'Tarih Yok'}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center">
                <MessageCircle size={32} className="opacity-30" />
              </div>
              <p>Bu kategoride görüntülenecek soru yok.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserIcon({ name }: { name: string }) {
  // Simple safety check for name
  const initial = name && name.length > 0 ? name.charAt(0) : '?';
  return <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[8px] text-white font-bold">{initial}</div>
}
