import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { brandOrLink } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 3000));

        // MOCK ANALYSIS RESULT (Independent of input for demo)
        const analysis = {
            brandName: brandOrLink.includes('http') ? "Rakip Marka X" : brandOrLink,
            summary: "Marka, agresif bir büyüme stratejisi izliyor ve özellikle Instagram Reels üzerinden 'Lifestyle' içeriklerle Z kuşağını hedefliyor. Fiyat odaklı değil, değer odaklı bir konumlandırmaları var.",
            adAnalysis: {
                messages: ["Sınırlı Stok", "Keşfetmeye Hazır Mısın?", "Doğadan İlham Aldık"],
                tone: "Samimi, Heyecanlı ve Aciliyet Hissi Yaratan",
                channels: ["Instagram Story (Retargeting)", "Facebook Feed (Catalog Sales)", "Youtube Shorts (Brand Awareness)"]
            },
            creativeAnalysis: {
                style: "Minimalist ve Pastel Tonlar",
                visuals: "Ürün odaklı yakın çekimler ve influencer kullanımı",
                videoStrategy: "Hızlı kurgu, hareketli tipografi ve trend müzikler"
            },
            audience: {
                primary: "25-34 Yaş Arası Kadınlar",
                interests: ["Ev Dekorasyonu", "Sürdürülebilirlik", "DIY Projeleri"],
                painPoints: "Kalitesiz malzeme, uzun kargo süreleri"
            },
            campaignRhythm: "Haftada 3 yeni kreatif testi yapıyorlar. Ay sonlarında 'Ücretsiz Kargo' kampanyaları yoğunlaşıyor.",
            opportunities: [
                "Rakibin kargo süreçlerindeki şikayetleri avantaja çevirerek 'Aynı Gün Kargo' vurgusu yapılabilir.",
                "Video içeriklerinde sesi kapalı izleyenler için altyazı kullanmıyorlar, bu bir fırsat.",
                "Google Display reklamlarında aktif değiller, buradaki boşluk değerlendirilebilir."
            ],
            swot: {
                strengths: ["Güçlü Influencer Ağı", "Yüksek Etkileşim Oranı", "Tutarlı Görsel Dil"],
                weaknesses: ["Yüksek Fiyat Algısı", "Müşteri Hizmetleri Yavaşlığı", "Sınırlı Ürün Çeşidi"]
            },
            actionPlan: [
                "Rakibin 'Lifestyle' reels videolarına benzer ama ürün dayanıklılığını vurgulayan içerikler üret.",
                "Instagram Story reklamlarında 'Aynı Gün Kargo' avantajını büyük puntolarla kullan.",
                "Rakibin hedeflemediği Google Display ağı için dinamik yeniden pazarlama kampanyası başlat.",
                "Influencer işbirlikleri için mikro-influencer'lara odaklanarak daha samimi bir dil yakala.",
                "Ürün paketleme deneyimini (Unboxing) öne çıkaran videolar çek.",
                "Rakibin fiyat algısını kırmak için 'Fiyat/Performans' karşılaştırma tabloları oluştur.",
                "Web sitesinde 'Sıkça Sorulan Sorular' bölümünü kargo odaklı güncelle.",
                "Haftasonu özel 'Flash İndirim' kurgusu ile rakibin ay sonu kampanyalarından önce davran.",
                "Müşteri yorumlarını (UGC) reklamlarda sosyal kanıt olarak kullan.",
                "Rakibin kullanmadığı TikTok platformu için challenge odaklı içerik planla."
            ]
        };

        return NextResponse.json({
            success: true,
            data: analysis
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
