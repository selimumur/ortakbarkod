"use client";

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  Store,
  Printer,
  User,
  ChevronRight,
  CreditCard,
  Bell,
  Settings,
  Tag,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSettingsSummaryAction, SettingsSummary } from '@/app/actions/settingsActions';

export default function SettingsHubPage() {
  const { orgId } = useAuth();
  const [summary, setSummary] = useState<SettingsSummary | null>(null);

  useEffect(() => {
    if (orgId) getSettingsSummaryAction().then(setSummary);
  }, [orgId]);

  const settingCards = [
    {
      title: "Pazaryeri Entegrasyonları",
      description: "Trendyol, Hepsiburada, N11 ve diğer mağaza API bağlantılarını yönetin.",
      icon: <Store size={26} />,
      href: "/ayarlar/pazaryerleri",
      gradient: "from-blue-600 to-blue-400",
      bgInfo: "bg-blue-500/10",
      borderInfo: "border-blue-500/20 text-blue-400",
      badge: summary ? `${summary.connectedMarketplaces} Mağaza` : "..."
    },
    {
      title: "Barkod & Yazıcı",
      description: "Kargo etiketi şablonları, raf barkodları ve varsayılan yazıcı ayarları.",
      icon: <Printer size={26} />,
      href: "/ayarlar/yazici",
      gradient: "from-purple-600 to-purple-400",
      bgInfo: "bg-purple-500/10",
      borderInfo: "border-purple-500/20 text-purple-400"
    },
    {
      title: "Hesap & Profil",
      description: "Şirket bilgileri, kullanıcı yönetimi ve güvenlik ayarları.",
      icon: <User size={26} />,
      href: "/ayarlar/hesap",
      gradient: "from-green-600 to-green-400",
      bgInfo: "bg-green-500/10",
      borderInfo: "border-green-500/20 text-green-400"
    },
    {
      title: "Bildirim Merkezi",
      description: "Sipariş sesleri, e-posta uyarıları ve push bildirim tercihleri.",
      icon: <Bell size={26} />,
      href: "/ayarlar/bildirimler",
      gradient: "from-yellow-500 to-yellow-300",
      bgInfo: "bg-yellow-500/10",
      borderInfo: "border-yellow-500/20 text-yellow-500",
      badge: summary ? `${summary.notifications} Bildirim` : ""
    },
    {
      title: "Abonelik ve Plan",
      description: "Mevcut paketiniz, faturalar ve ödeme yöntemleri yönetimi.",
      icon: <CreditCard size={26} />,
      href: "/ayarlar/abonelik",
      gradient: "from-pink-600 to-pink-400",
      bgInfo: "bg-pink-500/10",
      borderInfo: "border-pink-500/20 text-pink-400",
      badge: summary?.planName
    },
    {
      title: "Tanımlamalar",
      description: "Varsayılan marka, kategori eşleştirmeleri ve global sistem tanımları.",
      icon: <Tag size={26} />,
      href: "/ayarlar/tanimlamalar",
      gradient: "from-indigo-600 to-indigo-400",
      bgInfo: "bg-indigo-500/10",
      borderInfo: "border-indigo-500/20 text-indigo-400"
    }
  ];

  return (
    <div className="w-full h-full bg-[#020617] p-8 md:p-12 overflow-y-auto custom-scrollbar">
      <header className="mb-12 max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/20 rounded-full border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Settings size={14} /> Kontrol Merkezi
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
          Sistem Ayarları
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
          Tüm sistem yapılandırmasını, entegrasyonları ve kullanıcı tercihlerinizi buradan yönetebilirsiniz.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {settingCards.map((card, index) => (
          <Link
            key={index}
            href={card.href}
            className="group relative flex flex-col justify-between p-8 bg-[#0F172A] border border-white/5 rounded-3xl hover:border-white/10 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:-translate-y-1"
          >
            {/* Background Glow Effect */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 rounded-bl-full transition-opacity duration-500`}></div>

            <div>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${card.bgInfo} border ${card.borderInfo} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {card.icon}
                </div>
                {card.badge && (
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white">
                    {card.badge}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                {card.description}
              </p>
            </div>

            <div className="mt-8 flex items-center text-sm font-bold text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Yapılandır <ChevronRight size={16} className="ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
