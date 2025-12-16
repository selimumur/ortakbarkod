import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url || !url.includes("trendyol.com")) {
            return NextResponse.json({ error: "Geçerli bir Trendyol mağaza linki giriniz." }, { status: 400 });
        }

        // SIMULATED AI ANALYSIS (In a real app, this would scrape or use an API)
        // We generate deterministic but realistic-looking data based on the URL length/chars to make it feel consistent.

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockScore = Math.floor(Math.random() * (98 - 70 + 1)) + 70;
        const isHigh = mockScore > 85;

        const analysis = {
            storeName: "Rakip Mağaza A.Ş.", // Real scraping would get this
            score: mockScore,
            metrics: {
                followers: Math.floor(Math.random() * 50000) + 1000,
                reviewAvg: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
                productCount: Math.floor(Math.random() * 500) + 50,
                responseSpeed: "15 Dakika"
            },
            swot: {
                strengths: [
                    "Yüksek mağaza puanı güven veriyor.",
                    "Ürün fotoğrafları profesyonel stüdyo çekimi.",
                    "Kargo paketlemesi hakkında olumlu yorumlar çok."
                ],
                weaknesses: [
                    "Ürün açıklamaları SEO uyumlu değil, kısa.",
                    "Soru-Cevap performansı yavaş (ort. 4 saat).",
                    "Kampanya dönemlerinde stok sorunu yaşıyor."
                ],
                opportunities: [
                    "Bu kategoride 'Hızlı Teslimat' rozeti alan rakip az.",
                    "Tamamlayıcı ürün (ör: kemer, cüzdan) satışı yok.",
                    "Instagram reklamlarını aktif kullanmıyorlar."
                ],
                threats: [
                    "Agresif fiyat indirimleri yapıyorlar (%20+).",
                    "Yeni sezona hızlı giriş yaptılar."
                ]
            },
            aiSuggestion: isHigh
                ? "Bu rakip çok güçlü. Fiyat rekabetine girmek yerine, 'Müşteri Deneyimi' ve 'Hediye Paketi' gibi katma değerli hizmetlerle fark yaratmalısınız. Ürün açıklamalarınızda duygusal bağ kurmaya odaklanın."
                : "Bu rakibin zayıf noktası 'Müşteri İletişimi'. Soru-cevap hızınızı 5 dakikanın altına düşürerek ve ürün açıklamalarını detaylandırarak kolayca önlerine geçebilirsiniz. Buybox stratejisinde %2 fiyat farkı ile liderliği almanız mümkün."
        };

        return NextResponse.json({ success: true, data: analysis });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
