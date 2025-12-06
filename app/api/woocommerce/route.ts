import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// 1. DÜZELTME: Service Role Key kullanımı (Admin Yetkisi)
// Backend işlemlerinde RLS engeline takılmamak için bu şarttır.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

// YARDIMCI: Basic Auth Header Oluşturucu
function getAuthHeader(key: string, secret: string) {
    return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

// ---------------------------------------------------------------------------
// 1. GET METODU (WooCommerce'den Ürünleri Listelemek/Çekmek İçin)
// Kullanımı: /api/woocommerce?account_id=123
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const account_id = searchParams.get('account_id');

        if (!account_id) {
            return NextResponse.json({ success: false, error: "account_id parametresi gerekli" }, { status: 400 });
        }

        // Mağaza Bilgilerini Çek
        const { data: account, error } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('id', account_id)
            .single();

        if (error || !account) {
            return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
        }

        // URL Hazırla (Hem base_url hem store_url kontrolü)
        const dbBaseUrl = account.base_url || account.store_url; 
        if (!dbBaseUrl) {
             return NextResponse.json({ success: false, error: "Mağaza URL'si eksik" }, { status: 400 });
        }
        const baseUrl = dbBaseUrl.replace(/\/$/, "");

        const apiUrl = `${baseUrl}/wp-json/wc/v3/products?per_page=50`;
        const authHeader = getAuthHeader(account.api_key, account.api_secret);

        console.log("📥 WooCommerce'den Ürünler Çekiliyor:", apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "User-Agent": "OrtakBarkod/1.0"
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ success: false, error: `WooCommerce Hatası: ${response.status} - ${errText}` }, { status: response.status });
        }

        const products = await response.json();
        
        return NextResponse.json({ 
            success: true, 
            count: products.length,
            products: products 
        });

    } catch (error: any) {
        console.error("🔥 GET Hatası:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// 2. POST METODU (WooCommerce'e Yeni Ürün Göndermek İçin)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
    console.log("🔵 WooCommerce POST İsteği Başladı...");
    
    try {
        const body = await request.json();
        const { account_id, product } = body;

        if (!account_id || !product) {
            return NextResponse.json({ success: false, error: "Eksik Veri: account_id veya product yok." }, { status: 400 });
        }

        const { data: account, error } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('id', account_id)
            .single();

        if (error || !account) {
            return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
        }

        const dbBaseUrl = account.base_url || account.store_url; 
        if (!dbBaseUrl) return NextResponse.json({ success: false, error: "URL eksik" }, { status: 400 });
        const baseUrl = dbBaseUrl.replace(/\/$/, "");
        
        const apiUrl = `${baseUrl}/wp-json/wc/v3/products`;
        const authHeader = getAuthHeader(account.api_key, account.api_secret);

        console.log("🚀 WooCommerce'e Ürün Gönderiliyor:", apiUrl);

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
                status: "publish" // Taslak yerine direkt yayına alıyoruz
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error("❌ WooCommerce Hatası:", responseText);
            return NextResponse.json({ success: false, error: responseText }, { status: response.status });
        }

        const data = JSON.parse(responseText);
        console.log("✅ Ürün Başarıyla Oluşturuldu ID:", data.id);
        
        return NextResponse.json({ success: true, product: data });

    } catch (error: any) {
        console.error("🔥 Kritik Server Hatası:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// 3. PUT METODU (WooCommerce'deki Ürünü Güncellemek İçin)
// ---------------------------------------------------------------------------
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

        const dbBaseUrl = account.base_url || account.store_url; 
        const baseUrl = dbBaseUrl?.replace(/\/$/, "");

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