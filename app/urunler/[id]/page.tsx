// app/urunler/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// DİKKAT: Senin dosya ağacına göre import yolu tam olarak budur:
import MarketplaceManager from '@/app/components/marketplace/MarketplaceManager';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  // Next.js 15+ için params await edilebilir, hata alırsan 'await params' yap
  const { id } = params;
  
  const supabase = createClient();

  // 1. Ürün Verisini Çek
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) {
    return (
        <div className="p-10 text-center">
            <h1 className="text-2xl font-bold">Ürün Bulunamadı</h1>
            <p className="text-gray-500">Aradığınız ürün silinmiş veya mevcut değil.</p>
            <Link href="/urunler" className="text-blue-500 mt-4 block">Listeye Dön</Link>
        </div>
    );
  }

  // 2. WooCommerce Eşleşme Bilgisini Çek
  // Bu, butonun "Yayınla" mı yoksa "Güncelle" mi diyeceğini belirler
  const { data: map } = await supabase
    .from('product_marketplace_map')
    .select('*')
    .eq('product_id', id)
    .eq('marketplace_type', 'woocommerce')
    .single();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Üst Navigasyon */}
      <div className="mb-6 flex items-center text-sm text-gray-500">
        <Link href="/urunler" className="hover:text-blue-600 transition">
          ← Ürün Listesine Dön
        </Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SOL KOLON: Ürün Detayları */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {product.name}
            </h1>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <span className="block text-gray-500 text-xs uppercase tracking-wider">SKU / Stok Kodu</span>
                <span className="font-mono font-medium text-lg">{product.sku || '-'}</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <span className="block text-gray-500 text-xs uppercase tracking-wider">Satış Fiyatı</span>
                <span className="font-bold text-green-600 text-2xl">
                  {product.price ? `${product.price} ₺` : '0.00 ₺'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <span className="block text-gray-500 text-xs uppercase tracking-wider">Mevcut Stok</span>
                <span className={`font-bold text-xl ${product.stock > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {product.stock} <span className="text-sm font-normal text-gray-500">Adet</span>
                </span>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-2">Ürün Açıklaması</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {product.description || 'Bu ürün için henüz bir açıklama girilmemiş.'}
              </p>
            </div>
          </div>
        </div>

        {/* SAĞ KOLON: PAZARYERİ YÖNETİMİ (BUTON BURADA) */}
        <div className="lg:col-span-1">
            <div className="sticky top-6">
                
                {/* İşte aradığın modül tam olarak burada çağırılıyor 👇 */}
                <MarketplaceManager product={product} integrationMap={map} />

                {/* Ekstra Bilgi Kutusu */}
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm mb-1">İpucu</h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Ürünü WooCommerce'e gönderdiğinizde, buradaki stok miktarı mağazanızla otomatik eşitlenir.
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}