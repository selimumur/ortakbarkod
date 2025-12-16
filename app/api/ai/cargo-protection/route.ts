import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { productType, material } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 3000));

        // MOCK PROTECTION PLAN
        const protectionPlan = {
            riskLevel: "Yüksek",
            prediction: "Kırılma ve Çatlama Riski",
            packaging: {
                box: "Çift Oluklu (Dopel) Koli",
                filler: "Balonlu Naylon (Patpat) + Hava Yastığı",
                tape: "Akrilik Yapışkanlı Bant (H Tipi Bantlama)"
            },
            steps: [
                "Ürünü önce ince bir jelatin veya kağıt ile sararak yüzey çizilmelerini önleyin.",
                "Ardından ürünü en az 3 kat balonlu naylon (patpat) ile sıkıca sarın.",
                "Koli tabanına 5 cm kalınlığında strafor veya kırpık kağıt yerleştirin.",
                "Ürünü koliye yerleştirin, kenarlarda en az 3 cm boşluk kaldığından emin olun.",
                "Boşlukları hava yastıkları veya buruşturulmuş kraft kağıt ile tamamen doldurun.",
                "Koliyi salladığınızda ürünün içeride hareket etmediğinden emin olun.",
                "Koli kapaklarını kapatın ve 'H' şeklinde bantlayarak (alt ve üst) tam sızdırmazlık sağlayın.",
                "Koli üzerine görünür şekilde 'Kırılacak Eşya' (Fragile) etiketi yapıştırın.",
                "Eğer birden fazla ürün varsa, birbirlerine temas etmeyecek şekilde aralarına seperatör koyun.",
                "Kargo barkodunu en geniş yüzeye, düzgün ve okunabilir şekilde yapıştırın."
            ],
            costEfficiency: "Orta - Yüksek maliyetli ancak iade maliyetinden %80 tasarruf sağlar."
        };

        return NextResponse.json({
            success: true,
            data: protectionPlan
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
