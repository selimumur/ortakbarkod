import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  // Basit Güvenlik: Herkes ciroyu görmesin diye URL'ye şifre koyacağız
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== 'gizli_patron_sifresi_123') { // Burayı kendine göre değiştir
     return NextResponse.json({ error: "Yetkisiz Giriş" }, { status: 401 });
  }

  // Bugünün Tarihi
  const today = new Date().toISOString().split('T')[0];

  // Bugünün Siparişlerini Çek
  const { data: orders } = await supabase
    .from('orders')
    .select('total_price')
    .gte('order_date', today); // Sadece bugün

  let dailyRevenue = 0;
  let orderCount = 0;

  if (orders) {
      orderCount = orders.length;
      dailyRevenue = orders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
  }

  // Widget Uygulamasının İstediği Format (Genelde JSON)
  return NextResponse.json({
      title: "OrtakBarkod",
      ciro: `${dailyRevenue.toLocaleString('tr-TR')} ₺`,
      siparis: `${orderCount} Adet`,
      son_guncelleme: new Date().toLocaleTimeString('tr-TR')
  });
}