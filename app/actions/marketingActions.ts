'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";

// --- TYPES ---

export type CompetitorAnalysisResult = {
    score: number;
    metrics: {
        followers: number;
        productCount: number;
        reviewAvg: number;
        responseSpeed: string;
    };
    aiSuggestion: string;
    swot: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
};

export type OpportunityItem = {
    name: string;
    reason: string;
    action: string;
    type: 'opportunity' | 'warning';
    metric?: string;
};

export type MarketingProduct = {
    id: number;
    name: string;
    price: number;
    cost_price: number | null;
    stock: number;
    image_url: string | null;
    description: string | null;
};

// --- ACTIONS ---

// 1. Get Products for tools (Simulator, Content, etc.)
export async function getMarketingProductsAction() {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('master_products')
        .select('id, name, price:sale_price, cost_price, stock, image_url, description')
        .eq('organization_id', userId)
        .order('name')
        .limit(50); // Limit for performance in dropdowns

    return (data || []) as MarketingProduct[];
}

// 2. Competitor Analysis (Simulated)
export async function analyzeCompetitorAction(url: string) {
    // In a real app, this would trigger a scraping job.
    // Here we simulate a realistic response.

    await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

    const score = Math.floor(Math.random() * 20) + 70; // 70-90

    return {
        score,
        metrics: {
            followers: Math.floor(Math.random() * 50000) + 1000,
            productCount: Math.floor(Math.random() * 500) + 50,
            reviewAvg: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
            responseSpeed: "15-30 dk"
        },
        aiSuggestion: "Rakibin çapraz satış kurguları çok güçlü ancak 'Outdoor' kategorisinde stok derinliği zayıf. Bu kategoriye odaklanarak pazar payı çalabilirsiniz.",
        swot: {
            strengths: ["Yüksek müşteri sadakati", "Hızlı kargo operasyonu"],
            weaknesses: ["Kısıtlı ürün varyasyonu", "Zayıf sosyal medya etkileşimi"],
            opportunities: ["Benzer ürünlerde fiyat avantajı sağlayabilirsiniz", "Bundle (Set) satışları deneyin"],
            threats: ["Agresif indirim kampanyaları", "Platform içi reklam bütçesi yüksek"]
        }
    } as CompetitorAnalysisResult;
}

// 3. Sales Booster (Real Scan of Products)
export async function getSalesBoosterInsightsAction() {
    const { userId } = await auth();
    if (!userId) return { seo: [], opportunities: [], buybox: [] };

    const supabase = getSupabaseAdmin();
    const { data: products } = await supabase
        .from('master_products')
        .select('id, name, description, stock, sale_price')
        .eq('organization_id', userId)
        .limit(50);

    const seoIssues: OpportunityItem[] = [];
    const opportunities: OpportunityItem[] = [];

    if (products) {
        products.forEach(p => {
            // SEO Check
            if (!p.description || p.description.length < 50) {
                seoIssues.push({
                    name: p.name,
                    reason: "Açıklama çok kısa veya yok.",
                    action: "SEO Uyumlu Açıklama Yaz",
                    type: "warning"
                });
            }

            // Opportunity Check
            if (p.stock > 50 && (!p.sale_price || p.sale_price < 100)) {
                opportunities.push({
                    name: p.name,
                    reason: "Yüksek stok, düşük fiyat.",
                    action: "Bundle Kampanya Yap",
                    type: "opportunity",
                    metric: `${p.stock} Stok`
                });
            }
        });
    }

    // Mock Buybox (since we don't have competitor price data)
    const buybox = [
        { name: "Örnek Ürün A", myPrice: 100, winPrice: 95, diff: -5 },
        { name: "Örnek Ürün B", myPrice: 250, winPrice: 249, diff: -1 }
    ];

    return { seo: seoIssues, opportunities, buybox };
}

