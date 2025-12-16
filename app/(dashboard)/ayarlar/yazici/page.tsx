"use client";

import { useState, useEffect } from 'react';
import {
    Printer, Save, FileText, LayoutTemplate,
    Type, Image as ImageIcon, QrCode, Loader2,
    Check, AlertCircle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getFactorySettingsAction,
    updatePrinterConfigAction
} from '@/app/actions/settingsActions';

// TYPES
type PrinterConfig = {
    default_paper_size: '100x100' | '100x150' | 'A4' | 'A5';
    default_format: 'pdf' | 'zpl';
    show_logo: boolean;
    show_order_number: boolean;
    show_sku: boolean;
    show_barcode: boolean;
    show_recipient: boolean;
    custom_header: string;
    custom_footer: string;
    font_size: 'small' | 'medium' | 'large';
};

const DEFAULT_CONFIG: PrinterConfig = {
    default_paper_size: '100x100',
    default_format: 'pdf',
    show_logo: true,
    show_order_number: true,
    show_sku: true,
    show_barcode: true,
    show_recipient: true,
    custom_header: '',
    custom_footer: '',
    font_size: 'medium'
};

export default function PrinterSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<PrinterConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const data = await getFactorySettingsAction();
            if (data && data.printer_config) {
                setConfig({ ...DEFAULT_CONFIG, ...data.printer_config });
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Ayarlar yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await updatePrinterConfigAction(config);
            toast.success("Yazıcı ayarları kaydedildi.");
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    // PREVIEW COMPONENT
    const LabelPreview = () => {
        // Dimension calculations based on selection
        let width = '300px';
        let height = '300px';
        let aspectRatio = '1/1';

        if (config.default_paper_size === '100x150') { height = '450px'; aspectRatio = '2/3'; }
        if (config.default_paper_size === 'A4') { width = '210px'; height = '297px'; aspectRatio = '210/297'; }

        const baseFontSize = config.font_size === 'small' ? 'text-xs' : config.font_size === 'large' ? 'text-lg' : 'text-sm';

        return (
            <div className="flex flex-col items-center">
                <div className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Eye size={14} /> Canlı Önizleme ({config.default_paper_size}) &nbsp;-&nbsp; {config.default_format.toUpperCase()}
                </div>

                <div
                    className="bg-white text-black p-6 shadow-2xl relative transition-all duration-500 ease-in-out"
                    style={{ width, height, minHeight: height }}
                >
                    {/* Header */}
                    {config.custom_header && (
                        <div className="text-center font-bold border-b-2 border-black pb-2 mb-4 uppercase text-xs">
                            {config.custom_header}
                        </div>
                    )}

                    {/* Logo Area */}
                    {config.show_logo && (
                        <div className="flex justify-center mb-6">
                            <div className="border-2 border-black border-dashed p-2 rounded opacity-50">
                                <ImageIcon size={32} className="text-black" />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="space-y-4">
                        {config.show_recipient && (
                            <div className="border-l-4 border-black pl-3 py-1">
                                <div className="text-[10px] uppercase text-gray-500 font-bold">ALICI</div>
                                <div className={`font-bold ${baseFontSize}`}>
                                    AHMET YILMAZ<br />
                                    Örnek Mah. Test Cad. No:1<br />
                                    Kadıköy / İSTANBUL
                                </div>
                            </div>
                        )}

                        {config.show_order_number && (
                            <div className="flex justify-between items-center border-t border-b border-black/20 py-2">
                                <span className="font-bold text-xs">SİPARİŞ NO:</span>
                                <span className={`font-mono font-bold ${baseFontSize}`}>#TR-12345678</span>
                            </div>
                        )}

                        {config.show_sku && (
                            <div>
                                <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">ÜRÜN BİLGİSİ</div>
                                <div className={`space-y-1 ${baseFontSize}`}>
                                    <div className="flex justify-between">
                                        <span>Gaming Mouse X1</span>
                                        <span className="font-bold">x1</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 text-xs">
                                        <span>SKU: GM-X1-BLK</span>
                                        <span>Raf: A-12</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Barcode */}
                    <div className="absolute bottom-6 left-6 right-6 flex flex-col items-center gap-2">
                        {config.show_barcode && (
                            <>
                                <div className="w-full h-12 bg-black/90 flex items-center justify-center text-white text-xs tracking-[0.5em]">
                                    || ||| || |||| ||
                                </div>
                                <div className="text-xs font-mono">1234567890123</div>
                            </>
                        )}
                        {config.custom_footer && (
                            <div className="text-[10px] text-center text-gray-500 mt-2 font-medium">
                                {config.custom_footer}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        );
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Yükleniyor...</div>;

    const Toggle = ({ label, checked, onChange }: any) => (
        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <span className="text-gray-300 font-medium text-sm">{label}</span>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-orange-500' : 'bg-gray-700'}`}>
                <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${checked ? 'left-6' : 'left-1'}`} />
            </div>
        </label>
    );

    return (
        <div className="md:p-8 p-4 min-h-screen bg-[#0B1120] text-white">
            <header className="mb-8 max-w-6xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-900/20 rounded-full border border-orange-500/30 text-orange-500 text-xs font-bold uppercase tracking-wider mb-4">
                    <Printer size={14} /> Kargo & Barkod
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
                    Yazıcı Yapılandırması
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                    Kargo etiketleri ve raf barkodları için şablon tasarımını buradan özelleştirin.
                </p>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* SETTINGS PANEL (LEFT) */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Paper Settings */}
                    <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <LayoutTemplate size={20} className="text-orange-500" /> Kağıt ve Format
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Kağıt Boyutu</label>
                                <select
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                                    value={config.default_paper_size}
                                    onChange={(e: any) => setConfig({ ...config, default_paper_size: e.target.value })}
                                >
                                    <option value="100x100">100mm x 100mm (Kare Etiket)</option>
                                    <option value="100x150">100mm x 150mm (Kargo Standart)</option>
                                    <option value="A4">A4 (Lazer Yazıcı)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Çıktı Formatı</label>
                                <select
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                                    value={config.default_format}
                                    onChange={(e: any) => setConfig({ ...config, default_format: e.target.value })}
                                >
                                    <option value="pdf">PDF (Evrensel)</option>
                                    <option value="zpl">ZPL (Termal Yazıcı)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Yazı Boyutu</label>
                            <div className="flex bg-[#1F2937] p-1 rounded-xl border border-gray-700">
                                {['small', 'medium', 'large'].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setConfig({ ...config, font_size: size as any })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${config.font_size === size ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {size === 'small' ? 'Küçük' : size === 'medium' ? 'Orta' : 'Büyük'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content Options */}
                    <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <FileText size={20} className="text-orange-500" /> İçerik Tercihleri
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <Toggle label="Firma Logosu Göster" checked={config.show_logo} onChange={(v: boolean) => setConfig({ ...config, show_logo: v })} />
                            <Toggle label="Sipariş Numarası" checked={config.show_order_number} onChange={(v: boolean) => setConfig({ ...config, show_order_number: v })} />
                            <Toggle label="Ürün Listesi (SKU)" checked={config.show_sku} onChange={(v: boolean) => setConfig({ ...config, show_sku: v })} />
                            <Toggle label="Alıcı Bilgileri" checked={config.show_recipient} onChange={(v: boolean) => setConfig({ ...config, show_recipient: v })} />
                            <Toggle label="Alt Barkod" checked={config.show_barcode} onChange={(v: boolean) => setConfig({ ...config, show_barcode: v })} />
                        </div>
                    </div>

                    {/* Custom Text */}
                    <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Type size={20} className="text-orange-500" /> Özel Metinler
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Üst Başlık (Opsiyonel)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                                    placeholder="Örn: KIRILACAK EŞYA / DİKKAT"
                                    value={config.custom_header}
                                    onChange={e => setConfig({ ...config, custom_header: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Alt Bilgi Notu (Opsiyonel)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                                    placeholder="Örn: Bizi tercih ettiğiniz için teşekkürler."
                                    value={config.custom_footer}
                                    onChange={e => setConfig({ ...config, custom_footer: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-orange-900/30 flex items-center gap-3 transition-transform hover:scale-105 w-full md:w-auto justify-center"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Ayarları Kaydet
                        </button>
                    </div>

                </div>

                {/* VISUAL PREVIEW (RIGHT) */}
                <div className="lg:col-span-5">
                    <div className="sticky top-8">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-8 flex justify-center items-center min-h-[600px] backdrop-blur-sm">
                            <LabelPreview />
                        </div>
                        <div className="mt-4 flex items-start gap-3 bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                            <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-200/70 leading-relaxed">
                                Bu bir simülasyondur. Gerçek çıktı kalitesi yazıcınızın DPI ayarına ve kullandığınız kağıt kalitesine göre değişiklik gösterebilir.
                                Barkodlar ZPL modunda yazıcı tarafından native olarak oluşturulur.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
