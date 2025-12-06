import { NextResponse } from 'next/server';
import { updateProductPriceInWoo } from '@/lib/woocommerce';
import { createClient } from '@/utils/supabase/server'; 

// Bu API önbelleğe alınmasın, her çağrıldığında taze çalışsın
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Güncellenmesi gereken kuyruğu çek (sync_needed = true)
    // Sadece WooCommerce olanları ve henüz işlenmemişleri alıyoruz
    const { data: queue, error: queueError } = await supabase
      .from('product_marketplace_map')
      .select('*, master_products(*)') 
      .eq('sync_needed', true)
      .eq('marketplace_type', 'woocommerce')
      .limit(5); // Sunucuyu yormamak için her seferinde 5 tane işle

    if (queueError) {
      throw new Error("Kuyruk okunamadı: " + queueError.message);
    }

    if (!queue || queue.length === 0) {
      return NextResponse.json({ message: "Kuyruk boş, güncellenecek ürün yok." });
    }

    const results = [];

    // 2. Kuyruktaki her ürünü sırayla işle
    for (const item of queue) {
      try {
        const localProduct = item.master_products;
        
        if (!localProduct) {
            throw new Error("Ana ürün veritabanında bulunamadı.");
        }
        
        // Hedef fiyat varsa onu, yoksa ana fiyatı kullan
        const priceToSend = item.target_price || localProduct.price;
        const stockToSend = localProduct.stock;

        console.log(`[Worker] İşleniyor: ${localProduct.name} -> ${priceToSend} TL`);

        // WooCommerce API'ye gönder (Lib fonksiyonunu kullanıyoruz)
        await updateProductPriceInWoo(item.remote_product_id, {
          price: priceToSend,
          stock: stockToSend
        });

        // BAŞARILI! Bayrağı indir ve yeni fiyatı kaydet.
        await supabase
          .from('product_marketplace_map')
          .update({
            sync_needed: false, // Artık kuyrukta değil
            remote_price: priceToSend, // Remote fiyat artık güncel
            remote_stock: stockToSend,
            last_sync_date: new Date().toISOString(),
            last_error: null // Varsa eski hatayı sil
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: "Success", product: localProduct.name });

      } catch (error: any) {
        console.error(`[Worker Hata] ID ${item.id}:`, error.message);
        
        // Hata mesajını veritabanına yaz (Kullanıcı panelde görsün)
        await supabase
          .from('product_marketplace_map')
          .update({ last_error: error.message || "Bilinmeyen hata" })
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