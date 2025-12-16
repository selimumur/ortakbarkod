// lib/woocommerce.ts
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // NOT: Service Role Key yoksa Anon Key ile de çalışır ama RLS kapalı olmalı.
  // Güvenlik için env dosyanda SUPABASE_SERVICE_ROLE_KEY olduğundan emin ol.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error("Supabase URL veya Key eksik!");

  return createClient(url, key);
}

// 1. Dinamik WooCommerce İstemcisi
export async function getWooCommerceClient(accountId?: number) {
  // Opsiyonel: Belirli bir hesap ID'si verilirse onu, yoksa ilk aktif olanı çeker.

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('marketplace_accounts') // FIXED: Reverted to correct table name
    .select('*')
    //.eq('platform', 'WooCommerce') // Removing platform filter as 'WooCommerce' might be stored differently or implied
    .eq('is_active', true);

  if (accountId) {
    query = query.eq('id', accountId);
  }

  // Tekil veri çek
  const { data: config, error } = await query.maybeSingle(); // maybeSingle hata fırlatmaz, null döner

  if (error) throw new Error(`DB Hatası: ${error.message}`);
  if (!config) throw new Error("Aktif WooCommerce bağlantısı bulunamadı!");

  // DÜZELTME 2: URL artık 'supplier_id' değil 'base_url' sütununda tutuluyor.
  // Eski yapıdan kalma ihtimaline karşı ikisini de kontrol edelim.
  let siteUrl = config.base_url || config.supplier_id || config.store_url;

  if (!siteUrl) throw new Error("WooCommerce Site Adresi (Base URL) eksik!");

  // URL temizliği
  siteUrl = siteUrl.replace(/\/$/, ""); // Sondaki slash'i temizle
  if (!siteUrl.startsWith("http")) siteUrl = "https://" + siteUrl;

  console.log(`[WooCommerce Lib] Bağlanılıyor: ${siteUrl}`);

  return new WooCommerceRestApi({
    url: siteUrl,
    consumerKey: config.api_key,
    consumerSecret: config.api_secret,
    version: "wc/v3"
  });
}

// 2. AKILLI ÜRÜN OLUŞTURMA (Önce Var mı Bak, Varsa Getir)
export async function createProductInWooCommerce(productData: any, accountId?: number) {
  const api = await getWooCommerceClient(accountId);

  // Barkod yoksa ID'den üret
  const sku = productData.code || productData.sku || `OB-${productData.id}`;

  console.log(`[WooCommerce] SKU Kontrolü yapılıyor: ${sku}`);

  try {
    // 1. ADIM: SKU ile arama yap
    const checkRes = await api.get("products", { sku: sku });

    if (checkRes.data && checkRes.data.length > 0) {
      console.log(`[WooCommerce] Ürün zaten bulundu. ID: ${checkRes.data[0].id}`);
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
    images: productData.image_url ? [{ src: productData.image_url }] : []
  };

  try {
    console.log("[WooCommerce] Yeni ürün oluşturuluyor...");
    const response = await api.post("products", wooPayload);
    return response.data;
  } catch (error: any) {
    // Duplicate SKU hatası kontrolü
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
export async function updateProductPriceInWoo(remoteId: string, data: { price?: number, stock?: number, name?: string }, accountId?: number) {
  const api = await getWooCommerceClient(accountId);

  const payload: any = {};
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