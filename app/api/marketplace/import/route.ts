import { NextResponse } from 'next/server';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { createClient } from '@/utils/supabase/server'; 

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Frontend'den gelen veriler: Mağaza ID ve İstenen Sayfa Numarası
    const body = await request.json();
    const { connectionId, page = 1 } = body; // Varsayılan 1. sayfa

    if (!connectionId) return NextResponse.json({ error: "Mağaza seçilmedi!" }, { status: 400 });

    // 1. Mağaza Bilgileri
    const { data: config } = await supabase
      .from('marketplace_connections')
      .select('*')
      .eq('id', connectionId)
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
      if (!wooProd.sku) continue; 

      const { data: localProd } = await supabase
        .from('master_products')
        .select('id')
        .eq('code', wooProd.sku)
        .single();

      let targetProductId = localProd?.id;

      // Yoksa Oluştur
      if (!targetProductId) {
        const { data: newProd } = await supabase
            .from('master_products')
            .insert({
                name: wooProd.name,
                code: wooProd.sku,
                stock: wooProd.stock_quantity || 0,
                price: parseFloat(wooProd.price || 0),
                image_url: wooProd.images?.[0]?.src || null,
                description: wooProd.short_description?.replace(/<[^>]*>?/gm, '') || ""
            })
            .select('id')
            .single();

        if (newProd) {
            targetProductId = newProd.id;
            createdCount++;
        }
      } else {
          matchCount++;
      }

      // Eşleştir
      if (targetProductId) {
        await supabase
            .from('product_marketplace_map')
            .upsert({
                product_id: targetProductId,
                marketplace_type: 'woocommerce',
                remote_product_id: wooProd.id.toString(),
                remote_price: parseFloat(wooProd.price || 0),
                remote_stock: wooProd.stock_quantity || 0,
                sync_status: 'synced',
                last_sync_date: new Date().toISOString(),
                sync_needed: false
            }, { onConflict: 'product_id, marketplace_type' });
      }
    }

    // 4. Sonuç Dön (Devamı var mı?)
    return NextResponse.json({ 
      success: true, 
      processed: wooProducts.length,
      created: createdCount,
      matched: matchCount,
      hasMore: wooProducts.length === 50 // Eğer tam 50 geldiyse muhtemelen devamı vardır
    });

  } catch (error: any) {
    console.error("Import API Hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}