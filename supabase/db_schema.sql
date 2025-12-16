create table if not exists public.cargo_shipments (
    id uuid default gen_random_uuid() primary key,
    order_id bigint references public.orders(id) on delete cascade,
    tracking_number text,
    cargo_provider text default 'Surat',
    label_url text,
    label_base64 text,
    package_details jsonb, -- { count: 2, total_desi: 5.5, packages: [...] }
    status text default 'created', -- created, printed, shipped, delivered
    printed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Hızlı sorgu için indexler
create index if not exists idx_cargo_shipments_order_id on public.cargo_shipments(order_id);
create index if not exists idx_cargo_shipments_tracking_number on public.cargo_shipments(tracking_number);

-- RLS Politikaları (Opsiyonel ama önerilir)
alter table public.cargo_shipments enable row level security;
create policy "Allow all access for authenticated users" on public.cargo_shipments for all using (auth.role() = 'authenticated');
