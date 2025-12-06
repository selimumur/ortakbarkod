import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { products } = await req.json();

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "Veri yok" }, { status: 400 });
    }

    // Excel verisini Veritabanı formatına çeviriyoruz
    // Dosyandaki sütun isimlerini birebir kullandım
    const formattedProducts = products.map((item: any) => ({
      code: item['Barkod'] || item['Model Kodu'] || item['Tedarikçi Stok Kodu'], // Benzersiz Kimlik
      name: item['Ürün Adı'],
      brand: item['Marka'],
      category: item['Kategori İsmi'],
      stock: Number(item['Ürün Stok Adedi']) || 0,
      price: Number(item["Trendyol'da Satılacak Fiyat (KDV Dahil)"]) || 0,
      list_price: Number(item['Piyasa Satış Fiyatı (KDV Dahil)']) || 0,
      image_url: item['Görsel 1'] || "",
      total_desi: Number(item['Desi']) || 0,
      // Excel'de olmayanları varsayılan yap
      model_code: item['Model Kodu'],
      on_sale: item['Durum'] === 'Satışta',
      last_updated: new Date().toISOString()
    }));

    // Veritabanına Kaydet (Upsert: Varsa güncelle, yoksa ekle)
    // onConflict: 'code' -> Barkod çakışırsa güncelle
    const { error } = await supabase
      .from('master_products')
      .upsert(formattedProducts, { onConflict: 'code', ignoreDuplicates: false });

    if (error) {
      console.error("Supabase Hatası:", error);
      return NextResponse.json({ error: "Veritabanı Hatası: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${formattedProducts.length} ürün başarıyla işlendi.`,
      count: formattedProducts.length 
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Sunucu Hatası", details: error.message }, { status: 500 });
  }
}