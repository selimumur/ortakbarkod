import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { reviews } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 4000));

        // MOCK ANALYSIS
        const analysis = {
            sentiment: {
                score: 78,
                positive: 65,
                neutral: 20,
                negative: 15
            },
            complaints: [
                "Kargo paketi çok özensizdi, kutu ezik geldi.",
                "Ürün görseldeki renkten bir ton daha koyu.",
                "Kurulum şeması yetersiz, montajda zorlandım.",
                "Kumaş kalitesi beklentimin altında, biraz ince.",
                "Fermuar kısmı takılıyor, sağlam değil.",
                "Müşteri hizmetlerine ulaşmak çok zor.",
                "Kargo süreci belirtilenden uzun sürdü.",
                "Ürün boyutları açıklamadakinden biraz farklı.",
                "Vidalar eksik çıktı.",
                "İlk yıkamada hafif çekme yaptı."
            ],
            likes: [
                "Fiyat/Performans oranı çok başarılı.",
                "Tasarımı çok şık ve modern duruyor.",
                "Kargolama süreci inanılmaz hızlıydı.",
                "Satıcının küçük hediyesi çok ince bir düşünce.",
                "Ürün tam beklediğim gibi geldi.",
                "Paketleme çok sağlamdı, kırılmadan ulaştı.",
                "Kurulumu çok kolaydı, 10 dakikada bitti.",
                "Renkleri çok canlı ve kaliteli.",
                "Müşteri hizmetleri çok ilgiliydi.",
                "Kullanımı çok pratik, hayat kurtarıcı."
            ],
            suggestions: [
                "Kurulum kılavuzuna karekod (QR) ekleyerek videolu anlatıma yönlendirin.",
                "Ürün görsellerini gün ışığında çekerek renk tonunu daha net yansıtın.",
                "Fermuar tedarikçisini değiştirerek YKK gibi daha kaliteli markalara yönelin.",
                "Paket içeriğine yedek vida ekleyerek eksik parça şikayetlerini önleyin."
            ],
            marketingOpportunities: [
                "Müşterilerin en çok övdüğü 'Hızlı Kargo' özelliğini reklamlarda başlık olarak kullanın.",
                "'Fiyat/Performans' vurgusu yaparak ekonomik çözüm arayan kitleyi hedefleyin.",
                "Kullanıcı deneyimi videolarını (UGC) sosyal medyada paylaşarak güven oluşturun.",
                "Şık tasarım vurgusu ile Instagram odaklı görsel reklamlar çıkın."
            ],
            prSummary: "Markamız, kullanıcılar tarafından özellikle 'Fiyat/Performans' ve 'Tasarım' konularında tam not almıştır. Müşterilerimizin %65'i olumlu deneyim bildirirken, operasyonel süreçlerdeki hızımız takdir toplamıştır. Geri bildirimler ışığında montaj ve paketleme süreçlerimizi daha da iyileştirerek müşteri memnuniyetini %100'e taşımayı hedefliyoruz."
        };

        return NextResponse.json({
            success: true,
            data: analysis
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
