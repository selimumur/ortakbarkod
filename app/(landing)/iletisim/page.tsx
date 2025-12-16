"use client";

import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
    const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSent(true);
        toast.success("Mesajınız iletildi.");
    };

    return (
        <div className="pt-32 pb-24">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">İletişime Geçin</h1>
                    <p className="text-gray-400 text-lg">Sorularınız, önerileriniz veya iş birliği için.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {/* INFO */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
                        <div className="bg-[#0B1120] border border-white/5 p-8 rounded-3xl hover:border-indigo-500/50 transition duration-300 group">
                            <h3 className="text-lg font-bold text-white flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:scale-110 transition"><Mail size={20} /></div>
                                E-posta
                            </h3>
                            <p className="text-gray-400 pl-12 hover:text-white transition">destek@ortakbarkod.com</p>
                        </div>
                        <div className="bg-[#0B1120] border border-white/5 p-8 rounded-3xl hover:border-purple-500/50 transition duration-300 group">
                            <h3 className="text-lg font-bold text-white flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:scale-110 transition"><Phone size={20} /></div>
                                Telefon
                            </h3>
                            <p className="text-gray-400 pl-12 hover:text-white transition">+90 850 123 45 67</p>
                        </div>
                        <div className="bg-[#0B1120] border border-white/5 p-8 rounded-3xl hover:border-green-500/50 transition duration-300 group">
                            <h3 className="text-lg font-bold text-white flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-400 group-hover:scale-110 transition"><MapPin size={20} /></div>
                                Ofis
                            </h3>
                            <p className="text-gray-400 pl-12 hover:text-white transition">Teknopark İstanbul, Pendik</p>
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="bg-[#0B1120] p-8 rounded-3xl border border-white/5 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                        {sent ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                                    <Send size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Mesajınız Alındı!</h3>
                                <p className="text-gray-400">En kısa sürede dönüş yapacağız.</p>
                                <button onClick={() => setSent(false)} className="mt-8 text-indigo-400 hover:text-indigo-300 text-sm font-bold">Yeni Mesaj Gönder</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Adınız Soyadınız</label>
                                    <input required type="text" className="w-full bg-[#020617] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" placeholder="İsim Soyisim" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">E-posta Adresiniz</label>
                                    <input required type="email" className="w-full bg-[#020617] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" placeholder="email@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Mesajınız</label>
                                    <textarea required className="w-full bg-[#020617] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none h-32 transition" placeholder="Mesajınız..."></textarea>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]">
                                    Gönder
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
