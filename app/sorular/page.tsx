"use client";

import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Send } from 'lucide-react';
import { supabase } from '../supabase';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Cevap Bekliyor");

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    const { data } = await supabase.from('questions').select('*').order('created_date', { ascending: false });
    if (data) setQuestions(data);
  }

  async function syncQuestions() {
    setLoading(true);
    try {
      const response = await fetch('/api/trendyol/questions');
      const result = await response.json();
      if (result.success) {
        await supabase.from('questions').upsert(result.questions);
        alert(`${result.questions.length} soru güncellendi!`);
        fetchQuestions();
      } else {
        alert("Hata: " + (result.details || result.error));
      }
    } catch (error) {
      alert("Bağlantı Hatası");
    } finally {
      setLoading(false);
    }
  }

  const filteredList = questions.filter(q => {
    if (activeTab === "Cevap Bekliyor") return q.status === "Cevap Bekliyor";
    if (activeTab === "Geçmiş") return q.status !== "Cevap Bekliyor";
    return true;
  });

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full">
        {/* BAŞLIK */}
        <header className="px-8 py-6 flex justify-between items-center border-b border-gray-800/50 bg-[#0B1120]">
          <div>
            <h2 className="text-2xl font-bold text-white">Müşteri Soruları</h2>
            <p className="text-gray-500 text-sm mt-1">Müşterilerden gelen talepleri yönetin</p>
          </div>
          <button onClick={syncQuestions} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shadow-lg">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Soruları Çek" : "Yenile"}
          </button>
        </header>

        <div className="p-8">
          {/* SEKMELER */}
          <div className="flex gap-4 mb-6 border-b border-gray-800 pb-1">
             <button onClick={() => setActiveTab("Cevap Bekliyor")} className={`pb-3 px-2 text-sm font-medium transition ${activeTab === "Cevap Bekliyor" ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-400 hover:text-white"}`}>
                Cevap Bekleyenler <span className="ml-2 bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full text-xs">{questions.filter(q=>q.status==='Cevap Bekliyor').length}</span>
             </button>
             <button onClick={() => setActiveTab("Geçmiş")} className={`pb-3 px-2 text-sm font-medium transition ${activeTab === "Geçmiş" ? "text-green-500 border-b-2 border-green-500" : "text-gray-400 hover:text-white"}`}>
                Geçmiş Kayıtlar
             </button>
          </div>

          <div className="space-y-4">
             {filteredList.map((q) => (
                <div key={q.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
                   <div className="flex items-start gap-4">
                      {/* Ürün Resmi */}
                      <img src={q.product_image} className="w-16 h-16 rounded-lg object-cover bg-white border border-gray-700" />
                      
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div>
                               <h3 className="text-white font-medium text-sm">{q.product_name}</h3>
                               <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12}/> {new Date(q.created_date).toLocaleString('tr-TR')}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded border font-bold uppercase ${q.status === 'Cevap Bekliyor' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>{q.status}</span>
                         </div>

                         {/* SORU BALONU */}
                         <div className="mt-4 bg-[#1F2937] p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-gray-700 relative ml-2">
                            <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-[#1F2937] border-l-[10px] border-l-transparent"></div>
                            <p className="text-gray-300 text-sm">"{q.text}"</p>
                            <p className="text-[10px] text-gray-500 mt-2 text-right">- {q.customer_name}</p>
                         </div>

                         {/* CEVAP ALANI */}
                         {q.status === 'Cevap Bekliyor' ? (
                            <div className="mt-4 flex gap-2">
                               <input type="text" placeholder="Cevabınızı buraya yazın..." className="flex-1 bg-[#0B1120] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                               <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                                  <Send size={16}/> Gönder
                               </button>
                            </div>
                         ) : (
                            <div className="mt-4 ml-8 bg-blue-900/20 p-3 rounded-tl-xl rounded-bl-xl rounded-br-xl border border-blue-900/30 text-right">
                               <p className="text-blue-200 text-sm">{q.answer}</p>
                               <p className="text-[10px] text-blue-400 mt-1">Mağaza Cevabı</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             ))}

             {filteredList.length === 0 && <div className="text-center py-16 text-gray-500">Bu kategoride mesaj yok.</div>}
          </div>
        </div>
      </main>
    </div>
  );
}