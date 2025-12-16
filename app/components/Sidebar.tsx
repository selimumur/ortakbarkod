"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Barcode, Settings, MessageCircle,
  ChevronDown, ChevronRight, Store, Sliders, BarChart3, Database, FileText, Factory, Menu, X, Zap,
  Briefcase, Wallet, Receipt, ArrowRightLeft, Users, PieChart, Globe, Image, ShieldCheck, MessageSquareQuote, CreditCard, Activity, HelpCircle, TrendingUp, List, DollarSign, ShoppingBag
} from 'lucide-react';
import { useUser, UserButton, OrganizationSwitcher } from '@clerk/nextjs';

interface SidebarProps {
  subscription?: {
    plan: string;
    daysRemaining: number;
    status: string;
  };
  features?: {
    marketplace: boolean;
    arbitrage: boolean;
    advanced_reports: boolean;
    production: boolean;
  };
}

export default function Sidebar({ subscription, features }: SidebarProps) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  // Login sayfasında sidebar'ı gizle
  if (pathname === '/login') return null;

  // MENÜ DURUMLARI (Açık/Kapalı)
  const [isProductionOpen, setIsProductionOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isMarketplaceAdminOpen, setIsMarketplaceAdminOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [isArbitrageOpen, setIsArbitrageOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sayfa yüklendiğinde ilgili menüyü açık tut
  useEffect(() => {
    setIsProductionOpen(pathname.startsWith('/uretim'));
    setIsProductsOpen(pathname.startsWith('/urunler'));

    // Order Management (Sipariş Yönetimi)
    setIsMarketplaceOpen(
      pathname === '/pazaryeri' ||
      pathname === '/pazaryeri/fiyatlandirma' || // Pricing page fallback
      pathname.startsWith('/siparisler') ||
      pathname.startsWith('/siparisler/manuel-giris') ||
      pathname.startsWith('/yedek-parca') ||
      pathname.startsWith('/kargo')
    );

    // Marketplace Management (Pazaryeri Yönetimi)
    setIsMarketplaceAdminOpen(pathname.startsWith('/pazaryeri/') && pathname !== '/pazaryeri/fiyatlandirma');

    setIsSettingsOpen(pathname.startsWith('/ayarlar'));
    setIsAccountingOpen(pathname.startsWith('/muhasebe'));
    setIsMarketingOpen(pathname.startsWith('/pazarlama'));
    setIsArbitrageOpen(pathname.startsWith('/arbitraj'));

    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Helper: Ana Link Stili
  const linkClass = (path: string) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === path
    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`;

  // Helper: Alt Link Stili
  const subLinkClass = (path: string) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${pathname === path
    ? 'text-blue-400 bg-blue-500/10 font-medium'
    : 'text-gray-500 hover:text-white'
    }`;

  // Helper to check if feature is enabled or show lock
  const isFeatureEnabled = (featureKey: keyof typeof features) => {
    return features ? features[featureKey] : true; // Default to true if not provided (safe fail)
  };

  return (
    <>
      {/* MOBİL BUTON */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-[40] p-2 bg-blue-600 text-white rounded-lg shadow-lg print:hidden"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* MOBİL KARARTMA */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-[30] md:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* ANA SIDEBAR */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-[40] w-64 bg-[#111827] border-r border-gray-800 flex flex-col shrink-0 h-screen transition-transform duration-300 ease-in-out print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        {/* LOGO */}
        <div className="p-6 flex justify-between items-center border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Barcode size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">OrtakBarkod</h1>
            </div>
            <p className="text-xs text-gray-500 ml-10">SaaS Paneli v1.3</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400"><X /></button>
        </div>

        {/* MENÜLER */}
        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">

          {/* DASHBOARD */}
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            <LayoutDashboard size={18} />
            <span>Kokpit</span>
          </Link>

          {/* --- Sipariş Yönetimi (AÇILIR) --- */}
          <div className="pt-2">
            <button
              onClick={() => setIsMarketplaceOpen(!isMarketplaceOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/pazaryeri') || pathname.startsWith('/siparisler') || pathname.startsWith('/kargo') || pathname.startsWith('/yedek-parca')
                ? 'text-white bg-gray-800/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <Store size={18} />
                <span>Sipariş Yönetimi</span>
              </div>
              {isMarketplaceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isMarketplaceOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                <Link href="/siparisler" className={subLinkClass('/siparisler')}>
                  <ShoppingCart size={14} /> Siparişler
                </Link>
                <Link href="/siparisler/manuel-giris" className={subLinkClass('/siparisler/manuel-giris')}>
                  <FileText size={14} /> Manuel Sipariş Girişi
                </Link>
                <Link href="/yedek-parca" className={subLinkClass('/yedek-parca')}>
                  <Wallet size={14} /> Yedek Parça Yönetimi
                </Link>
                <Link href="/kargo" className={subLinkClass('/kargo')}>
                  <Truck size={14} /> Kargo Yönetimi
                </Link>
                <Link href="/pazaryeri" className={subLinkClass('/pazaryeri')}>
                  <Globe size={14} /> Ürün Operasyonları
                </Link>
              </div>
            )}
          </div>

          <Link href="/sorular" className={linkClass('/sorular')}>
            <MessageCircle size={18} />
            <span>Soru & Cevap</span>
          </Link>

          {/* ÜRÜNLER MENÜSÜ (AÇILIR) */}
          <div className="pt-2">
            <button
              onClick={() => setIsProductsOpen(!isProductsOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/urunler')
                ? 'text-white bg-gray-800/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <Package size={18} />
                <span>Ürün Yönetimi</span>
              </div>
              {isProductsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isProductsOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                <Link href="/urunler" className={subLinkClass('/urunler')}>
                  <Package size={14} /> Ürünler
                </Link>
                <Link href="/urunler/eslestirme" className={subLinkClass('/urunler/eslestirme')}>
                  <ArrowRightLeft size={14} /> Ürün Eşleştirme
                </Link>
                <Link href="/urunler/yayinla" className={subLinkClass('/urunler/yayinla')}>
                  <Globe size={14} /> Ürün Yayınla
                </Link>
                <Link href="/urunler/fiyatlama" className={subLinkClass('/urunler/fiyatlama')}>
                  <Receipt size={14} /> Fiyatlama
                </Link>
              </div>
            )}
          </div>

          {/* --- PAZARYERİ YÖNETİMİ MENÜSÜ (AÇILIR) --- */}
          {/* SADECE PRO VE ÜZERİ */}
          {(!features || features.marketplace) && (
            <div className="pt-2">
              <button
                onClick={() => setIsMarketplaceAdminOpen(!isMarketplaceAdminOpen)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/pazaryeri/')
                  ? 'text-white bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <PieChart size={18} />
                  <span>Pazaryeri Yönetimi</span>
                </div>
                {isMarketplaceAdminOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isMarketplaceAdminOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Link href="/pazaryeri/siparis-yonetimi" className={subLinkClass('/pazaryeri/siparis-yonetimi')}>
                    <Package size={14} /> Pazaryeri Siparişleri
                  </Link>
                  <Link href="/pazaryeri/urun-optimizasyonu" className={subLinkClass('/pazaryeri/urun-optimizasyonu')}>
                    <Zap size={14} /> Ürün Optimizasyonu
                  </Link>
                  <Link href="/pazaryeri/fiyatlandirma" className={subLinkClass('/pazaryeri/fiyatlandirma')}>
                    <BarChart3 size={14} /> Dinamik Fiyatlandırma
                  </Link>
                  {/* .. other items .. */}
                  <Link href="/pazaryeri/satis-tahmini" className={subLinkClass('/pazaryeri/satis-tahmini')}>
                    <BarChart3 size={14} /> Satış Tahminleri
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* --- PAZARLAMA MENÜSÜ (AÇILIR) --- */}
          {(!features || features.advanced_reports) && (
            <div className="pt-2">
              <button
                onClick={() => setIsMarketingOpen(!isMarketingOpen)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/pazarlama')
                  ? 'text-white bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} />
                  <span>Pazarlama</span>
                </div>
                {isMarketingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {/* Rest of marketing... */}
              {isMarketingOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Link href="/pazarlama" className={subLinkClass('/pazarlama')}>
                    <LayoutDashboard size={14} /> Genel Durum
                  </Link>
                  {/* ... */}
                  <Link href="/pazarlama/urun-yorum-analizi" className={subLinkClass('/pazarlama/urun-yorum-analizi')}>
                    <MessageSquareQuote size={14} /> Yorum Analizi
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* --- ÜRETİM MENÜSÜ (AÇILIR) --- */}
          {(!features || features.production) && (
            <div className="pt-2">
              <button
                onClick={() => setIsProductionOpen(!isProductionOpen)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/uretim')
                  ? 'text-white bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Factory size={18} />
                  <span>Üretim</span>
                </div>
                {isProductionOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isProductionOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Link href="/uretim" className={subLinkClass('/uretim')}>
                    <Database size={14} /> Üretim Planlama
                  </Link>
                  <Link href="/uretim/hat" className={subLinkClass('/uretim/hat')}>
                    <Settings size={14} /> Üretim Hattı
                  </Link>
                  <Link href="/uretim/raporlar" className={subLinkClass('/uretim/raporlar')}>
                    <BarChart3 size={14} /> Üretim Kokpiti
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* MUHASEBE MENÜSÜ (AÇILIR) */}
          <div className="pt-2">
            {/* Same as before... */}
            <button
              onClick={() => setIsAccountingOpen(!isAccountingOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/muhasebe')
                ? 'text-white bg-gray-800/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase size={18} />
                <span>Muhasebe</span>
              </div>
              {isAccountingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isAccountingOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                <Link href="/muhasebe" className={subLinkClass('/muhasebe')}>
                  <LayoutDashboard size={14} /> Genel Durum
                </Link>
                <Link href="/muhasebe/finans" className={subLinkClass('/muhasebe/finans')}>
                  <Wallet size={14} /> Finans Yönetimi
                </Link>
                <Link href="/muhasebe/cariler" className={subLinkClass('/muhasebe/cariler')}>
                  <Users size={14} /> Cari Hesaplar
                </Link>
                <Link href="/muhasebe/gelir-gider" className={subLinkClass('/muhasebe/gelir-gider')}>
                  <PieChart size={14} /> Gelir & Gider
                </Link>
                <Link href="/muhasebe/fatura" className={subLinkClass('/muhasebe/fatura')}>
                  <FileText size={14} /> Fatura
                </Link>
                <Link href="/muhasebe/finans/raporlar" className={subLinkClass('/muhasebe/finans/raporlar')}>
                  <BarChart3 size={14} /> Finansal Raporlar
                </Link>
                <Link href="/muhasebe/finans/pos" className={subLinkClass('/muhasebe/finans/pos')}>
                  <CreditCard size={14} /> POS Yönetimi
                </Link>
                <Link href="/muhasebe/personel" className={subLinkClass('/muhasebe/personel')}>
                  <Users size={14} /> Personel İşleri
                </Link>
              </div>
            )}
          </div>

          {/* AYARLAR MENÜSÜ (AÇILIR) */}
          <div className="pt-2 pb-4">
            {/* Same as before... */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/ayarlar')
                ? 'text-white bg-gray-800/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <Settings size={18} />
                <span>Ayarlar</span>
              </div>
              {isSettingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isSettingsOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1">
                <Link href="/ayarlar" className={subLinkClass('/ayarlar')}>
                  <Sliders size={14} /> Genel Ayarlar
                </Link>
                <Link href="/ayarlar/pazaryerleri" className={subLinkClass('/ayarlar/pazaryerleri')}>
                  <Store size={14} /> Pazaryerleri
                </Link>
                <Link href="/ayarlar/kargo" className={subLinkClass('/ayarlar/kargo')}>
                  <Truck size={14} /> Kargo Firmaları
                </Link>
                <Link href="/ayarlar/kullanicilar" className={subLinkClass('/ayarlar/kullanicilar')}>
                  <Users size={14} /> Kullanıcılar
                </Link>
              </div>
            )}
          </div>

          {/* ARBITRAJ MENÜSÜ (AÇILIR) */}
          {(!features || features.arbitrage) && (
            <div className="pt-2 pb-4">
              <button
                onClick={() => setIsArbitrageOpen(!isArbitrageOpen)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/arbitraj')
                  ? 'text-white bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} />
                  <span>Arbitraj & Fırsatlar</span>
                </div>
                {isArbitrageOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isArbitrageOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Link href="/arbitraj" className={subLinkClass('/arbitraj')}>
                    <LayoutDashboard size={14} /> Genel Bakış
                  </Link>
                  <Link href="/arbitraj/izleme-listesi" className={subLinkClass('/arbitraj/izleme-listesi')}>
                    <List size={14} /> İzleme Listesi
                  </Link>
                  <Link href="/arbitraj/karlilik-hesaplayici" className={subLinkClass('/arbitraj/karlilik-hesaplayici')}>
                    <DollarSign size={14} /> Kar Hesaplayıcı
                  </Link>
                  <Link href="/arbitraj/entegrasyon-ve-ayarlar" className={subLinkClass('/arbitraj/entegrasyon-ve-ayarlar')}>
                    <Settings size={14} /> Entegrasyon
                  </Link>
                  <Link href="/arbitraj/chrome-eklentisi" className={subLinkClass('/arbitraj/chrome-eklentisi')}>
                    <Globe size={14} /> Chrome Eklentisi
                  </Link>
                </div>
              )}
            </div>
          )}

          <Link href="/market" className={linkClass('/market')}>
            <ShoppingBag size={18} />
            <span>Uygulama Marketi</span>
          </Link>

          {/* YARDIM MENÜSÜ */}
          <Link href="/yardim" className={linkClass('/yardim')}>
            <HelpCircle size={18} />
            <span>Yardım Merkezi</span>
          </Link>

          <Link href="/abonelik" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4 border border-blue-500/20 bg-blue-500/5 ${pathname.startsWith('/abonelik') ? 'text-blue-400 border-blue-500' : 'text-blue-500 hover:bg-blue-500/10'
            }`}>
            <CreditCard size={18} />
            <div>
              <div className="flex justify-between items-center w-full gap-2">
                <span>Paketim ({subscription?.plan.toUpperCase() || 'FREE'})</span>
              </div>
              {subscription && (
                <div className="text-[10px] text-gray-400 mt-1">
                  Kalan Süre: <span className={subscription.daysRemaining < 3 ? "text-red-500 font-bold" : "text-white"}>{subscription.daysRemaining} Gün</span>
                </div>
              )}
            </div>
          </Link>

        </nav>

        {/* PROFİL ALANI */}
        <div className="p-4 border-t border-gray-800 mt-auto bg-[#0f1623]">
          {isLoaded && user && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserButton
                    afterSignOutUrl="/login"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-8 h-8 focus:shadow-none focus:outline-none"
                      }
                    }}
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate max-w-[140px]">
                      {user.firstName || user.username || "Kullanıcı"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <OrganizationSwitcher
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      organizationSwitcherTrigger: "w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-700 flex justify-between items-center",
                      organizationSwitcherTriggerIcon: "text-gray-400"
                    }
                  }}
                />
              </div>
            </div>
          )}
          {!isLoaded && <div className="text-gray-500 text-xs text-center py-2">Yükleniyor...</div>}
        </div>

      </aside>
    </>
  );
}