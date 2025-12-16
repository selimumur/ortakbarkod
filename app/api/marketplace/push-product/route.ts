import { NextResponse } from 'next/server';
import { createProductInWooCommerce } from '@/lib/woocommerce';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { productId, storeId } = body;

        if (!productId || !storeId) {
            return NextResponse.json({ error: "Ürün ID ve Mağaza ID gerekli." }, { status: 400 });
        }

        // 1. Ürün Bilgilerini Çek
        const { data: product } = await supabase
            .from('master_products')
            .select('*')
            .eq('id', productId)
            .single();

        if (!product) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });

        // 2. Pazaryerine Gönder (Lib Fonksiyonunu Kullan)
        // createProductInWooCommerce fonksiyonu var mı kontrol, varsa oluştur, yoksa getir
        const wooProduct = await createProductInWooCommerce({
            id: product.id,
            name: product.name,
            code: product.code, // SKU
            price: product.price,
            stock: product.stock,
            image_url: product.image_url,
            description: product.description
        }, storeId);

        if (!wooProduct || !wooProduct.id) {
            throw new Error("Pazaryerinde ürün oluşturulamadı veya ID dönmedi.");
        }

        // 3. Eşleşmeyi Kaydet/Güncelle
        const { error } = await supabase
            .from('product_marketplaces')
            .upsert({
                product_id: productId,
                marketplace_id: storeId,
                remote_product_id: wooProduct.id.toString(),
                remote_sku: wooProduct.sku,
                sale_price: parseFloat(wooProduct.price || 0),
                stock_quantity: wooProduct.stock_quantity || 0,
                sync_status: 'synced',
                last_sync_at: new Date().toISOString(),
                is_active: true,
                last_error_message: null
            }, { onConflict: 'product_id, marketplace_id' });

        if (error) throw error;

        return NextResponse.json({ success: true, remoteId: wooProduct.id });

    } catch (error: any) {
        console.error("Push Product Hatası:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
