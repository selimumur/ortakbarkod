import { NextResponse } from 'next/server';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { createClient } from '@/utils/supabase/server';
import { getOrganizationId } from "@/lib/accessControl";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Frontend'den gelen veriler: Mağaza ID ve İstenen Sayfa Numarası
    const body = await request.json();
    const { connectionId, page = 1 } = body;
    const orgId = await getOrganizationId();

    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!connectionId) return NextResponse.json({ error: "Mağaza seçilmedi!" }, { status: 400 });

    // 1. Mağaza Bilgileri
    const { data: config } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('id', connectionId)
      .eq('organization_id', orgId)
      .single();

    if (!config) return NextResponse.json({ error: "Ayarlar bulunamadı." }, { status: 404 });

    let siteUrl = config.supplier_id.startsWith("http") ? config.supplier_id : `https://${config.supplier_id}`;

    const api = new WooCommerceRestApi({
      url: siteUrl,
      consumerKey: config.api_key,
      consumerSecret: config.api_secret,
      version: "wc/v3"
    });

    console.log(`[Import] Sayfa ${page} isteniyor...`);

    // 2. Sadece O Sayfadaki 50 Ürünü Çek
    const { data: wooProducts } = await api.get("products", {
      per_page: 50,
      page: page
    });

    if (!wooProducts || !Array.isArray(wooProducts)) {
      return NextResponse.json({ message: "Ürün bulunamadı.", productsCount: 0, hasMore: false });
    }

    let createdCount = 0;
    let matchCount = 0;

    // 3. Veritabanına İşle
    for (const wooProd of wooProducts) {
      if (!wooProd.sku) continue; // SKU'su olmayanları atla (Tercihen)

      // Barkod Bulma Denemesi (Meta verilerden veya niteliklerden)
      let extractedBarcode = null;
      // a) Meta Data'dan bak (Yaygın eklentiler: _ean, _gtin, _barcode)
      if (wooProd.meta_data && Array.isArray(wooProd.meta_data)) {
        const found = wooProd.meta_data.find((m: any) =>
          ['gtin', 'ean', 'barcode', '_gtin', '_ean', '_barcode'].includes(m.key.toLowerCase())
        );
        if (found) extractedBarcode = found.value;
      }
      // b) Attributes'dan bak
      if (!extractedBarcode && wooProd.attributes && Array.isArray(wooProd.attributes)) {
        const foundAttr = wooProd.attributes.find((a: any) => a.name.toLowerCase().includes('barkod') || a.name.toLowerCase().includes('ean'));
        if (foundAttr && foundAttr.options && foundAttr.options.length > 0) extractedBarcode = foundAttr.options[0];
      }

      // 4. Dublike Kontrolü (SKU veya Barkod ile) (Scoped?)
      // Check duplicate within organization's products
      let query = supabase.from('master_products').select('id').eq('organization_id', orgId).eq('code', wooProd.sku);

      // Eğer barkod bulduysak, barkodla da arayalım (OR mantığı biraz zor Supabase JS'de tek satırda, o yüzden data gelmezse ikinci sorgu yaparız)
      // Veya .or() kullanabiliriz ama code ve barcode farklı kolonlar.
      let { data: localProd } = await query.single();

      if (!localProd && extractedBarcode) {
        const { data: barcodeMatch } = await supabase.from('master_products').select('id').eq('organization_id', orgId).eq('barcode', extractedBarcode).single();
        localProd = barcodeMatch;
      }

      let targetProductId = localProd?.id;

      // Tüm görselleri hazırla
      const images = wooProd.images?.map((img: any) => img.src) || [];

      // Yoksa Oluştur
      if (!targetProductId) {
        const { data: newProd } = await supabase
          .from('master_products')
          .insert({
            organization_id: orgId, // Mandatory for tenant scoping
            name: wooProd.name,
            code: wooProd.sku,
            barcode: extractedBarcode, // Yeni kolon
            stock: wooProd.stock_quantity || 0,
            price: parseFloat(wooProd.price || 0),
            image_url: images[0] || null,
            images: images, // Yeni kolon (JSONB)
            description: wooProd.short_description?.replace(/<[^>]*>?/gm, '') || "",
            raw_data: wooProd // TÜM VERİYİ SAKLA (JSONB)
          })
          .select('id')
          .single();

        if (newProd) {
          targetProductId = newProd.id;
          createdCount++;
        }
      } else {
        matchCount++;
        // Mevcut ürünü güncellemek isterseniz burayı açabilirsiniz (Resim vb. güncellensin mi?)
        // Şimdilik sadece raw_data'yı güncelleyelim ki veriler taze kalsın
        await supabase.from('master_products').update({
          raw_data: wooProd,
          images: images,
          barcode: extractedBarcode || undefined // Varsa güncelle
        }).eq('id', targetProductId);
      }

      // Eşleştir (Pazaryeri Bağlantısı)
      if (targetProductId) {
        await supabase
          .from('product_marketplaces')
          .upsert({
            organization_id: orgId, // Mandatory
            product_id: targetProductId,
            marketplace_id: connectionId,
            remote_product_id: wooProd.id.toString(),
            remote_sku: wooProd.sku,
            sale_price: parseFloat(wooProd.price || 0),
            stock_quantity: wooProd.stock_quantity || 0,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString(),
            is_active: true
          }, { onConflict: 'product_id, marketplace_id' });
      }
    }

    // 4. Sonuç Dön (Devamı var mı?)
    return NextResponse.json({
      success: true,
      processed: wooProducts.length,
      created: createdCount,
      matched: matchCount,
      hasMore: wooProducts.length === 50
    });

  } catch (error: any) {
    console.error("Import API Hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}