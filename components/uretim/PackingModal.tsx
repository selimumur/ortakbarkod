"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // En güvenli client
import { X, Printer, Save, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function PackingModal({ order, onClose }: { order: any, onClose: (isFinished?: boolean) => void }) {
    // Supabase Client Oluştur
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [personnel, setPersonnel] = useState<any[]>([]);
    const [packingStaff, setPackingStaff] = useState<string[]>([]);
    const [accessoryStaff, setAccessoryStaff] = useState("");
    
    // Miktar Hesapları
    const completedSoFar = order.completed_quantity || 0;
    const targetQty = order.quantity || 1;
    const remainingQty = targetQty - completedSoFar;

    const [producedNow, setProducedNow] = useState(remainingQty > 0 ? remainingQty : 0); 
    const [boxCount, setBoxCount] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function getStaff() {
            const { data } = await supabase.from('personnel').select('*');
            if (data) setPersonnel(data);
        }
        getStaff();
    }, []);

    const togglePacker = (name: string) => {
        if (packingStaff.includes(name)) setPackingStaff(packingStaff.filter(p => p !== name));
        else setPackingStaff([...packingStaff, name]);
    };

    const handlePrintOnly = () => {
        if (packingStaff.length === 0) return toast.error("Personel seçiniz.");
        const printWindow = window.open('', '_blank');
        if(printWindow) {
            printWindow.document.write(`
                <html>
                <head><title>Etiket</title></head>
                <body style="font-family: sans-serif; text-align:center;">
                    <h2>${order.master_products?.name}</h2>
                    <p>${order.master_products?.code}</p>
                    <hr/>
                    <h3>PAKET 1 / ${boxCount}</h3>
                    <p>Paketleyen: ${packingStaff.join(", ")}</p>
                    <small>${new Date().toLocaleString('tr-TR')}</small>
                    <script>window.print();</script>
                </body>
                </html>
            `);
        }
    };

    const handleSave = async () => {
        if (packingStaff.length === 0) return toast.error("Personel seçiniz.");
        if (producedNow <= 0) return toast.error("Miktar 0 olamaz.");
        if (producedNow > remainingQty) return toast.error(`Hata: Kalan miktardan (${remainingQty}) fazla üretemezsiniz.`);

        setLoading(true);

        try {
            // 1. LOG KAYDI
            await supabase.from('production_logs').insert([{
                work_order_id: order.id,
                product_name: order.master_products?.name,
                box_count: boxCount,
                packing_staff: packingStaff.join(", "),
                accessory_staff: accessoryStaff,
                qr_data: `Miktar: ${producedNow}`
            }]);

            // 2. STATÜ HESAPLAMA (Kritik Nokta)
            const newTotal = completedSoFar + producedNow;
            const isFinished = newTotal >= targetQty;
            const newStatus = isFinished ? 'Tamamlandı' : 'Kısmi Üretim'; // Bitiyorsa 'Tamamlandı' yap

            // 3. İŞ EMRİNİ GÜNCELLE
            const { error } = await supabase.from('work_orders').update({ 
                completed_quantity: newTotal,
                status: newStatus, // Statüyü güncelle
                completed_at: isFinished ? new Date().toISOString() : null
            }).eq('id', order.id);

            if (error) throw error;

            // 4. STOK GÜNCELLE
            const { data: prod } = await supabase.from('master_products').select('stock').eq('id', order.product_id).single();
            if (prod) {
                await supabase.from('master_products').update({ stock: (prod.stock || 0) + producedNow }).eq('id', order.product_id);
            }

            toast.success(isFinished ? "İş Bitti, Listeden Kaldırılıyor..." : "Kısmi Kayıt Yapıldı.");
            
            // Eğer bittiyse TRUE, bitmediyse FALSE gönder
            onClose(isFinished); 

        } catch (e: any) {
            toast.error("Hata: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1F2937] w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl p-6 relative animate-in zoom-in-95">
                <button onClick={() => onClose(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X/></button>
                
                <h3 className="text-white font-bold text-lg mb-4 border-b border-gray-700 pb-2">Paketleme Onayı</h3>
                
                <div className="space-y-4">
                    <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30 flex justify-between">
                        <div>
                            <span className="text-blue-200 text-sm font-bold block">{order?.master_products?.name}</span>
                            <span className="text-blue-400 text-xs">{order?.master_products?.code}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-white font-bold text-xl">{remainingQty}</span>
                            <span className="text-gray-400 text-[10px] block uppercase">Kalan</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-xs block mb-1 font-bold">Şimdi Üretilen</label>
                            <input type="number" value={producedNow} max={remainingQty} onChange={e => setProducedNow(Number(e.target.value))} className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white font-bold text-center focus:border-green-500 outline-none"/>
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs block mb-1 font-bold">Etiket Sayısı</label>
                            <input type="number" value={boxCount} onChange={e => setBoxCount(Number(e.target.value))} className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white font-bold text-center focus:border-orange-500 outline-none"/>
                        </div>
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs block mb-1 font-bold">Aksesuarcı</label>
                        <select className="w-full bg-[#111827] border border-gray-600 rounded p-2 text-white text-sm outline-none" onChange={e=>setAccessoryStaff(e.target.value)}>
                            <option value="">Seçiniz...</option>
                            {personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs block mb-1 font-bold">Paketleyenler</label>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar border border-gray-700 p-2 rounded bg-[#111827]">
                            {personnel.map(p => (
                                <button key={p.id} onClick={() => togglePacker(p.name)} className={`px-2 py-1 rounded text-xs border transition ${packingStaff.includes(p.name) ? 'bg-green-600 text-white border-green-500' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}>{p.name}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button onClick={handlePrintOnly} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-600"><Printer size={16}/> YAZDIR</button>
                    <button onClick={handleSave} disabled={loading} className="flex-[1.5] bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition">{loading ? '...' : <><Save size={16}/> KAYDET & BİTİR</>}</button>
                </div>
            </div>
        </div>
    );
}