"use client";

import { useState, useEffect } from 'react';
import { Zap, TrendingDown, TrendingUp, Trophy, AlertTriangle, Search, RefreshCw, ArrowRight, Calculator, Wand2, DollarSign, Percent, Package, CheckCircle, Copy, Bot, Activity, LineChart, History, AlertCircle, Loader2, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import Link from 'next/link';

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("Fiyat Robotu"); 
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // KAMPANYA SİMÜLATÖRÜ STATE
  const [simSelected, setSimSelected] = useState<any>(null);
  const [simPrice, setSimPrice] = useState(0);
  const [simCommissionRate, setSimCommissionRate] = useState(21);

  // AI STATE
  const [aiResult, setAiResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // ROBOT STATE
  const [robotLogs, setRobotLogs] = useState<string[]>([
    "10:42 - G3008 için rakip fiyat analizi başlatıldı.",
    "10:45 - TV Ünitesi Buybox korundu (1. Sıra).",
  ]);

  useEffect(() => {
    fetchMarketData();
    
    // Robotun çalıştığını gösteren simülasyon
    const interval = setInterval(() => {
       if (products.length > 0) {
           const randomProduct = products[Math.floor(Math.random() * products.length)];
           const action = Math.random() > 0.5 ? "Fiyat kontrol edildi." : "Buybox durumu sabit.";
           const newLog = `${new Date().toLocaleTimeString().slice(0,5)} - ${randomProduct.code}: ${action}`;
           setRobotLogs(prev => [newLog, ...prev.slice(0, 4)]);
       }
    }, 8000);
    return () => clearInterval(interval);
  }, [products.length]);

  async function fetchMarketData() {
    setLoading(true);
    // Master Products (Ana Stok Kartları) çekiliyor
    const { data } = await supabase.from('master_products').select('*').order('name');
    
    if (data) {
        // Veritabanından gelen ham veriyi, pazarlama verileriyle zenginleştiriyoruz
        const enrichedData = data.map(p => {
            const cost = p.total_cost || 100; // Maliyet yoksa 100 varsay
            return {
                ...p,
                total_cost: cost,
                // Simüle edilmiş Pazar Verileri (Gerçek API entegrasyonu yapılana kadar)
                currentPrice: cost * 1.5, 
                buyboxPrice: cost * 1.4,
                buyboxRank: Math.floor(Math.random() * 5) + 1, // 1-5 arası rastgele sıra
                salesVelocity: Math.floor(Math.random() * 10) + 1, // Günlük satış hızı
                robotStatus: Math.random() > 0.5, // Robot açık mı?
                minPrice: cost * 1.15 // Min satış fiyatı (Maliyet + %15)
            };
        });
        setProducts(enrichedData);
    }
    setLoading(false);
  }

  // --- HESAPLAMA MOTORU ---
  const calculateProfit = () => {
      if (!simSelected) return { netProfit: 0, margin: 0, isProfitable: false, totalCost: 0, commissionAmount: 0, cargo: 0 };
      
      const cost = simSelected.total_cost || 0;
      // Kargo maliyeti (Desiye göre veya sabit 50 TL)
      const cargo = Math.max(simSelected.total_desi || 0, simSelected.weight_kg || 0) * 15 || 50; 
      
      const commissionAmount = simPrice * (simCommissionRate / 100);
      const totalDeductions = cost + cargo + commissionAmount;
      
      const netProfit = simPrice - totalDeductions;
      const margin = simPrice > 0 ? (netProfit / simPrice) * 100 : 0;

      return { netProfit, margin, isProfitable: netProfit > 0, totalCost: cost, commissionAmount, cargo };
  };
  const result = calculateProfit();

  // --- AI İÇERİK OLUŞTURUCU ---
  const generateContent = () => {
      if (!simSelected) return toast.error("Ürün seçin");
      setIsGenerating(true);
      setTimeout(() => {
          const text = `✨ ${simSelected.name} ✨\n\n` +
          `Evinizin havasını değiştirecek ${simSelected.category || 'özel'} tasarımımızla tanışın.\n\n` +
          `✅ Kalite: Birinci sınıf malzeme ve işçilik.\n` +
          `✅ Tasarım: Modern ve şık çizgiler.\n` +
          `✅ Kurulum: Kolay kurulum şeması ile pratik montaj.\n\n` +
          `📏 Ürün Ölçüleri ve Detaylar:\n` +
          `Lütfen ürün görsellerindeki teknik çizimi inceleyiniz.\n\n` +
          `📦 Kargo ve Teslimat:\n` +
          `Ürünlerimiz özenle paketlenir ve sigortalı olarak gönderilir.\n\n` +
          `#${simSelected.code} #Mobilya #Dekorasyon #Trendyol #İndirim`;
          
          setAiResult(text);
          setIsGenerating(false);
          toast.success("İçerik oluşturuldu!");
      }, 1500);
  };

  return (
    <div className="w-full h-full bg-[#0B1120]">
      <main className="flex-1 overflow-y-auto h-full">
        <header className="px-8 py-6 border-b border-gray-800/50 bg-[#0B1120] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="text-yellow-500"/> Pazarlama & Growth</h2>
            <p className="text-gray-500 text-sm mt-1">Satış artırıcı araçlar ve rakip analizi</p>
          </div>
          <div className="flex gap-3 items-center">
             <div className="bg-[#1F2937] px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-2 hidden md:flex">
                <Activity size={16} className="text-green-500 animate-pulse"/>
                <span className="text-xs text-gray-400">Mağaza Sağlığı:</span>
                <span className="text-white font-bold">9.8/10</span>
             </div>
             <button onClick={fetchMarketData} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition"><RefreshCw size={18} className={loading ? "animate-spin":""}/></button>
          </div>
        </header>

        <div className="p-8">
           {/* SEKMELER */}
           <div className="flex gap-2 mb-8 bg-[#111827] p-1 rounded-xl w-fit border border-gray-800 overflow-x-auto">
             {["Fiyat Robotu", "Stok Tahmini", "Kampanya Simülatörü", "AI İçerik"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 text-sm font-bold rounded-lg transition whitespace-nowrap ${activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                   {tab}
                </button>
             ))}
           </div>

           {loading ? (
               <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                   <Loader2 size={48} className="animate-spin mb-4 text-blue-500"/>
                   <p>Piyasa verileri analiz ediliyor...</p>
               </div>
           ) : (
             <>
               {/* --- TAB 1: FİYAT ROBOTU --- */}
               {activeTab === "Fiyat Robotu" && (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                    {/* SOL: ÜRÜN LİSTESİ */}
                    <div className="lg:col-span-8">
                        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                           <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                              <h3 className="text-white font-bold flex items-center gap-2"><Bot size={18} className="text-blue-400"/> Oto-Pilot Ayarları</h3>
                              <span className="text-xs text-gray-500">{products.filter(p=>p.robotStatus).length} Ürün Takipte</span>
                           </div>
                           
                           {products.length > 0 ? (
                               <div className="overflow-x-auto">
                               <table className="w-full text-left text-sm text-gray-400">
                                  <thead className="bg-[#0f1623] text-gray-300 font-bold uppercase text-[10px]">
                                     <tr>
                                        <th className="px-6 py-3">Ürün</th>
                                        <th className="px-6 py-3">Maliyet</th>
                                        <th className="px-6 py-3">Min. Fiyat</th>
                                        <th className="px-6 py-3">Piyasa</th>
                                        <th className="px-6 py-3">Sıralama</th>
                                        <th className="px-6 py-3 text-right">Robot</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-800/50">
                                     {products.map((p) => (
                                        <tr key={p.id} className="hover:bg-[#1F2937]/50 transition group">
                                           <td className="px-6 py-4">
                                              <div className="font-medium text-white text-sm truncate w-40" title={p.name}>{p.name}</div>
                                              <div className="text-[10px] text-blue-400 font-mono">{p.code}</div>
                                           </td>
                                           <td className="px-6 py-4 font-mono text-xs">₺{p.total_cost?.toFixed(0)}</td>
                                           <td className="px-6 py-4">
                                              <input type="number" className="w-16 bg-[#0f1623] border border-gray-700 rounded text-center text-xs text-white py-1 focus:border-blue-500 outline-none" defaultValue={p.minPrice.toFixed(0)} />
                                           </td>
                                           <td className="px-6 py-4 text-green-400 font-bold">₺{p.buyboxPrice.toFixed(0)}</td>
                                           <td className="px-6 py-4">
                                               {p.buyboxRank === 1 ? 
                                                  <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 flex items-center gap-1 w-fit"><Trophy size={10}/> LİDER</span> : 
                                                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1 w-fit"><TrendingDown size={10}/> {p.buyboxRank}. Sıra</span>
                                               }
                                           </td>
                                           <td className="px-6 py-4 text-right">
                                              <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors mx-auto ${p.robotStatus ? 'bg-green-600' : 'bg-gray-700'}`}>
                                                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${p.robotStatus ? 'left-6' : 'left-1'}`}></div>
                                              </div>
                                           </td>
                                        </tr>
                                     ))}
                                  </tbody>
                               </table>
                               </div>
                           ) : (
                               <div className="p-12 text-center flex flex-col items-center">
                                   <AlertTriangle size={48} className="text-yellow-500 mb-4 opacity-50"/>
                                   <h3 className="text-white font-bold">Analiz Edilecek Ürün Yok</h3>
                                   <p className="text-gray-500 text-sm mb-4">Pazarlama araçlarını kullanmak için önce Stok Kartı oluşturmalısınız.</p>
                                   <Link href="/uretim/stok-kartlari" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                       <Plus size={16}/> Stok Kartı Oluştur
                                   </Link>
                               </div>
                           )}
                        </div>
                    </div>

                    {/* SAĞ: CANLI LOGLAR */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-[#111827] p-6 rounded-xl border border-gray-800 h-full">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><History size={18} className="text-purple-500"/> Canlı İşlem Günlüğü</h3>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {robotLogs.length > 0 ? robotLogs.map((log, i) => (
                                    <div key={i} className="flex gap-3 text-xs border-l-2 border-gray-700 pl-3 pb-1 animate-in slide-in-from-right-2">
                                        <span className="text-gray-500 whitespace-nowrap font-mono">{log.split(' - ')[0]}</span>
                                        <span className="text-gray-300">{log.split(' - ')[1]}</span>
                                    </div>
                                )) : <p className="text-gray-600 text-xs">Henüz işlem yok.</p>}
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                                <span className="text-green-500 text-xs flex items-center justify-center gap-1 animate-pulse"><Activity size={12}/> Sistem Aktif ve İzliyor</span>
                            </div>
                        </div>
                    </div>
                 </div>
               )}

               {/* --- TAB 2: STOK TAHMİNİ --- */}
               {activeTab === "Stok Tahmini" && (
                  <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 animate-in fade-in">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="text-white font-bold flex items-center gap-2"><LineChart size={20} className="text-blue-500"/> Stok Ömrü ve Ciro Tahmini</h3>
                         <p className="text-xs text-gray-500">Satış hızına göre tahmini tükenme süresi</p>
                      </div>
                      {products.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {products.map((p, i) => {
                                  const daysLeft = p.salesVelocity > 0 ? Math.floor((p.stock || 0) / p.salesVelocity) : 999;
                                  const potentialLoss = p.salesVelocity * 30 * p.currentPrice; // Aylık potansiyel
                                  return (
                                      <div key={i} className="bg-[#0f1623] border border-gray-800 p-4 rounded-xl relative overflow-hidden group hover:border-gray-600 transition">
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="text-sm font-bold text-white truncate w-48" title={p.name}>{p.name}</div>
                                              <span className={`text-[10px] px-2 py-1 rounded font-bold ${daysLeft < 7 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                  {daysLeft > 365 ? '> 1 Yıl' : `${daysLeft} Gün Kaldı`}
                                              </span>
                                          </div>
                                          <div className="flex justify-between text-xs text-gray-400 mt-2">
                                              <span>Stok: {p.stock || 0}</span>
                                              <span>Hız: {p.salesVelocity} adet/gün</span>
                                          </div>
                                          <div className="mt-3 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                              <div className={`h-full ${daysLeft < 7 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${Math.min(daysLeft*2, 100)}%`}}></div>
                                          </div>
                                          {daysLeft < 7 && (
                                              <div className="mt-3 flex items-center gap-2 text-[10px] text-orange-400 bg-orange-500/10 p-2 rounded border border-orange-500/20">
                                                  <AlertTriangle size={12}/> Stok biterse aylık <b>₺{potentialLoss.toLocaleString()}</b> ciro riski.
                                              </div>
                                          )}
                                      </div>
                                  )
                              })}
                          </div>
                      ) : (
                          <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                             <Package size={48} className="opacity-20 mb-4"/>
                             <p>Analiz için stok kartı verisi bekleniyor.</p>
                          </div>
                      )}
                  </div>
               )}

               {/* --- TAB 3: KAMPANYA SİMÜLATÖRÜ --- */}
               {activeTab === "Kampanya Simülatörü" && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    <div className="bg-[#111827] p-6 rounded-xl border border-gray-800 h-fit">
                       <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Calculator size={20} className="text-green-500"/> Kâr Hesaplama Motoru</h3>
                       <div className="space-y-5">
                          <div>
                             <label className="text-xs text-gray-500 block mb-2 uppercase font-bold">1. Ürün Seçimi</label>
                             <select className="w-full bg-[#0f1623] border border-gray-700 rounded-lg p-3 text-white text-sm outline-none" 
                                 onChange={e => {
                                     const p = products.find(x => x.id == e.target.value);
                                     setSimSelected(p);
                                     setSimPrice(p ? (p.total_cost * 1.5) : 0);
                                 }}
                             >
                                 <option value="">Analiz edilecek ürünü seçin...</option>
                                 {products.map(p => <option key={p.id} value={p.id}>{p.name} (Maliyet: ₺{p.total_cost?.toFixed(0)})</option>)}
                             </select>
                          </div>
                          {simSelected && (
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-xs text-gray-500 block mb-2 uppercase font-bold">Satış Fiyatı (TL)</label><input type="number" className="w-full bg-[#0f1623] border border-gray-700 rounded p-3 text-white font-bold outline-none" value={simPrice} onChange={e => setSimPrice(Number(e.target.value))} /></div>
                                  <div><label className="text-xs text-gray-500 block mb-2 uppercase font-bold">Komisyon (%)</label><input type="number" className="w-full bg-[#0f1623] border border-gray-700 rounded p-3 text-white font-bold outline-none" value={simCommissionRate} onChange={e => setSimCommissionRate(Number(e.target.value))} /></div>
                              </div>
                          )}
                       </div>
                    </div>
                    {simSelected ? (
                    <div className="bg-[#111827] p-6 rounded-xl border border-gray-800 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-2 ${result.isProfitable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            {result.isProfitable ? <CheckCircle className="text-green-500"/> : <AlertTriangle className="text-red-500"/>} Analiz Sonucu
                        </h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                                <span className="text-gray-400">Satış Fiyatı</span>
                                <span className="text-white font-bold">₺{simPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-400"><span>- Üretim Maliyeti</span><span>₺{result.totalCost.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm text-red-400"><span>- Komisyon (%{simCommissionRate})</span><span>₺{result.commissionAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm text-red-400 border-b border-gray-800 pb-2"><span>- Kargo</span><span>₺{result.cargo.toFixed(2)}</span></div>
                        </div>
                        <div className="bg-[#0f1623] p-4 rounded-xl text-center border border-gray-700">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">CEBİNİZE KALAN NET KÂR</p>
                            <p className={`text-4xl font-black ${result.isProfitable ? 'text-green-400' : 'text-red-500'}`}>{result.isProfitable ? '+' : ''}₺{result.netProfit.toFixed(2)}</p>
                            <p className={`text-xs mt-2 font-bold ${result.isProfitable ? 'text-green-600' : 'text-red-600'}`}>(Marj: %{result.margin.toFixed(1)})</p>
                        </div>
                    </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 border-2 border-dashed border-gray-800 rounded-xl min-h-[300px]">
                             <Calculator size={48} className="opacity-20 mb-4"/>
                             <p>Ürün seçimi yapın.</p>
                        </div>
                    )}
                 </div>
               )}

               {/* --- TAB 4: AI İÇERİK --- */}
               {activeTab === "AI İçerik" && (
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                      <div className="lg:col-span-4 space-y-4">
                          <div className="bg-[#111827] p-5 rounded-xl border border-gray-800">
                              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wand2 size={18} className="text-purple-500"/> İçerik Sihirbazı</h3>
                              <div className="space-y-3">
                                  <select className="w-full bg-[#0f1623] border border-gray-700 rounded p-2 text-white text-sm outline-none" onChange={e => setSimSelected(products.find(p=>p.id==e.target.value))}>
                                      <option value="">Seçiniz...</option>
                                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                  <button onClick={generateContent} disabled={isGenerating || !simSelected} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg font-bold text-sm mt-2 flex items-center justify-center gap-2">
                                      {isGenerating ? <RefreshCw className="animate-spin"/> : <Wand2 size={16}/>} OLUŞTUR
                                  </button>
                              </div>
                          </div>
                      </div>
                      <div className="lg:col-span-8">
                          <div className="bg-[#111827] border border-gray-800 rounded-xl h-full min-h-[300px] p-6 relative">
                              {aiResult ? (
                                  <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-white font-bold">Oluşturulan İçerik</h3>
                                        <button onClick={() => {navigator.clipboard.writeText(aiResult); toast.success("Kopyalandı!")}} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded flex items-center gap-2"><Copy size={12}/> Kopyala</button>
                                    </div>
                                    <textarea className="w-full h-[250px] bg-[#0f1623] border border-gray-700 rounded-xl p-4 text-gray-300 text-sm outline-none resize-none" value={aiResult} readOnly></textarea>
                                  </>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                      <Wand2 size={48} className="opacity-20 mb-4"/>
                                      <p>Ürün seçip "Oluştur" butonuna basın.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                   </div>
               )}
             </>
           )}
        </div>
      </main>
    </div>
  );
}