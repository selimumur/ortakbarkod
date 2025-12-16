import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { productName, features, audience, platform } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 2500));

        const concepts = [
            {
                title: "Minimalist Lüks",
                visuals: "Üstten çekim (Flat Lay), yumuşak ve dağınık gün ışığı (Golden Hour).",
                scene: "Mermer zemin, yanında sadece bir adet kurutulmuş pampas otu ve altın detaylı bir obje.",
                palette: "Krem, Altın, Beyaz, Toprak Tonları",
                headline: `${productName}: Sadelikteki Şıklığı Keşfet.`,
                action: "Ürünü merkeze al, gölgelerle derinlik kat."
            },
            {
                title: "Modern Yaşam Tarzı",
                visuals: "Göz seviyesi açısı (Eye-level), doğal stüdyo ışığı.",
                scene: "Modern bir oturma odası köşesi, arkada flul aştırılmış (bokeh) yaşam detayları.",
                palette: "Gri, Antrasit, Mavi, Canlı Yeşil (Bitki)",
                headline: "Evinizin Havasını Değiştirecek Dokunuş.",
                action: "Ürünü kullanım anında göster (Lifestyle shot)."
            },
            {
                title: "Dramatik ve Odaklı",
                visuals: "Yakın çekim (Macro/Close-up), sert ve kontrastlı yapay ışık.",
                scene: "Tamamen siyah arka plan, ürüne spot ışık (Rim light) vuruyor.",
                palette: "Siyah, Gümüş, Neon Mavi vurgular",
                headline: "Detaylarda Gizli Kalite.",
                action: "Doku ve malzeme kalitesini öne çıkar."
            },
            {
                title: "Doğal ve Organik",
                visuals: "45 derece açı, pencere kenarı doğal ışık.",
                scene: "Ahşap masa üzeri, yanında kahve fincanı ve açık bir dergi.",
                palette: "Kahverengi, Bej, Yeşil, Turuncu",
                headline: "Doğallığı Hisset.",
                action: "Sıcak ve samimi bir atmosfer yarat."
            },
            {
                title: "Fütüristik / Tech",
                visuals: "Alt açı (Low angle), soğuk tonlu LED aydınlatma.",
                scene: "Metalik zemin veya cam yüzey, yansımalar aktif.",
                palette: "Beyaz, Camgöbeği, Mor, Gümüş",
                headline: "Geleceğin Tasarımı Bugün Sizinle.",
                action: "Ürünün inovatif yönünü vurgula."
            }
        ];

        return NextResponse.json({
            success: true,
            data: concepts
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
