import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { orderId } = await req.json(); // Hangi sipariş gönderilecek?

  // 1. Sipariş ve Sürat Kargo Ayarlarını Çek
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
  const { data: config } = await supabase.from('cargo_connections').select('*').eq('provider', 'Surat').single();

  if (!order || !config) return NextResponse.json({ error: "Sipariş veya Kargo Ayarı Yok" }, { status: 400 });

  // 2. XML Şablonunu Hazırla (Dökümandan Alındı)
  // Ödeme Tipi: 1 (Gönderici Öder), 2 (Alıcı Öder). Biz Gönderici (1) varsayıyoruz.
  // Kargo Türü: 1 (Koli)
  
  const xmlData = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <GonderiyiKargoyaGonder xmlns="http://tempuri.org/">
        <KullaniciAdi>${config.username}</KullaniciAdi>
        <Sifre>${config.password}</Sifre>
        <Gonderi>
          <KisiKurum>${order.customer_name.substring(0, 50)}</KisiKurum>
          <AliciAdresi>${order.raw_data?.shipmentAddress?.fullAddress?.substring(0, 200) || "Adres Yok"}</AliciAdresi>
          <Il>${order.raw_data?.shipmentAddress?.city || "Istanbul"}</Il>
          <Ilce>${order.raw_data?.shipmentAddress?.district || "Merkez"}</Ilce>
          <TelefonCep>${order.raw_data?.shipmentAddress?.phone || ""}</TelefonCep>
          <AliciKodu>${order.id}</AliciKodu> 
          <KargoTuru>1</KargoTuru>
          <Odemetipi>1</Odemetipi>
          <IrsaliyeSeriNo>1</IrsaliyeSeriNo>
          <IrsaliyeSiraNo>${order.id}</IrsaliyeSiraNo>
          <ReferansNo>${order.id}</ReferansNo>
          <OzelKargoTakipNo>${order.id}</OzelKargoTakipNo>
          <Adet>1</Adet>
          <BirimDesi>${order.desi || 1}</BirimDesi>
          <BirimKg>${order.desi || 1}</BirimKg>
          <KargoIcerigi>Mobilya</KargoIcerigi>
          <KapidanOdemeTahsilatTipi>0</KapidanOdemeTahsilatTipi>
          <KapidanOdemeTutari>0</KapidanOdemeTutari>
          <WebUserName>${config.username}</WebUserName>
          <WebPassword>${config.password}</WebPassword>
        </Gonderi>
      </GonderiyiKargoyaGonder>
    </soap:Body>
  </soap:Envelope>`;

  try {
    // 3. Sürat Kargo'ya Gönder
    const response = await fetch("http://www.suratkargo.com.tr/GonderiWebServiceGercek/service.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/GonderiyiKargoyaGonder"
      },
      body: xmlData,
      cache: 'no-store'
    });

    const xmlResponse = await response.text();
    
    // 4. Cevabı Çözümle (XML -> JSON)
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlResponse);
    
    // Cevap Yolu: Envelope -> Body -> GonderiyiKargoyaGonderResponse -> GonderiyiKargoyaGonderResult
    const resultMsg = jsonObj['soap:Envelope']?.['soap:Body']?.['GonderiyiKargoyaGonderResponse']?.['GonderiyiKargoyaGonderResult'];

    // Sürat Kargo Başarılıysa "Basarili" veya Takip No döner. Hata ise "Hata: ..." döner.
    if (resultMsg && !resultMsg.includes("Hata") && !resultMsg.includes("Basarisiz")) {
        
        // Başarılı! Veritabanını güncelle.
        // Not: Sürat bazen direkt takip no dönmez, "İşlem Başarılı" der. Takip noyu sipariş no olarak kabul edebiliriz veya servisten dönerse onu alırız.
        // Biz şimdilik başarı mesajı aldıysak, siparişi "Kargolandı" yapıp, takip no olarak sipariş numarasını (veya dönen veriyi) işleyelim.
        
        // Gerçek takip numarasını yakalamaya çalışalım (Genelde resultMsg içinde olur)
        // Eğer resultMsg sadece "Başarılı" ise, takip no sipariş numaramızla eşleşir.
        const trackingNo = resultMsg.length < 50 ? resultMsg : order.id; 

        await supabase.from('orders').update({
            status: 'Kargoda',
            cargo_tracking_number: trackingNo,
            cargo_provider_name: 'Sürat Kargo'
        }).eq('id', orderId);

        return NextResponse.json({ success: true, message: "Kargo Kaydı Açıldı!", tracking: trackingNo });

    } else {
        return NextResponse.json({ error: "Sürat Kargo Hatası", details: resultMsg }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: "Sunucu Hatası", details: error.message }, { status: 500 });
  }
}