// 4. AI Generator (Content, Social, Visual)
export async function generateMarketingContentAction(type: 'content' | 'social' | 'visual', params: any) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (type === 'content') {
        return {
            title: `Harika Bir ${params.productName} İçin Hazır Mısınız?`,
            description: `<p>Yeni sezona damgasını vuran <strong>${params.productName}</strong> ile tanışın. ${params.keywords} özellikleri ile hayatınızı kolaylaştıracak.</p><ul><li>Dayanıklı malzeme</li><li>Şık tasarım</li></ul>`,
            tags: ["Trend", "YeniSezon", "Tavsiye"],
            critique: [{ text: "Başlık çok ilgi çekici", type: "success" }, { text: "Daha fazla teknik detay eklenebilir", type: "info" }]
        };
    }

    if (type === 'social') {
        return {
            caption: `🚀 ${params.productName} ile tarzını yansıt! ${params.tone} bir görünüm için hemen tıkla. #kesfet #trend`,
            hashtags: "#style #new #fashion"
        };
    }

    if (type === 'visual') {
        return [
            {
                title: "Minimalist Stüdyo",
                visuals: "Soft box ışıklandırma, gölgesiz",
                scene: "Beyaz sonsuz fon, yanında tek bir monstera yaprağı",
                palette: "Pastel tonlar, Beyaz, Bej",
                headline: "Sade ve Şık."
            },
            {
                title: "Lifestyle (Kullanım)",
                visuals: "Doğal gün ışığı (Golden Hour)",
                scene: "Modern bir sehpa üzerinde, yanında kahve fincanı",
                palette: "Sıcak tonlar, Ahşap kahvesi",
                headline: "Hayatın İçinden."
            }
        ];
    }
}

// 5. Competitor Ad Analysis (Simulated)
export async function competitorAdAnalysisAction(brandOrLink: string) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Fake delay

    return {
        brandName: brandOrLink,
        summary: `${brandOrLink} markası, duygusal bağ kurmaya odaklanan "Lifestyle" içeriklerle öne çıkıyor. Özellikle Instagram Reels ve TikTok üzerinde viral sesleri kullanarak genç kitleyi hedefliyorlar. İndirim odaklı değil, değer odaklı bir iletişim dilleri var.`,
        adAnalysis: {
            messages: ["Hayatını Kolaylaştır", "Doğal ve Sürdürülebilir", "Senin Tarzın, Senin Kuralların"],
            tone: "Samimi, Enerjik ve İlham Verici",
            channels: ["Instagram", "TikTok", "YouTube Shorts"]
        },
        creativeAnalysis: {
            style: "Minimalist ve Pastel Tonlar",
            visuals: "Ürün odaklı değil, kullanım anı (context) odaklı görseller.",
            videoStrategy: "UGC (Kullanıcı Tarafından Oluşturulan İçerik) tarzı, kurgulanmamış gibi duran videolar."
        },
        audience: {
            primary: "Z Kuşağı ve Genç Y-Kuşağı (18-35 Yaş)",
            interests: ["Sürdürülebilirlik", "Teknoloji", "Fitness", "Kişisel Gelişim"],
            painPoints: "Karmaşık ürün kullanımı ve yüksek fiyat algısı."
        },
        campaignRhythm: "Her ayın 15'i ile 25'i arası 'Maaş Dönemi' kampanyaları yoğunlaşıyor.",
        opportunities: [
            "Rakip, video içeriklerde altyazı kullanmıyor; siz kullanarak sessiz izleyenleri yakalayabilirsiniz.",
            "Müşteri yorumlarına geç dönüş yapıyorlar, hızlı yanıt ile fark yaratabilirsiniz.",
            "Pinterest tarafında hiç aktif değiller, oradaki boşluğu doldurabilirsiniz."
        ],
        swot: {
            strengths: ["Güçlü marka hikayesi", "Yüksek etkileşim oranları"],
            weaknesses: ["Yavaş kargo süreçleri (şikayetlerde görünüyor)", "Sınırlı ödeme seçenekleri"],
            opportunities: ["Benzer ürünlerde 'Hızlı Teslimat' vurgusu yapabilirsiniz.", "Bundle (Set) teklifleri ile sepet tutarını artırabilirsiniz."],
            threats: ["Pazara yeni giren global oyuncular", "Reklam maliyetlerinin artması"]
        },
        actionPlan: [
            "Rakibin kullanmadığı 'Eğitici/Nasıl Yapılır' içerik serisine başlayın.",
            "Reklam metinlerinizde 'Hızlı Kargo' ve '7/24 Destek' vurgusu yapın.",
            "Mikro-influencer işbirlikleri ile güven inşa edin.",
            "Retargeting reklamlarında, sepeti terk edenlere özel %5 indirim kuponu sunun."
        ]
    };
}

