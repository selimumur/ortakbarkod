-- ARBITRAJ MODÜLÜ TABLOLARI

-- 1. Eklentiden veya Panelden eklenen izleme listesi
create table if not exists arbitrage_watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  product_name text not null,
  product_url text, -- Eklentiden gelen URL
  image_url text,
  market_name text, -- Amazon, Trendyol vs.
  target_price numeric, -- Hedef fiyat veya rakip fiyat
  current_price numeric, -- Son kontrol edilen fiyat
  currency text default 'TRY',
  stock_status text default 'Stokta', -- Stokta, Tükendi, Kritik
  notes text,
  attributes jsonb, -- [NEW] Ürün özellikleri (Materyal, Boyut vb.)
  images text[], -- [NEW] Ürün görselleri dizisi
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Sistem tarafından tespit edilen fırsatlar (Dashboard için)
create table if not exists arbitrage_opportunities (
  id uuid default gen_random_uuid() primary key,
  product_name text not null,
  source_market text,
  target_market text,
  source_price numeric,
  target_price numeric,
  profit_amount numeric generated always as (target_price - source_price) stored,
  profit_margin numeric generated always as ( case when source_price > 0 then ((target_price - source_price) / source_price) * 100 else 0 end ) stored,
  risk_score int default 50, -- 0-100
  status text default 'Aktif', -- Aktif, İnceleniyor, Kapandı
  created_at timestamptz default now()
);

-- RLS (Row Level Security) - Güvenlik Politikaları
alter table arbitrage_watchlist enable row level security;
alter table arbitrage_opportunities enable row level security;

-- Herkes kendi listesini görür
create policy "Users can view own watchlist" 
on arbitrage_watchlist for select 
using (auth.uid() = user_id);

create policy "Users can insert own watchlist" 
on arbitrage_watchlist for insert 
with check (auth.uid() = user_id);

create policy "Users can update own watchlist" 
on arbitrage_watchlist for update 
using (auth.uid() = user_id);

create policy "Users can delete own watchlist" 
on arbitrage_watchlist for delete 
using (auth.uid() = user_id);

-- Fırsatları herkes görebilir (veya sadece adminler - şimdilik açık)
create policy "Users can view opportunities" 
on arbitrage_opportunities for select 
to authenticated 
using (true);
