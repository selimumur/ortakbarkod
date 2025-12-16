"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import Barcode from "react-barcode";

function LabelContent() {
  const searchParams = useSearchParams();
  
  // URL'den verileri çek
  const musteri = searchParams.get("musteri")?.toUpperCase() || "ALICI ADI YOK";
  const platform = searchParams.get("platform")?.toUpperCase() || "TRENDYOL";
  const tutar = searchParams.get("tutar") || "0";
  const siparisNo = searchParams.get("id") || "000000";
  const urunKodu = searchParams.get("kod") || "KOD YOK"; // YENİ: Ürün Kodu

  const takipNo = "734" + siparisNo; 

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-10 print:pt-0 print:bg-white print:block">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ETİKET (100mm x 150mm) */}
      <div id="print-area" className="w-[100mm] h-[150mm] bg-white text-black border-2 border-black relative flex flex-col overflow-hidden shadow-2xl print:shadow-none print:border-0">
        
        {/* 1. KARGO TAKİP BARKODU */}
        <div className="h-24 flex items-center justify-center border-b-4 border-black pt-2">
           <Barcode value={takipNo} width={2.5} height={60} fontSize={16} font="monospace" />
        </div>

        <div className="flex-1 p-4 flex flex-col gap-3">
            
            {/* 2. ALICI */}
            <div className="border-4 border-black p-2">
                <h2 className="text-xl font-black leading-tight mb-1 line-clamp-2">{musteri}</h2>
                <p className="text-xs font-bold text-gray-600 uppercase">ÖRNEK MAH. CUMHURİYET CAD. NO:14/B KADIKÖY / İST</p>
            </div>

            {/* 3. ÜRÜN KODU (YENİ VE BÜYÜK ALAN) */}
            <div className="border-4 border-black bg-black text-white p-3 text-center">
                <p className="text-[10px] font-bold text-gray-300 mb-1">PAKET İÇERİĞİ / STOK KODU</p>
                <h1 className="text-3xl font-black tracking-wider">{urunKodu}</h1>
            </div>

            {/* 4. PLATFORM BİLGİSİ */}
            <div className="flex gap-2">
                <div className="border-2 border-black p-2 flex-1">
                    <p className="text-[10px] font-bold text-gray-500">PLATFORM</p>
                    <h3 className="text-lg font-black">{platform}</h3>
                </div>
                <div className="border-2 border-black p-2 flex-1 text-right">
                    <p className="text-[10px] font-bold text-gray-500">TUTAR</p>
                    <h3 className="text-lg font-black">₺{tutar}</h3>
                </div>
            </div>

            <div className="text-xs font-bold text-center mt-auto">
                Sipariş No: {siparisNo}
            </div>
        </div>

        {/* ALT BİLGİ */}
        <div className="h-8 border-t-2 border-black flex items-center justify-between px-4 bg-black text-white">
            <span className="font-bold text-xs">SÜRAT KARGO</span>
            <span className="text-[10px]">{new Date().toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
    </div>
  );
}

export default function LabelPage() {
  return (
    <Suspense fallback={<div className="text-white p-10">Etiket Hazırlanıyor...</div>}>
      <LabelContent />
    </Suspense>
  );
}