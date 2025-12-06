// lib/woocommerce.ts
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL veya Key eksik!");
  return createClient(url, key);
}

// 1. Dinamik WooCommerce İstemcisi
export async function getWooCommerceClient() {
  const supabase = getSupabaseAdmin();
  // Bağlantı ayarlarını çek
  const { data: config } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('platform', 'WooCommerce')
    .eq('is_active', true)
    .single();

  if (!config) throw new Error("Aktif WooCommerce bağlantısı yok!");

  let siteUrl = config.supplier_id;
  if (!siteUrl.startsWith("http")) siteUrl = "https://" + siteUrl;

  return new WooCommerceRestApi({
    url: siteUrl,
    consumerKey: config.api_key,
    consumerSecret: config.api_secret,
    version: "wc/v3"
  });
}

// 2. AKILLI ÜRÜN OLUŞTURMA (Önce Var mı Bak, Varsa Getir)
export async function createProductInWooCommerce(productData: any) {
  const api = await getWooCommerceClient();

  // Barkod yoksa ID'den üret
  const sku = productData.code || `OB-${productData.id}`;

  console.log(`[WooCommerce] SKU Kontrolü yapılıyor: ${sku}`);

  try {
    // 1. ADIM: SKU ile arama yap
    const checkRes = await api.get("products", { sku: sku });
    
    if (checkRes.data && checkRes.data.length > 0) {
      console.log(`[WooCommerce] Ürün zaten bulundu. ID: ${checkRes.data[0].id}`);
      // Bulunan ürünü sanki yeni oluşturmuşuz gibi döndür (Eşleşmeyi sağlar)
      return checkRes.data[0];
    }
  } catch (e) {
    console.warn("[WooCommerce] SKU kontrolü sırasında hata (Önemsiz, devam ediliyor):", e);
  }

  // 2. ADIM: Yoksa, gerçekten oluştur
  const wooPayload = {
    name: productData.name,
    type: "simple",
    regular_price: productData.price?.toString() || "0",
    description: productData.description || "",
    sku: sku,
    manage_stock: true,
    stock_quantity: productData.stock || 0,
  };

  try {
    console.log("[WooCommerce] Yeni ürün oluşturuluyor...");
    const response = await api.post("products", wooPayload);
    return response.data; 
  } catch (error: any) {
    // Son çare: Eğer hata "duplicate SKU" ise tekrar bulmayı dene
    if (error.response?.data?.code === 'product_invalid_sku' || error.response?.data?.message?.includes('SKU')) {
        console.log("[WooCommerce] Duplicate SKU hatası alındı, ürün tekrar aranıyor...");
        const retryRes = await api.get("products", { sku: sku });
        if (retryRes.data.length > 0) return retryRes.data[0];
    }
    
    console.error("[WooCommerce] Oluşturma Hatası:", error.response?.data);
    throw new Error(error.response?.data?.message || "WooCommerce tarafında bilinmeyen hata");
  }
}

// 3. FİYAT / STOK / İSİM GÜNCELLEME
export async function updateProductPriceInWoo(remoteId: string, data: { price?: number, stock?: number, name?: string }) {
  const api = await getWooCommerceClient();
  
  const payload: any = {};
  // Sadece değişenleri gönderiyoruz
  if (data.price !== undefined) payload.regular_price = data.price.toString();
  if (data.stock !== undefined) payload.stock_quantity = data.stock;
  if (data.name !== undefined) payload.name = data.name;

  console.log(`[WooCommerce] Güncelleniyor ID: ${remoteId}`, payload);

  try {
    const response = await api.put(`products/${remoteId}`, payload);
    return response.data;
  } catch (error: any) {
    console.error("[WooCommerce] Güncelleme Hatası:", error.response?.data);
    throw new Error(error.response?.data?.message || "Güncelleme başarısız.");
  }
}