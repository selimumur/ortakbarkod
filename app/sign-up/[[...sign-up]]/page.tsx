"use client";

import { SignUp } from '@clerk/nextjs'
import { useState, useEffect } from 'react';
import { ScanBarcode, ShieldCheck, Zap, TrendingUp, Info } from 'lucide-react';

export default function Page() {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 1,
            title: "Hızlı Kurulum",
            desc: "Saniyeler içinde hesabınızı oluşturun ve ürünlerinizi yüklemeye başlayın. Kredi kartı gerekmez.",
            icon: <Zap size={48} className="text-yellow-400" />,
            color: "from-yellow-500/20 to-orange-500/20"
        },
        {
            id: 2,
            title: "Pazaryeri Entegrasyonları",
            desc: "Trendyol, Hepsiburada ve Amazon mağazalarınızı bağlayın. Siparişleriniz tek ekrana düşsün.",
            icon: <TrendingUp size={48} className="text-emerald-400" />,
            color: "from-emerald-500/20 to-teal-500/20"
        },
        {
            id: 3,
            title: "Güvenli ve Modern",
            desc: "Modern arayüz ve güçlü altyapı ile işinizi güvenle büyütün. Verileriniz bizimle güvende.",
            icon: <ShieldCheck size={48} className="text-blue-400" />,
            color: "from-blue-500/20 to-indigo-500/20"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="flex min-h-screen bg-[#0B1120] text-white overflow-hidden">

            {/* LEFT SIDE: BRANDING & ADS (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/40 via-[#0B1120] to-[#0B1120] z-0"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"></div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <ScanBarcode className="text-white" size={28} />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            OrtakBarkod
                        </span>
                    </div>
                </div>

                {/* Carousel / Info Box */}
                <div className="relative z-10 mb-12">
                    <div className="relative h-[250px] w-full max-w-lg">
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`absolute top-0 left-0 w-full transition-all duration-700 ease-in-out transform ${index === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'
                                    }`}
                            >
                                <div className={`p-8 rounded-3xl border border-white/10 backdrop-blur-xl bg-gradient-to-br ${slide.color}`}>
                                    <div className="mb-6 inline-block p-4 bg-white/10 rounded-2xl ring-1 ring-white/20">
                                        {slide.icon}
                                    </div>
                                    <h2 className="text-3xl font-bold mb-3 text-white">{slide.title}</h2>
                                    <p className="text-gray-300 text-lg leading-relaxed">{slide.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Indicators */}
                    <div className="flex gap-2 mt-8">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-gray-600 hover:bg-gray-500'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer Text */}
                <div className="relative z-10 text-xs text-gray-500 font-medium">
                    <p>© 2024 OrtakBarkod Teknoloji A.Ş. Tüm hakları saklıdır.</p>
                </div>
            </div>

            {/* RIGHT SIDE: AUTH FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center relative p-6">
                {/* Mobile Background Elements (Visible only on mobile) */}
                <div className="lg:hidden absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-indigo-900/40 to-transparent"></div>

                <div className="w-full max-w-[480px] relative z-10">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
                            <ScanBarcode className="text-white" size={32} />
                        </div>
                    </div>

                    <SignUp
                        routing="path"
                        path="/sign-up"
                        fallbackRedirectUrl="/dashboard"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "bg-[#111827] border border-gray-800 shadow-2xl shadow-black/50 rounded-2xl w-full",
                                headerTitle: "text-white text-xl font-bold",
                                headerSubtitle: "text-gray-400",
                                formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white font-medium !shadow-none border-0",
                                formFieldLabel: "text-gray-400",
                                formFieldInput: "bg-gray-900 border-gray-700 text-white focus:border-blue-500",
                                footerActionLink: "text-blue-400 hover:text-blue-300",
                                identityPreviewText: "text-gray-300",
                                identityPreviewEditButton: "text-blue-400",
                                formFieldInputShowPasswordButton: "text-gray-500 hover:text-gray-300",
                                dividerLine: "bg-gray-800",
                                dividerText: "text-gray-500",
                                socialButtonsBlockButton: "bg-gray-800 border-gray-700 text-white hover:bg-gray-750",
                                socialButtonsBlockButtonText: "text-white",
                                socialButtonsBlockButtonArrow: "text-gray-400",
                                formFieldSuccessText: "text-green-400",
                                formFieldErrorText: "text-red-400",
                                alertText: "text-red-400"
                            }
                        }}
                    />

                    {/* Mobile Info Text */}
                    <div className="lg:hidden mt-8 text-center px-4">
                        <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs font-medium bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                            <Info size={14} />
                            <span>14 gün ücretsiz deneme hemen başlar.</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
