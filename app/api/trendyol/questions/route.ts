import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Node.js HTTPS ile SSL Hatası Olmadan Bağlanma
function fetchWithNode(url: string, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        ...headers,
        "Accept": "application/json",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "keep-alive",
      },
      rejectUnauthorized: false, // SSL Hatalarını Yoksay
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => { 
        data += chunk; 
      });
      
      res.on('end', () => {
        try {
          // Güvenlik duvarı kontrolü
          if (data.includes("<!DOCTYPE html>") || data.includes("cloudflare") || data.includes("Access Denied")) {
            reject(new Error("Güvenlik Duvarı Engellendi"));
            return;
          }
          
          if (res.statusCode === 401) {
            reject(new Error(`Trendyol API Yetkilendirme Hatası (401): API Key veya Secret yanlış olabilir`));
            return;
          }
          
          if (res.statusCode === 403) {
            reject(new Error(`Trendyol API Erişim Reddedildi (403): Güvenlik duvarı veya IP engeli`));
            return;
          }
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } else {
            reject(new Error(`Trendyol API Hatası (${res.statusCode}): ${data.substring(0, 200)}`));
          }
        } catch (e: any) {
          reject(new Error(`JSON Parse Hatası: ${e.message}. Response: ${data.substring(0, 200)}`));
        }
      });
    });
    
    req.on('error', (err: any) => {
      reject(new Error(`Bağlantı Hatası: ${err.message}. URL: ${url}`));
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Trendyol API bağlantı zaman aşımı (30 saniye)'));
    });
    
    req.end();
  });
}

export async function GET() {
  // DB Bağlantısı
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: config } = await supabase.from('marketplace_connections').select('*').eq('platform', 'Trendyol').eq('is_active', true).single();

  const supplierId = config?.supplier_id || process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = config?.api_key || process.env.TRENDYOL_API_KEY;
  const apiSecret = config?.api_secret || process.env.TRENDYOL_API_SECRET;

  if (!supplierId || !apiKey) {
    return NextResponse.json({ success: false, error: "API Eksik" }, { status: 500 });
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  
  const startDate = Date.now() - (14 * 24 * 60 * 60 * 1000);
  const endDate = Date.now();
  const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/questions/filter?startDate=${startDate}&endDate=${endDate}&size=50&orderByDirection=DESC`;

  try {
    console.log(`[Trendyol Questions API] Bağlantı deneniyor: ${supplierId}`);
    
    // Daha gerçekçi User-Agent
    const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
    
    const data = await fetchWithNode(url, {
      "Authorization": `Basic ${auth}`,
      "User-Agent": userAgent,
      "Content-Type": "application/json"
    });
    
    if (!data || !data.content || !Array.isArray(data.content)) {
      return NextResponse.json({ 
        success: false, 
        error: "Trendyol API beklenmeyen yanıt formatı", 
        details: "Soru listesi array olarak dönmedi" 
      }, { status: 500 });
    }
    
    console.log(`[Trendyol Questions API] ${data.content.length} soru alındı`);
    
    const cleanQuestions = data.content.map((q: any) => ({
      id: q.id,
      customer_name: q.userName || "Müşteri",
      product_name: q.productName || "Ürün",
      product_image: q.imageUrl || "",
      text: q.text || "",
      answer: q.answer ? q.answer.text : null,
      status: q.status === 'WAITING_FOR_ANSWER' ? 'Cevap Bekliyor' :
              q.status === 'ANSWERED' ? 'Cevaplandı' :
              q.status === 'REJECTED' ? 'Reddedildi' : 
              q.status === 'REPORTED' ? 'Raporlandı' : q.status || 'Bilinmiyor',
      created_date: q.creationDate ? new Date(q.creationDate).toISOString() : new Date().toISOString(),
      raw_data: q
    }));
    
    return NextResponse.json({ 
      success: true, 
      count: data.totalElements || cleanQuestions.length, 
      questions: cleanQuestions 
    });
    
  } catch (error: any) {
    console.error('[Trendyol Questions API] Hata:', error);
    return NextResponse.json({ 
      success: false,
      error: "Trendyol API Bağlantı Hatası", 
      details: error.message 
    }, { status: 500 });
  }
}