// 6. Q&A Prediction (Simulated)
export async function predictQuestionsAction(productName: string, category: string) {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

    return [
        {
            q: "Bu ürün su geçirmez özelliğe sahip mi?",
            a: `Merhaba! Evet, ${productName} ürünümüz su itici özelliğe sahip kumaştan üretilmiştir. Hafif yağmurlarda güvenle kullanabilirsiniz ancak sağanak yağışlar için tam koruma garantisi vermiyoruz.`,
            cat: "Özellikler",
            note: "Müşteriler genelde 'su geçirmez' ile 'su itici' kavramını karıştırır, net olun."
        },
        {
            q: "Hangi kargo firması ile gönderim yapıyorsunuz?",
            a: "Siparişlerinizi Trendyol Express veya Aras Kargo güvencesiyle gönderiyoruz. Bölgenize göre en hızlı teslimat yapacak firmayı sistem otomatik seçmektedir.",
            cat: "Teslimat",
            note: "Kargo firması sorusu iptal/iade oranını etkileyebilir, güven verin."
        },
        {
            q: "Ürünün garanti süresi ne kadar?",
            a: "Tüm ürünlerimiz 2 yıl resmi distribütör garantilidir. Faturanız garanti belgesi yerine geçmektedir.",
            cat: "Garanti",
            note: "Garanti süresi satış dönüşümünü %15 artırır."
        },
        {
            q: "Paketleme gizli mi yapılıyor?",
            a: "Evet, tüm gönderilerimiz içeriği belli olmayacak şekilde, logusuz ve kapalı kutularda gönderilmektedir. Gizliliğinize önem veriyoruz.",
            cat: "Paketleme",
            note: "Hassas kategorilerde bu soru çok kritiktir."
        },
        {
            q: "Ürün rengi görseldeki ile birebir aynı mı?",
            a: "Stüdyo çekimlerindeki ışık farkından dolayı tonlarda çok ufak farklılıklar olabilir ancak görseldeki ürünün aynısı gönderilmektedir.",
            cat: "Görsel",
            note: "İade sebeplerinin %20'si renk farkıdır, dürüst olun."
        }
    ];
}

