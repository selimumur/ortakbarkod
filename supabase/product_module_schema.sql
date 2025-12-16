-- Eşleştirme Tablosu: Sistemdeki ürünlerin pazaryeri karşılıkları
create table if not exists public.product_marketplace_matches (
    id uuid default gen_random_uuid() primary key,
    master_product_id bigint references public.master_products(id) on delete cascade,
    marketplace text not null, -- 'Trendyol', 'Hepsiburada', 'N11' ...
    remote_product_id text, -- Pazaryeri ID'si veya Barkodu
    remote_variant_id text,
    match_score int default 100, -- 100 = Manuel, <100 = Otomatik öneri
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    remote_data jsonb -- { price: 100, stock: 50, title: "..." } cache amaçlı
);

-- Unique index: Bir ürün aynı pazaryerinde aynı ID ile 2 kere eşleşmesin
create unique index if not exists idx_matches_unique on public.product_marketplace_matches(master_product_id, marketplace, remote_product_id);


-- Fiyat Geçmişi / Log Tablosu
create table if not exists public.product_price_logs (
    id uuid default gen_random_uuid() primary key,
    master_product_id bigint references public.master_products(id) on delete cascade,
    marketplace text not null,
    old_price numeric,
    new_price numeric,
    currency text default 'TRY',
    action_type text, -- 'manual_update', 'bulk_update', 'auto_sync'
    changed_by text, -- Kullanıcı email veya ID
    created_at timestamptz default now()
);

-- Indexler
create index if not exists idx_price_logs_product on public.product_price_logs(master_product_id);
create index if not exists idx_price_logs_date on public.product_price_logs(created_at);

-- RLS
alter table public.product_marketplace_matches enable row level security;
alter table public.product_price_logs enable row level security;

create policy "Authenticated Read Matches" on public.product_marketplace_matches for select using (auth.role() = 'authenticated');
create policy "Authenticated Write Matches" on public.product_marketplace_matches for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated Read Logs" on public.product_price_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated Write Logs" on public.product_price_logs for insert with check (auth.role() = 'authenticated');
