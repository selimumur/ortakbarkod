"use client";
import { useState, useEffect, useCallback } from 'react';
import { X, Scissors, Hammer, Package, Info, CheckCircle2, Ruler, Save, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductLabel } from './ProductLabel';
import { getJobDetailsAction, completeJobAction } from '@/app/actions/productionActions';

// TABS
const TABS = [
    { id: 'genel', label: 'Genel Bakış', icon: Info },
    { id: 'kesim', label: 'Kesim Listesi', icon: Scissors },
    { id: 'hirdavat', label: 'Hırdavat / Aksesuar', icon: Hammer },
    { id: 'paket', label: 'Paketleme & Bitir', icon: Package },
];

export default function JobDetailModal({ order, onClose }: { order: any, onClose: (isFinished?: boolean) => void }) {
    const [activeTab, setActiveTab] = useState('paket');
    const [cuts, setCuts] = useState<any[]>([]);
    const [components, setComponents] = useState<any[]>([]);
    const [productDetails, setProductDetails] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(false);

    // PACKING STATE
    const [personnel, setPersonnel] = useState<any[]>([]);
    const [packingStaff, setPackingStaff] = useState<string[]>([]);
    const [boxCount, setBoxCount] = useState(1);
    const [producedNow, setProducedNow] = useState<number>(0);
    const remainingQty = (order.quantity || 1) - (order.completed_quantity || 0);

    const fetchDetails = useCallback(async () => {
        setProducedNow(remainingQty > 0 ? remainingQty : 0);
        setLoadingData(true);
        try {
            const data = await getJobDetailsAction(order.id);
            if (data) {
                setCuts(data.cuts);
                setProductDetails(data.productDetails);
                setComponents(data.components);
                setPersonnel(data.personnel);
            }
        } catch (error) {
            console.error(error);
            toast.error("Veriler yüklenemedi");
        } finally {
            setLoadingData(false);
        }
    }, [order, remainingQty]);


    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    // -- ACTION HANDLERS --

    const handlePrint = () => {
        const qrUrl = `https://ortakbarkod.com/izle/${order.id}`;

        const labelHtml = renderToStaticMarkup(
            <ProductLabel
                productName={order.master_products?.name || "Ürün"}
                productCode={order.master_products?.code || "-"}
                packageCount={1}
                totalPackages={boxCount}
                dimensions={productDetails || {}}
                qrData={qrUrl}
                date={new Date().toLocaleDateString('tr-TR')}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Etiket Yazdır</title>
                    <style>
                        @page { size: 100mm 100mm; margin: 0; }
                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                    </style>
                </head>
                <body>
                    ${labelHtml}
                    <script>
                        window.onload = () => {
                            window.print();
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const handleFinish = async () => {
        if (producedNow <= 0) return toast.error("Miktar giriniz");

        const tId = toast.loading("Kaydediliyor...");
        try {
            const result = await completeJobAction({
                orderId: order.id,
                producedNow,
                boxCount,
                packingStaff
            });

            toast.success(result.isFinished ? "İş Emri Tamamlandı!" : "Kısmi Üretim Kaydedildi", { id: tId });
            onClose(result.isFinished);

        } catch (e: any) {
            console.error("Finish Error:", e);
            toast.error("Hata: " + e.message, { id: tId });
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
            {/* HEADER */}
            <div className="bg-[#111827] p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => onClose()} className="bg-gray-800 p-2 rounded-lg text-gray-400 hover:text-white"><X /></button>
                    <div>
                        <h2 className="text-white font-bold text-xl">{order.master_products?.name}</h2>
                        <span className="text-gray-500 text-sm font-mono">{order.master_products?.code}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-blue-500">{order.completed_quantity || 0} / {order.quantity}</div>
                    <div className="text-xs text-gray-400 uppercase">Tamamlanan</div>
                </div>
            </div>

            {/* TABS HEADER */}
            <div className="flex bg-[#0B1120] border-b border-gray-800 overflow-x-auto">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[120px] py-4 flex flex-col items-center gap-2 border-b-4 transition ${activeTab === tab.id ? 'border-blue-500 bg-blue-900/10 text-blue-400' : 'border-transparent text-gray-500 hover:bg-gray-900'}`}>
                        <tab.icon size={24} />
                        <span className="text-xs font-bold uppercase">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0B1120]">
                {loadingData ? <div className="text-center py-20 text-gray-500">Veriler Yükleniyor...</div> : (
                    <div className="max-w-4xl mx-auto">

                        {/* TAB: GENEL */}
                        {activeTab === 'genel' && (
                            <div className="space-y-6">
                                <div className="bg-[#1F2937] p-6 rounded-2xl border border-gray-700">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Info className="text-blue-500" /> İş Emri Detayları</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-gray-800 p-3 rounded-lg">
                                            <span className="text-gray-500 block text-xs">Sipariş ID</span>
                                            <span className="text-white font-mono">#{order.id}</span>
                                        </div>
                                        <div className="bg-gray-800 p-3 rounded-lg">
                                            <span className="text-gray-500 block text-xs">Oluşturulma</span>
                                            <span className="text-white">{new Date(order.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="col-span-2 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg">
                                            <span className="text-yellow-500 block text-xs font-bold mb-1">NOTLAR</span>
                                            <p className="text-yellow-200">{order.notes || "Not yok."}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: KESİM */}
                        {activeTab === 'kesim' && (
                            <div className="bg-[#1F2937] rounded-2xl border border-gray-700 overflow-hidden">
                                <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                                    <h3 className="text-white font-bold flex items-center gap-2"><Scissors className="text-orange-500" /> Kesim Listesi</h3>
                                    <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs">{cuts.length} Parça</span>
                                </div>
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-gray-900 text-gray-500 text-xs uppercase">
                                        <tr><th className="p-4">Parça Adı</th><th className="p-4">Ebat (mm)</th><th className="p-4 text-center">Adet</th><th className="p-4">Bant</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {cuts.map((cut, i) => (
                                            <tr key={i} className="hover:bg-gray-800/30">
                                                <td className="p-4 font-bold text-white">{cut.description || "Parça"}</td>
                                                <td className="p-4 font-mono text-blue-300">{cut.height} x {cut.width}</td>
                                                <td className="p-4 text-center font-bold text-lg bg-gray-800/50">{Math.ceil(cut.quantity * (order.quantity || 1))}</td>
                                                <td className="p-4 text-xs text-gray-500">
                                                    {cut.band_long > 0 && `Uzun: ${cut.band_long} `}
                                                    {cut.band_short > 0 && `Kısa: ${cut.band_short}`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {cuts.length === 0 && <div className="p-10 text-center text-gray-500">Kesim listesi bulunamadı.</div>}
                            </div>
                        )}

                        {/* TAB: HIRDAVAT */}
                        {activeTab === 'hirdavat' && (
                            <div className="bg-[#1F2937] rounded-2xl border border-gray-700 overflow-hidden">
                                <div className="p-4 bg-gray-800/50 border-b border-gray-700">
                                    <h3 className="text-white font-bold flex items-center gap-2"><Hammer className="text-purple-500" /> Aksesuar / Hırdavat</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                    {components.map((comp, i) => (
                                        <div key={i} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center border border-gray-700">
                                            <div>
                                                <span className="text-white font-bold block">{comp.materials?.name}</span>
                                                <span className="text-gray-500 text-xs">Birim: {comp.materials?.unit}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-2xl font-bold text-purple-400">{comp.quantity * (order.quantity || 1)}</span>
                                                <small className="text-gray-500 text-[10px]">TOPLAM GEREKEN</small>
                                            </div>
                                        </div>
                                    ))}
                                    {components.length === 0 && <div className="col-span-2 text-center py-10 text-gray-500">Hırdavat kaydı yok.</div>}
                                </div>
                            </div>
                        )}

                        {/* TAB: PAKETLEME */}
                        {activeTab === 'paket' && (
                            <div className="space-y-6">
                                <div className="bg-[#1F2937] p-6 rounded-2xl border border-gray-700">
                                    <h3 className="text-white font-bold mb-6 flex items-center gap-2"><CheckCircle2 className="text-green-500" /> Üretimi Tamamla</h3>

                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-gray-400 text-xs font-bold uppercase">Üretilen Miktar</label>
                                            <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-xl p-4 text-2xl font-bold text-white text-center focus:border-green-500 outline-none"
                                                value={producedNow} onChange={e => setProducedNow(Number(e.target.value))} />
                                            <div className="text-center text-xs text-gray-500">Kalan: {remainingQty}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-400 text-xs font-bold uppercase">Etiket Adedi</label>
                                            <input type="number" className="w-full bg-[#111827] border border-gray-600 rounded-xl p-4 text-2xl font-bold text-white text-center focus:border-blue-500 outline-none"
                                                value={boxCount} onChange={e => setBoxCount(Number(e.target.value))} />
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Paketleyen Personel</label>
                                        <div className="flex flex-wrap gap-2">
                                            {personnel.map(p => (
                                                <button key={p.id} onClick={() => {
                                                    setPackingStaff(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name])
                                                }} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${packingStaff.includes(p.name) ? 'bg-green-600 text-white border-green-500' : 'bg-[#111827] border-gray-600 text-gray-400'}`}>
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button onClick={handlePrint} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2">
                                            <Printer size={20} /> Sadece Yazdır
                                        </button>
                                        <button onClick={handleFinish} className="flex-[2] bg-green-600 hover:bg-green-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20">
                                            <Save size={20} /> KAYDET ve BİTİR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}