// 7. Product Image Audit (Simulated)
export async function auditProductImageAction(imageUrl: string) {
    await new Promise(resolve => setTimeout(resolve, 2500)); // Fake delay

    // Random score for simulation
    const score = Math.floor(Math.random() * 30) + 65; // 65-95

    return {
        score,
        imageUrl,
        analysis: {
            lighting: { status: "İyi", msg: "Işıklandırma dengeli, gölgeler yumuşak." },
            color: { status: "Orta", msg: "Renk doygunluğu biraz düşük." },
            reflection: { status: "İyi", msg: "Rahatsız edici yansıma yok." },
            ambiance: { status: "Kötü", msg: "Arka plan ürünün önüne geçiyor." },
            luxury: { status: "Orta", msg: "Premium algısı geliştirilebilir." }
        },
        issues: [
            "Ürün kadrajda çok küçük kalmış (%15 boşluk fazla).",
            "Beyaz dengesi (White Balance) sıcak tonlara kaymış.",
            "Çözünürlük e-ticaret için sınırda (1000px altı)."
        ],
        suggestions: [
            "Ürünü merkeze alarak %20 oranında crop (kırpma) yapın.",
            "Kontrastı artırarak ürün detaylarını belirginleştirin.",
            "Arka planı tamamen beyaz veya nötr gri yapın."
        ],
        concepts: [
            { vibe: "MINIMALIST", title: "Sessiz Lüks", desc: "Monokrom renkler, sert gölgeler, mermer zemin." },
            { vibe: "ENERJİK", title: "Pop Art", desc: "Canlı zıt renkli arka planlar, sert ışık." },
            { vibe: "DOĞAL", title: "Organik Dokunuş", desc: "Ahşap ve bitki öğeleriyle soft aydınlatma." },
            { vibe: "FÜTÜRİSTİK", title: "Neon Cyber", desc: "Karanlık mod, neon mor ve mavi ışıklar." },
            { vibe: "STUDIO", title: "Klasik Katalog", desc: "Tam beyaz fon, çok açılı aydınlatma." }
        ]
    };
}

// 8. Cargo Protection Plan (Simulated)
export async function getCargoProtectionPlanAction(productType: string, material: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulation logic based on input
    let risk = "Düşük";
    if (material === "Seramik/Cam" || material === "Elektronik") risk = "Yüksek";

    return {
        riskLevel: risk,
        prediction: risk === "Yüksek" ? "%94 Hasarsız Teslimat" : "%99 Hasarsız Teslimat",
        packaging: {
            box: risk === "Yüksek" ? "Çift Oluklu Mukavva (BC Dalga)" : "Tek Oluklu Kutu",
            filler: risk === "Yüksek" ? "Balonlu Naylon + Hava Yastığı" : "Kağıt Dolgu",
            tape: "Akrilik Bant (Çapraz)"
        },
        costEfficiency: risk === "Yüksek" ? "Orta" : "Yüksek",
        steps: [
            "Ürünü balonlu naylon ile 2 kat sarın.",
            "Kutu tabanına strafor yerleştirin.",
            "Ürünü kutuya ortalayın.",
            "Boşlukları hava yastıkları ile doldurun.",
            "Kutuyu kapatıp H bantlama yapın.",
            "Kırılır etiketini 4 yüzeye yapıştırın.",
            "Kargo firmasına 'Hassas Taşıma' kodu ile teslim edin.",
            "Sigorta poliçesini kontrol edin.",
            "Müşteriye paketleme videosu gönderin (Opsiyonel).",
            "Teslimat onayını takip edin."
        ]
    };
}

// 9. Review Analysis (Simulated)
export async function analyzeReviewsAction(reviews: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simple keyword based simulation
    const sentimentScore = reviews.toLowerCase().includes("kötü") || reviews.toLowerCase().includes("berbat") ? 45 : 82;

    return {
        sentiment: {
            score: sentimentScore,
            positive: sentimentScore > 50 ? 80 : 30,
            negative: sentimentScore > 50 ? 20 : 70
        },
        complaints: [
            "Kargo paketi özensizdi.",
            "Ürün rengi görselden farklı.",
            "Müşteri hizmetlerine ulaşamadım."
        ],
        likes: [
            "Ürün kalitesi beklediğimden iyi.",
            "Hızlı kargo için teşekkürler.",
            "Fiyat/Performans ürünü."
        ],
        suggestions: [
            "Paketlemeye 'Kırılır' etiketi ekleyin.",
            "Ürün görsellerini doğal ışıkta güncelleyin."
        ],
        marketingOpportunities: [
            "Olumlu yorumları sosyal medyada paylaşın (Social Proof).",
            "Şikayet edenlere %5 özür kuponu tanımlayın."
        ],
        prSummary: "Genel algı olumlu yönde ilerliyor ancak lojistik kaynaklı şikayetler marka imajını zedeliyor. Hızlı aksiyon alınırsa sadakat artırılabilir."
    };
}
