"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Truck, Package, Barcode, Settings, MessageCircle, LogOut, 
  ChevronDown, ChevronRight, Store, Sliders, BarChart3, Database, FileText, Factory, Menu, X, Zap,
  Briefcase, Wallet, Receipt, ArrowRightLeft, Users, PieChart, Globe, ClipboardList
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // MENÜ DURUMLARI (Açık/Kapalı)
  const [isProductionOpen, setIsProductionOpen] = useState(false); // YENİ: Üretim
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false); // YENİ: Pazaryeri
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sayfa yüklendiğinde ilgili menüyü açık tut
  useEffect(() => {
    if (pathname.startsWith('/uretim')) setIsProductionOpen(true);
    if (pathname.startsWith('/pazaryeri') || pathname.startsWith('/siparisler') || pathname.startsWith('/yedek-parca') || pathname.startsWith('/kargo')) setIsMarketplaceOpen(true);
    if (pathname.startsWith('/ayarlar')) setIsSettingsOpen(true);
    if (pathname.startsWith('/muhasebe')) setIsAccountingOpen(true);
    
    setIsMobileMenuOpen(false); 
  }, [pathname]);

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Helper: Ana Link Stili
  const linkClass = (path: string) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    pathname === path 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
  }`;

  // Helper: Alt Link Stili
  const subLinkClass = (path: string) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
    pathname === path 
      ? 'text-blue-400 bg-blue-500/10 font-medium' 
      : 'text-gray-500 hover:text-white'
  }`;

  return (
    <>
      {/* MOBİL BUTON */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg print:hidden"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* MOBİL KARARTMA */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* ANA SIDEBAR */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#111827] border-r border-gray-800 flex flex-col shrink-0 h-screen transition-transform duration-300 ease-in-out print:hidden
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
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400"><X/></button>
        </div>

        {/* MENÜLER */}
        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
          
          {/* DASHBOARD */}
          <Link href="/" className={linkClass('/')}>
            <LayoutDashboard size={18} />
            <span>Kokpit</span>
          </Link>

          {/* --- ÜRETİM MENÜSÜ (AÇILIR) --- */}
          <div className="pt-2">
            <button 
              onClick={() => setIsProductionOpen(!isProductionOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/uretim') 
                ? 'text-white bg-gray-800/50' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                 <Factory size={18} />
                 <span>ÜRETİM</span>
              </div>
              {isProductionOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
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

          {/* --- PAZARYERİ YÖNETİMİ MENÜSÜ (AÇILIR) --- */}
          <div className="pt-2">
            <button 
              onClick={() => setIsMarketplaceOpen(!isMarketplaceOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/pazaryeri') || pathname.startsWith('/siparisler') || pathname.startsWith('/kargo') || pathname.startsWith('/yedek-parca')
                ? 'text-white bg-gray-800/50' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                 <Store size={18} />
                 <span>PAZARYERİ YÖNETİMİ</span>
              </div>
              {isMarketplaceOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
            </button>
            
            {isMarketplaceOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Link href="/siparisler" className={subLinkClass('/siparisler')}>
                    <ShoppingCart size={14} /> Sipariş Yönetimi
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

          {/* DİĞER LİNKLER */}
          <Link href="/urunler" className={linkClass('/urunler')}>
            <Package size={18} />
            <span>Ürünler</span>
          </Link>

          <Link href="/pazarlama" className={linkClass('/pazarlama')}>
            <Zap size={18} />
            <span>Pazarlama</span>
          </Link>

          <Link href="/sorular" className={linkClass('/sorular')}>
            <MessageCircle size={18} />
            <span>Soru & Cevap</span>
          </Link>

          {/* MUHASEBE MENÜSÜ (AÇILIR) */}
          <div className="pt-2">
            <button 
              onClick={() => setIsAccountingOpen(!isAccountingOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/muhasebe') 
                ? 'text-white bg-gray-800/50' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                 <Briefcase size={18} />
                 <span>Muhasebe</span>
              </div>
              {isAccountingOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
            </button>
            
            {isAccountingOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  <Link href="/muhasebe" className={subLinkClass('/muhasebe')}>
                    <LayoutDashboard size={14} /> Genel Durum
                  </Link>
                  <Link href="/muhasebe/finans/islem" className={subLinkClass('/muhasebe/finans/islem')}>
                    <ArrowRightLeft size={14} /> Hızlı İşlem
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
                  <Link href="/muhasebe/cek-senet" className={subLinkClass('/muhasebe/cek-senet')}>
                    <Receipt size={14} /> Çek / Senet
                  </Link>
              </div>
            )}
          </div>

          {/* AYARLAR MENÜSÜ (AÇILIR) */}
          <div className="pt-2 pb-4">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/ayarlar') 
                ? 'text-white bg-gray-800/50' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings size={18} />
                <span>Ayarlar</span>
              </div>
              {isSettingsOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
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

        </nav>
        
        {/* PROFİL ALANI */}
        <div className="p-4 border-t border-gray-800 mt-auto bg-[#0f1623]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md border border-white/10">SB</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Selim U.</p>
              <p className="text-xs text-gray-500 truncate">Yönetici</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-800 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition text-xs font-bold border border-gray-700 hover:border-red-500/30"
          >
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>

      </aside>
    </>
  );
}