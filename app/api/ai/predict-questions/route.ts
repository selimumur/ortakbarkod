import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { productName, category } = await request.json();

        // SIMULATED AI LATENCY
        await new Promise(resolve => setTimeout(resolve, 2500));

        // MOCK Q&A DATA (20 Questions)
        const qaList = [
            // GENEL / SATIŞ
            { q: "Bu ürünün garantisi var mı?", a: "Evet, tüm ürünlerimiz 2 yıl resmi distribütör garantilidir. Faturanız garanti belgesi yerine geçer.", cat: "Genel", note: "Güven vermek için garanti süresini net belirtin." },
            { q: "Hangi kargo firmasıyla çalışıyorsunuz?", a: "Siparişlerinizi özenle paketleyip Aras Kargo veya Yurtiçi Kargo ile sigortalı olarak gönderiyoruz.", cat: "Lojistik", note: "Kargo firması tercihi müşteride güven oluşturur." },
            { q: "Ürün orijinal mi?", a: "Mağazamız yetkili satıcıdır. Tüm ürünlerimiz %100 orijinal, faturalı ve kapalı kutudur.", cat: "Güven", note: "Orijinallik vurgusu pazaryerlerinde kritiktir." },
            { q: "Hediye paketi yapıyor musunuz?", a: "Evet, sipariş notu kısmına belirtirseniz özel hediye paketi ve notunuzla birlikte hazırlayabiliriz.", cat: "Ek Hizmet", note: "Hediye seçeneği dönüşümü artırır." },

            // TEKNİK / DETAY
            { q: "Ürün boyutları nedir?", a: "Ürün ölçüleri görselde detaylı belirtilmiştir. Tam ebatlar: En: 30cm, Boy: 50cm, Yükseklik: 10cm'dir.", cat: "Teknik", note: "Ölçü iadelerin %30 sebebidir, net olun." },
            { q: "Kurulum gerekiyor mu?", a: "Ürün demonte olarak gönderilmektedir. Kutu içerisinden gerekli tüm kurulum malzemeleri ve şeması çıkmaktadır. Sadece tornavida yeterlidir.", cat: "Kurulum", note: "Kolay kurulum vurgusu satışı hızlandırır." },
            { q: "Makinede yıkanabilir mi?", a: "Evet, 30 derecede hassas programda yıkanabilir. Uzun ömürlü kullanım için kurutma makinesi önerilmez.", cat: "Bakım", note: "Kullanım talimatı soruları çok gelir." },
            { q: "Hangi malzemeden üretildi?", a: "Birinci sınıf, kanserojen madde içermeyen %100 doğal ahşap/pamuk malzemeden üretilmiştir.", cat: "Materia", note: "Sağlık vurgusu yapın." },
            { q: "Renk görseldeki ile birebir aynı mı?", a: "Stüdyo çekimlerinde ışık kaynaklı ton farkı olabilir ancak görseldeki ürünün birebir aynısı gönderilecektir.", cat: "Görsel", note: "Ton farkı uyarısı iadeyi engeller." },
            { q: "Kaç günde kargoya verilir?", a: "Saat 15:00'e kadar verilen siparişler aynı gün, diğerleri ertesi gün kargoya teslim edilir.", cat: "Lojistik", note: "Hız vurgusu rekabet avantajıdır." },

            // İADE / SORUN
            { q: "Ürün hasarlı gelirse ne yapmalıyım?", a: "Kargo tutanağı tutturmanız gerekmez. Bize fotoğraf iletmeniz durumunda sorgusuz sualsiz yeni parça veya ürün gönderimi yapıyoruz.", cat: "İade/Destek", note: "Müşteri tarafında olmanız güveni 2 katına çıkarır." },
            { q: "İade süreci nasıl işliyor?", a: "Trendyol asistan üzerinden iade kodu alarak 15 gün içinde ücretsiz olarak iade edebilirsiniz.", cat: "İade", note: "Yasal hakkı hatırlatın." },

            // ÜRÜNE ÖZEL (Mock)
            { q: "Bu modelin siyah rengi var mı?", a: "Mağaza sayfamızda 'Black Serisi' olarak diğer renk seçeneklerimizi görüntüleyebilirsiniz.", cat: "Varyasyon", note: "Çapraz satış fırsatı." },
            { q: "İndirim olacak mı?", a: "Şu an kampanyalı lansman fiyatımızdır. Stoklar tükenmeden değerlendirmenizi öneririz.", cat: "Fiyat", note: "Aciliyet hissi yaratın." },
            { q: "Yedek parça temin edebilir misiniz?", a: "Evet, üretici firma olduğumuz için ömür boyu yedek parça desteğimiz mevcuttur.", cat: "Destek", note: "Üretici olduğunuzu vurgulayın." },
            { q: "Paket içeriğinde piller dahil mi?", a: "Güvenlik prosedürleri gereği piller paket içeriğine dahil değildir.", cat: "İçerik", note: "Hayal kırıklığını önleyin." },
            { q: "Toplu alımda indirim var mı?", a: "10 adet ve üzeri kurumsal alımlarınız için bize 'Satıcıya Sor' kısmından ulaşabilirsiniz.", cat: "B2B", note: "Toptan satış kapısı." },
            { q: "Ürün kaç kg ağırlığında?", a: "Paketlenmiş ağırlığı yaklaşık 2.5 kg'dır.", cat: "Teknik", note: "Taşınabilirlik sorusu." },
            { q: "Dış mekan kullanımına uygun mu?", a: "Suya ve neme dayanıklı yapısı sayesinde balkon ve bahçe kullanımına uygundur.", cat: "Kullanım", note: "Kullanım alanı genişletin." },
            { q: "Montaj hizmeti var mı?", a: "Montaj hizmetimiz yoktur ancak kurulumu 10 dakikada herkesin yapabileceği kadar basittir.", cat: "Hizmet", note: "Eksikliği avantaja çevirin." }
        ];

        return NextResponse.json({
            success: true,
            data: qaList
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
