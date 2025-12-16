"use client";

import { useState, useEffect } from 'react';
import {
    Bell, Volume2, Mail, MessageSquare, AlertTriangle,
    Smartphone, Zap, Save, Check, Play, Settings, ShieldAlert,
    Clock, Speaker, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { getFactorySettingsAction, saveFactorySettingsAction } from '@/app/actions/commonActions';

// TYPES
type NotificationConfig = {
    sound_enabled: boolean;
    sound_volume: number;
    sound_file: string;
    email_daily_summary: boolean;
    email_critical_alert: boolean;
    email_recipients: string;
    alert_low_stock: boolean;
    alert_low_stock_threshold: number;
    alert_new_order: boolean;
    alert_returns: boolean;
    alert_questions: boolean;
    push_browser: boolean;
    push_mobile: boolean; // Future
};

const DEFAULT_CONFIG: NotificationConfig = {
    sound_enabled: true,
    sound_volume: 80,
    sound_file: 'notification_1',
    email_daily_summary: false,
    email_critical_alert: true,
    email_recipients: '',
    alert_low_stock: true,
    alert_low_stock_threshold: 3,
    alert_new_order: true,
    alert_returns: true,
    alert_questions: true,
    push_browser: false,
    push_mobile: false
};

export default function NotificationsPage() {

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
    const [activeTab, setActiveTab] = useState<'general' | 'sound' | 'email' | 'channels'>('general');

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const data = await getFactorySettingsAction();
            if (data && data.notification_config) {
                setConfig({ ...DEFAULT_CONFIG, ...data.notification_config });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await saveFactorySettingsAction(config);
            toast.success("Bildirim ayarları güncellendi.");
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    const playNotificationSound = (type: string, volume: number) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const vol = volume / 100;

            if (type === 'notification_1') {
                // Bell / Ding
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                gain.gain.setValueAtTime(vol, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            } else if (type === 'notification_2') {
                // Modern
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(vol, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1);
            } else if (type === 'notification_3') {
                // Cha-ching (High Pitch Square)
                osc.type = 'square';
                osc.frequency.setValueAtTime(2000, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(2500, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime); // Lower volume for square
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else {
                // Alert (Sawtooth)
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(110, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.5);
                gain.gain.setValueAtTime(vol, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const testSound = () => {
        toast.info("Ses örneği çalınıyor...");
        playNotificationSound(config.sound_file, config.sound_volume);
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500"><Settings className="animate-spin mr-2" /> Ayarlar yükleniyor...</div>;

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors font-medium text-sm
            ${activeTab === id ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    const Toggle = ({ label, checked, onChange, description }: any) => (
        <div className="flex items-start justify-between p-4 bg-[#1F2937] rounded-xl border border-gray-700/50 hover:border-gray-600 transition">
            <div>
                <div className="font-bold text-white mb-1">{label}</div>
                {description && <div className="text-xs text-gray-400">{description}</div>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center ${checked ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="md:p-8 p-4 min-h-screen bg-[#0B1120] text-white">
            <header className="mb-10 max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-900/20 rounded-full border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-wider mb-4">
                    <Bell size={14} /> Bildirim Merkezi
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
                    Bildirim ve Uyarılar
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                    Operasyonel süreçlerdeki önemli olaylardan nasıl haberdar olmak istediğinizi özelleştirin.
                </p>
            </header>

            <div className="max-w-5xl mx-auto bg-[#111827] border border-gray-800 rounded-3xl shadow-xl overflow-hidden">
                {/* TABS */}
                <div className="flex border-b border-gray-800 overflow-x-auto">
                    <TabButton id="general" label="Genel Bildirimler" icon={Bell} />
                    <TabButton id="sound" label="Ses ve Uyarılar" icon={Volume2} />
                    <TabButton id="email" label="E-Posta & Rapor" icon={Mail} />
                    <TabButton id="channels" label="Kanallar & Entegrasyon" icon={Globe} />
                </div>

                <div className="p-8 min-h-[400px]">
                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2"><Zap size={20} /> Olay Tetikleyicileri</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Toggle
                                    label="Yeni Sipariş Bildirimi"
                                    description="Mağazanıza yeni bir sipariş düştüğünde uyarı alırsınız."
                                    checked={config.alert_new_order}
                                    onChange={(v: boolean) => setConfig({ ...config, alert_new_order: v })}
                                />
                                <Toggle
                                    label="İade ve İptal Uyarıları"
                                    description="Müşteri iade veya iptal talebi oluşturduğunda."
                                    checked={config.alert_returns}
                                    onChange={(v: boolean) => setConfig({ ...config, alert_returns: v })}
                                />
                                <Toggle
                                    label="Soru & Mesajlar"
                                    description="Pazaryerinden yeni bir müşteri sorusu geldiğinde."
                                    checked={config.alert_questions}
                                    onChange={(v: boolean) => setConfig({ ...config, alert_questions: v })}
                                />
                                <div className="p-4 bg-[#1F2937] rounded-xl border border-gray-700/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold text-white">Düşük Stok Uyarısı</div>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-600 text-purple-600"
                                            checked={config.alert_low_stock}
                                            onChange={(e) => setConfig({ ...config, alert_low_stock: e.target.checked })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 text-sm">Eşik Değeri:</span>
                                        <input
                                            type="number"
                                            value={config.alert_low_stock_threshold}
                                            onChange={(e) => setConfig({ ...config, alert_low_stock_threshold: parseInt(e.target.value) })}
                                            className="w-20 bg-gray-800 border border-gray-600 rounded p-1 text-center font-bold text-white"
                                        />
                                        <span className="text-gray-500 text-xs">(Bu adedin altına düşünce uyar)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SOUND TAB */}
                    {activeTab === 'sound' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2"><Volume2 size={20} /> Ses Ayarları</h3>

                            <Toggle
                                label="Sesli Bildirimleri Aç"
                                description="Panel açıkken olay anında ses çalınır."
                                checked={config.sound_enabled}
                                onChange={(v: boolean) => setConfig({ ...config, sound_enabled: v })}
                            />

                            <div className={`p-6 bg-[#1F2937] rounded-xl border border-gray-700/50 ${!config.sound_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Bildirim Sesi</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={config.sound_file}
                                            onChange={(e) => setConfig({ ...config, sound_file: e.target.value })}
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-purple-500"
                                        >
                                            <option value="notification_1">Kısa Zil (Ding)</option>
                                            <option value="notification_2">Modern Uyarı</option>
                                            <option value="notification_3">Klasik Nakit Sesi (Cha-ching)</option>
                                            <option value="alert_1">Alarm Sesi</option>
                                        </select>
                                        <button onClick={testSound} className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-white border border-gray-600">
                                            <Play size={18} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Ses Şiddeti (%{config.sound_volume})</label>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={config.sound_volume}
                                        onChange={(e) => setConfig({ ...config, sound_volume: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Sessiz</span>
                                        <span>Yüksek</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EMAIL TAB */}
                    {activeTab === 'email' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2"><Mail size={20} /> E-Posta Raporlama</h3>

                            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/50 flex gap-3 text-blue-300 text-sm mb-6">
                                <AlertTriangle size={20} className="shrink-0" />
                                <span>E-posta bildirimleri için SMTP ayarlarının sisteme tanımlı olması gerekmektedir.</span>
                            </div>

                            <Toggle
                                label="Günlük Özet Raporu"
                                description="Her sabah saat 09:00'da dünün satış ve stok özetini gönder."
                                checked={config.email_daily_summary}
                                onChange={(v: boolean) => setConfig({ ...config, email_daily_summary: v })}
                            />

                            <Toggle
                                label="Kritik Stok Uyarısı (Anlık)"
                                description="Bir ürün kritik stok seviyesinin altına düştüğünde hemen e-posta at."
                                checked={config.email_critical_alert}
                                onChange={(v: boolean) => setConfig({ ...config, email_critical_alert: v })}
                            />

                            <div className="mt-6">
                                <label className="block text-sm font-bold text-gray-400 mb-2">Alıcı E-Posta Adresleri (Virgül ile ayırın)</label>
                                <textarea
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 outline-none focus:border-purple-500 min-h-[100px]"
                                    placeholder="ornek@sirket.com, mudur@sirket.com"
                                    value={config.email_recipients}
                                    onChange={(e) => setConfig({ ...config, email_recipients: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* CHANNELS TAB */}
                    {activeTab === 'channels' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2"><Smartphone size={20} /> Diğer Kanallar</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-gray-700 bg-gray-800/50 rounded-xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-bl-lg">AKTİF</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center"><Globe size={20} /></div>
                                        <div className="font-bold">Tarayıcı Bildirimleri (Push)</div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">Tarayıcınız kapalı olsa bile sağ alt köşede bildirim gösterir.</p>
                                    <button
                                        className={`w-full py-2 rounded-lg font-bold text-sm border ${config.push_browser ? 'bg-red-500/10 text-red-400 border-red-500/50' : 'bg-blue-600 text-white border-blue-600'}`}
                                        onClick={() => setConfig({ ...config, push_browser: !config.push_browser })}
                                    >
                                        {config.push_browser ? 'Devre Dışı Bırak' : 'İzin Ver & Aktifleştir'}
                                    </button>
                                </div>

                                <div className="border border-gray-700 bg-gray-800/30 rounded-xl p-6 relative opacity-60 grayscale filter">
                                    <div className="absolute top-0 right-0 bg-gray-700 text-gray-300 text-xs font-bold px-2 py-1 rounded-bl-lg">YAKINDA</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center"><MessageSquare size={20} /></div>
                                        <div className="font-bold">WhatsApp Bildirimleri</div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">Kritik uyarıları WhatsApp üzerinden cebinize alın.</p>
                                    <button disabled className="w-full py-2 rounded-lg font-bold text-sm bg-gray-700 text-gray-400 border border-gray-600 cursor-not-allowed">
                                        Pakete Dahil Değil
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER ACTION */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end items-center gap-4">
                    <span className="text-sm text-gray-500">Son değişiklikler kaydedilmedi.</span>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all hover:scale-105"
                    >
                        {saving ? <Settings className="animate-spin" size={20} /> : <Save size={20} />}
                        Ayarları Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}
