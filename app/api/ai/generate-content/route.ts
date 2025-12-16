import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { productName, tone, keywords } = await request.json();

        // SIMULATED AI GENERATION
        await new Promise(resolve => setTimeout(resolve, 2500));

        const adjectives = tone === 'Coşkulu' ? ['Harika', 'İnanılmaz', 'Muhteşem', 'Benzersiz'] : ['Kaliteli', 'Dayanıklı', 'Ergonomik', 'Profesyonel'];
        const selectedAdj = adjectives[Math.floor(Math.random() * adjectives.length)];


        const description = `
      <h2>${selectedAdj} ${productName}: Yaşam Alanınız İçin Mükemmel Seçim</h2>
      
      <p>Ev veya ofis dekorasyonunuzda fark yaratmak ister misiniz? <strong>${selectedAdj} ${productName}</strong>, estetik görünümü ve <strong>${tone}</strong> tasarımıyla beklentilerinizin ötesine geçiyor. ${keywords ? `Özellikle <em>${keywords}</em> arayışında olanlar için benzersiz bir çözüm sunuyor.` : ''} Hem fonksiyonel özellikleri hem de şıklığıyla, yaşam alanlarınıza modern bir dokunuş katmaya hazır.</p>

      <h3>🌟 Neden Bu Ürünü Seçmelisiniz?</h3>
      <p>Piyasadaki standart ürünlerin aksine, bu ürün kullanıcı deneyimi odaklı geliştirilmiştir. Dayanıklılık testlerinden tam not almış materyalleri ve ergonomik yapısı sayesinde uzun yıllar ilk günkü kalitesini korur.</p>

      <h3>💎 Öne Çıkan Özellikler</h3>
      <ul>
        <li>✅ <strong>Birinci Sınıf Malzeme Kalitesi:</strong> Çizilmelere ve darbelere karşı ekstra dirençli yüzey teknolojisi ile üretilmiştir.</li>
        <li>✅ <strong>Kolay ve Hızlı Kurulum:</strong> Karmaşık montaj şemalarıyla uğraşmanıza gerek yok. Sadece 5 dakikada kullanıma hazır hale gelir.</li>
        <li>✅ <strong>Modern ve Timeless Tasarım:</strong> Her türlü dekorasyon stiline (Modern, Klasik, Minimalist) mükemmel uyum sağlar.</li>
        <li>✅ <strong>Çevre Dostu Üretim:</strong> İnsan sağlığına zararlı madde içermez, E1 kalite standartlarına uygundur.</li>
        <li>✅ <strong>${keywords ? keywords.split(',')[0] : 'Fonksiyonel'} Yapı:</strong> Kullanım kolaylığı sağlayan detaylarla donatılmıştır.</li>
      </ul>

      <h3>🔧 Teknik Detaylar ve Kullanım</h3>
      <p>Ürünümüz, günlük yoğun kullanıma uygun olarak tasarlanmıştır. Temizliği oldukça pratiktir; nemli bir bezle silmeniz yeterlidir. Leke tutmayan özel kaplaması sayesinde temizlik sürenizi minimuma indirir.</p>

      <h3>📦 Paket İçeriği ve Teslimat</h3>
      <p>Ürününüz, kargoda zarar görmemesi için özel koruyucu ambalaj ile gönderilmektedir. Paket içerisinde kurulum için gerekli tüm aparatlar ve detaylı kurulum kılavuzu mevcuttur.</p>

      <p><strong>Evinize veya ofisinize değer katmak için daha fazla beklemeyin. ${selectedAdj} ${productName} ürününü şimdi sepetinize ekleyin!</strong></p>
    `;

        const critique = [
            { type: 'warning', text: 'Başlıkta "Ahşap" kelimesi geçmiyor, arama hacmi yüksek.' },
            { type: 'success', text: 'Özellik listesi (Bullet points) kullanımı çok iyi.' },
            { type: 'info', text: 'Açıklama metni 150 kelime daha uzun olabilir.' }
        ];

        return NextResponse.json({
            success: true,
            data: {
                title: `${selectedAdj} ${productName} - ${tone === 'Resmi' ? 'Premium Seri' : 'Hemen İncele!'}`,
                description: description.trim(),
                tags: ['Mobilya', 'Dekorasyon', 'Trendyol', ...keywords.split(',').map((k: string) => k.trim())],
                critique
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
