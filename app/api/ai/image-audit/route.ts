import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { imageUrl } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 3500));

        // MOCK AUDIT RESULT
        const auditResult = {
            score: 72,
            analysis: {
                lighting: { status: "Orta", msg: "Aydınlatma biraz yetersiz, ürün gölgede kalmış." },
                color: { status: "İyi", msg: "Renkler canlı ve doğru görünüyor." },
                reflection: { status: "Kötü", msg: "Ürün üzerinde istenmeyen yansımalar var." },
                ambiance: { status: "İyi", msg: "Arka plan sade ve ürünle uyumlu." },
                luxury: { status: "Orta", msg: "Premium algısı için daha iyi bir kompozisyon gerekli." }
            },
            issues: [
                "Ürünün sağ alt köşesinde netlik kaybı var.",
                "Beyaz ayarı (White Balance) biraz sıcak, tonlar sarıya kaçıyor.",
                "Ürün kadraja tam ortalanmamış, boşluklar dengesiz."
            ],
            suggestions: [
                "Işık kaynağını ürünün sol çaprazından vererek gölgeleri yumuşatın.",
                "Polarize filtre kullanarak yansımaları (parlamaları) kesin.",
                "Tripod kullanarak çekim yapın, ISO değerini düşürün.",
                "Düzenleme aşamasında 'Keskinlik (Sharpness)' değerini +10 artırın."
            ],
            concepts: [
                { title: "Minimalist İskandinav", desc: "Gri beton zemin, doğal gün ışığı ve yanına bir adet okaliptüs dalı.", vibe: "Modern & Ferah" },
                { title: "Neon Cyberpunk", desc: "Karanlık arka plan, ürün arkasından mavi/pembe neon ışık süzülmesi.", vibe: "Teknolojik & Enerjik" },
                { title: "Lüks & Gold", desc: "Siyah mermer zemin, altın detaylı aksesuarlar ve dramatik, sert gölgeli ışık.", vibe: "Premium & Ciddi" },
                { title: "Doğal Yaşam", desc: "Ahşap masa üzerinde, sabah güneşi etkisi ve kahve fincanı eşliğinde.", vibe: "Samimi & Günlük" },
                { title: "Study Stüdyosu", desc: "Sonsuz beyaz fon, tam tepeden (Flat-lay) simetrik çekim.", vibe: "Profesyonel & Temiz" }
            ]
        };

        return NextResponse.json({
            success: true,
            data: auditResult
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
