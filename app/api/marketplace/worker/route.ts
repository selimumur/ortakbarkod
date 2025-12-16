import { NextResponse } from 'next/server';
import { updateProductPriceInWoo } from '@/lib/woocommerce';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Güncellenmesi gereken kuyruğu çek (sync_status = 'pending')
    // Sadece WooCommerce olanları ve henüz işlenmemişleri alıyoruz (marketplace_id ile kontrol edilebilir)
    const { data: queue, error: queueError } = await supabase
      .from('product_marketplaces')
      .select('*, master_products(*)')
      .eq('sync_status', 'pending')
      .limit(5); // Limit 5

    if (queueError) throw new Error("Kuyruk okunamadı: " + queueError.message);

    if (!queue || queue.length === 0) {
      return NextResponse.json({ message: "Kuyruk boş." });
    }

    const results = [];

    // 2. İşle
    for (const item of queue) {
      try {
        const localProduct = item.master_products;
        if (!localProduct) throw new Error("Ana ürün yok.");

        const priceToSend = item.target_price || localProduct.price || item.sale_price;
        const stockToSend = localProduct.stock;

        console.log(`[Worker] Güncelleniyor: ${localProduct.name} -> ${priceToSend} TL`);

        // WooCommerce API'ye gönder
        // item.marketplace_id ile connection bilgisini lib içinde çözmemiz lazım ama 
        // updateProductPriceInWoo şimdilik accountId alıyor mu? Evet, son update ile accountId parametresi var.
        await updateProductPriceInWoo(item.remote_product_id, {
          price: priceToSend,
          stock: stockToSend
        }, item.marketplace_id);

        // Başarılı
        await supabase
          .from('product_marketplaces')
          .update({
            sync_status: 'synced',
            sale_price: priceToSend,
            stock_quantity: stockToSend,
            last_sync_at: new Date().toISOString(),
            last_error_message: null
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: "Success", product: localProduct.name });

      } catch (error: any) {
        console.error(`[Worker Hata] ID ${item.id}:`, error.message);

        await supabase
          .from('product_marketplaces')
          .update({
            sync_status: 'error',
            last_error_message: error.message || "Bilinmeyen hata"
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: "Failed", error: error.message });
      }
    }

    return NextResponse.json({ processed: results.length, details: results });

  } catch (error: any) {
    console.error("Worker Kritik Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}