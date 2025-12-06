import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Supabase Kurulumu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// YARDIMCI: Basic Auth Header Oluşturucu
function getAuthHeader(key: string, secret: string) {
    return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

export async function POST(request: Request) {
    console.log("🔵 WooCommerce POST İsteği Başladı...");
    
    try {
        // 1. Frontend'den gelen veriyi al
        const body = await request.json();
        const { account_id, product } = body;

        console.log("📦 Gelen Veri:", { account_id, productName: product?.name });

        if (!account_id || !product) {
            return NextResponse.json({ success: false, error: "Eksik Veri: account_id veya product yok." }, { status: 400 });
        }

        // 2. Veritabanından Mağaza Bilgilerini Çek
        const { data: account, error } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('id', account_id)
            .single();

        if (error || !account) {
            console.error("❌ Mağaza Bulunamadı:", error);
            return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
        }

        // 3. WooCommerce API Hazırlığı (Manuel Fetch)
        // URL sonundaki slash'i temizle ve API yolunu ekle
        const baseUrl = account.store_url?.replace(/\/$/, ""); 
        const apiUrl = `${baseUrl}/wp-json/wc/v3/products`;
        
        const authHeader = getAuthHeader(account.api_key, account.api_secret);

        console.log("🚀 WooCommerce'e İstek Atılıyor:", apiUrl);

        // 4. İsteği Gönder (Kütüphanesiz, Saf Fetch)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "User-Agent": "OrtakBarkod/1.0"
            },
            body: JSON.stringify({
                name: product.name || "İsimsiz Ürün",
                type: "simple",
                regular_price: product.price ? String(product.price) : undefined,
                description: product.description || "",
                short_description: product.short_description || "",
                sku: product.sku || product.barcode || "",
                manage_stock: true,
                stock_quantity: Number(product.stock) || 0,
                status: "publish"
            })
        });

        // 5. Yanıtı Oku (Text olarak alıp kontrol edeceğiz)
        const responseText = await response.text();
        console.log("📩 WooCommerce Yanıtı (Ham):", responseText.substring(0, 100) + "..."); // İlk 100 karakteri gör

        if (!response.ok) {
            console.error("❌ WooCommerce Hatası:", responseText);
            // Eğer yanıt boşsa varsayılan mesaj dön
            const errorMessage = responseText || `WooCommerce Sunucu Hatası: ${response.status}`;
            return NextResponse.json({ success: false, error: errorMessage }, { status: response.status });
        }

        if (!responseText) {
            console.error("❌ Boş Yanıt Geldi!");
            return NextResponse.json({ success: false, error: "WooCommerce'den boş yanıt geldi." }, { status: 500 });
        }

        // 6. JSON'a Çevir ve Gönder
        const data = JSON.parse(responseText);
        console.log("✅ Ürün Başarıyla Oluşturuldu ID:", data.id);
        
        return NextResponse.json({ success: true, product: data });

    } catch (error: any) {
        console.error("🔥 Kritik Server Hatası:", error);
        return NextResponse.json({ success: false, error: error.message || "Bilinmeyen sunucu hatası" }, { status: 500 });
    }
}

// GET Metodu (Siparişleri çekmek için - Aynen kalabilir veya güncelleyebilirsin)
export async function GET(request: Request) {
    // ... (Mevcut GET kodların buraya)
    // Eğer GET'te sorun yoksa burayı ellemene gerek yok.
    return NextResponse.json({ success: true, message: "GET çalışıyor" });
}

// PUT Metodu (Güncelleme için - Saf Fetch Versiyonu)
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { account_id, product_id, data: updateData } = body;

        const { data: account } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('id', account_id)
            .single();

        if (!account) return NextResponse.json({ error: "Mağaza yok" }, { status: 404 });

        const baseUrl = account.store_url?.replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/products/${product_id}`, {
            method: 'PUT',
            headers: {
                "Authorization": getAuthHeader(account.api_key, account.api_secret),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateData)
        });

        const resJson = await response.json();
        return NextResponse.json({ success: true, data: resJson });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}