import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { productName, platform, goal, tone } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 2000));

        let primaryText = "";
        let headline = "";
        let hashtags: string[] = [];
        let storyOverlays: string[] = [];

        const emojis = tone === 'Coşkulu' ? "🔥🚀✨" : tone === 'Samimi' ? "😊🏡💙" : "✅📈💼";

        if (platform === 'instagram_feed') {
            if (goal === 'sales') {
                primaryText = `${productName} ile yaşam alanınızı dönüştürmeye hazır mısınız? ${emojis}\n\nSınırlı süre için geçerli indirim fırsatlarını kaçırmayın. Şıklık ve konfor bir arada.\n\n👇 Hemen profildeki linke tıklayın ve inceleyin!\n\n#${productName.replace(/\s/g, "")} #indirim #fırsat`;
            } else {
                primaryText = `Bu tasarıma bayılacaksınız! 😍\n\n${productName}, detaylarıyla fark yaratıyor. Sizce de harika değil mi? Yorumlarda düşüncelerinizi bekliyoruz. 👇\n\n#dekorasyon #tasarım #trend`;
            }
            hashtags = ["#kesfet", "#fyp", "#trend", "#mobilya", "#dekorasyon"];
        }
        else if (platform === 'instagram_story') {
            storyOverlays = [
                "🔥 GÜNÜN FIRSATI",
                `${productName}`,
                "%20 İNDİRİM",
                "👆 YUKARI KAYDIR"
            ];
            primaryText = "Story için hazır metin katmanları.";
        }
        else if (platform === 'facebook_ads') {
            primaryText = `Evinizin İhtiyacı Olan Şıklık: ${productName} ${emojis}\n\nDayanıklı malzemesi ve modern tasarımıyla şimdi avantajlı fiyatlarla Trendyol mağazamızda. Kargo bedava fırsatını yakalayın.`;
            headline = `${productName} - Şimdi %20 İndirimli!`;
            hashtags = ["#FacebookFırsatları", "#Trendyol"];
        }

        return NextResponse.json({
            success: true,
            data: {
                primaryText,
                headline,
                hashtags,
                storyOverlays
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
