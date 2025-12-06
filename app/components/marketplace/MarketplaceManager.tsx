'use client'; // Bu bir etkileşimli bileşen olduğu için şart

import { useState } from 'react';
import { toast } from 'sonner'; 

// NOT: Eğer projenizde özel UI buton bileşeni yoksa, 
// aşağıdaki import satırını silip yerine HTML <button> kullanabilirsiniz.
// Şimdilik standart HTML button ile yazıyorum ki hata almayın:

export default function MarketplaceManager({ product, integrationMap }: { product: any, integrationMap: any }) {
  const [loading, setLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(!!integrationMap);
  const [remoteId, setRemoteId] = useState(integrationMap?.remote_product_id || null);

  const handleSyncToWooCommerce = async () => {
    setLoading(true);
    try {
      // API'ye istek atıyoruz
      const res = await fetch('/api/marketplace/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Bir hata oluştu");

      toast.success("Ürün WooCommerce mağazanızda başarıyla açıldı!");
      setIsSynced(true);
      setRemoteId(data.wooId);
      
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-6 bg-white border rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">WooCommerce Entegrasyonu</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${isSynced ? 'bg-green-600' : 'bg-gray-400'}`}>
          {isSynced ? 'MAĞAZADA AKTİF' : 'MAĞAZADA YOK'}
        </span>
      </div>

      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
        <div>
          <p className="font-medium text-gray-900">Ürün Durumu</p>
          <p className="text-sm text-gray-500">
            {isSynced 
              ? `Bu ürün WooCommerce ile eşleşmiş. (Woo ID: ${remoteId})`
              : "Bu ürün henüz WooCommerce mağazanızda yok."}
          </p>
        </div>
        
        {isSynced ? (
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition">
            Güncelle
          </button>
        ) : (
          <button 
            onClick={handleSyncToWooCommerce} 
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'WooCommerce\'de Yayınla'}
          </button>
        )}
      </div>
    </div>
  );
}