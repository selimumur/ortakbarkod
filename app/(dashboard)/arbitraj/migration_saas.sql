-- ==============================================================================
-- SAAS MULTI-TENANCY MIGRATION SCRIPT
-- ==============================================================================
-- Bu betik, mevcut tekil (single-tenant) yapıyı çoklu firma (multi-tenant) yapısına çevirir.
-- Clerk.com Organizations özelliği ile entegre çalışır.

-- 1. Helper Fonksiyonu: Mevcut isteğin Org ID'sini al
-- Clerk JWT içinde 'org_id' claim'i gönderilmelidir.
CREATE OR REPLACE FUNCTION requesting_org_id()
RETURNS text AS $$
    SELECT current_setting('request.jwt.claims', true)::json->>'org_id';
$$ LANGUAGE sql STABLE;

-- 2. Helper Fonksiyonu: Mevcut isteğin User ID'sini al (Clerk User ID)
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text AS $$
    SELECT current_setting('request.jwt.claims', true)::json->>'sub';
$$ LANGUAGE sql STABLE;


-- ==============================================================================
-- TABLO GÜNCELLEMELERİ (ALTER TABLE)
-- Her tabloya organization_id ekleniyor.
-- ==============================================================================

-- Marketplace Accounts (Trendyol, Hepsiburada API anahtarları)
ALTER TABLE marketplace_accounts 
ADD COLUMN IF NOT EXISTS organization_id text;
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_org ON marketplace_accounts(organization_id);

-- Master Products (Ana Ürün Kataloğu)
ALTER TABLE master_products
ADD COLUMN IF NOT EXISTS organization_id text;
CREATE INDEX IF NOT EXISTS idx_master_products_org ON master_products(organization_id);

-- Marketplace Orders (Siparişler)
ALTER TABLE marketplace_orders
ADD COLUMN IF NOT EXISTS organization_id text;
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_org ON marketplace_orders(organization_id);

-- Factory Settings (Ayarlar)
ALTER TABLE factory_settings
ADD COLUMN IF NOT EXISTS organization_id text;
-- Unique constraint (Her organizasyonun sadece 1 ayar satırı olabilir)
ALTER TABLE factory_settings DROP CONSTRAINT IF EXISTS factory_settings_pkey; -- Eğer varsa
-- Mevcut ID primary key ise dokunmayalım, unique index ekleyelim
CREATE UNIQUE INDEX IF NOT EXISTS idx_factory_settings_org_unique ON factory_settings(organization_id);

-- Customers (Müşteriler)
CREATE TABLE IF NOT EXISTS customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    full_name text,
    email text,
    phone text,
    address text
);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id text;

-- Suppliers (Tedarikçiler)
CREATE TABLE IF NOT EXISTS suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_name text,
    contact_name text,
    email text,
    phone text
);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS organization_id text;

-- Integration Logs (Loglar)
CREATE TABLE IF NOT EXISTS integration_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    log_level text, -- 'info', 'error', 'warning'
    message text,
    details jsonb
);
ALTER TABLE integration_logs ADD COLUMN IF NOT EXISTS organization_id text;

-- Profiles (Kullanıcı Profilleri)
-- Profiles tablosu user-bazlıdır, org-bazlı değil. 
-- Ancak kullanıcının hangi org'da hangi rolde olduğunu CLERK tutar.
-- Biz sadece yerel eşleştirme yapacaksak buraya da ekleyebiliriz ama şimdilik gerek yok.


-- ==============================================================================
-- RLS (ROW LEVEL SECURITY) POLİTİKALARI GÜNCELLEME
-- ==============================================================================

-- Tüm tablolar için RLS aktif edilir
ALTER TABLE marketplace_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- MEVCUT POLİTİKALARI TEMİZLE (Çakışma olmaması için)
DROP POLICY IF EXISTS "Tenant Isolation" ON marketplace_accounts;
DROP POLICY IF EXISTS "Tenant Isolation" ON master_products;
DROP POLICY IF EXISTS "Tenant Isolation" ON marketplace_orders;
DROP POLICY IF EXISTS "Tenant Isolation" ON factory_settings;
DROP POLICY IF EXISTS "Tenant Isolation" ON customers;
DROP POLICY IF EXISTS "Tenant Isolation" ON suppliers;
DROP POLICY IF EXISTS "Tenant Isolation" ON integration_logs;

-- YENİ POLİTİKALAR (Generic)
-- Okuma (Select): Sadece kendi organization_id'sine sahip satırları gör
-- Yazma (Insert/Update): Sadece kendi organization_id'sine sahip satırlara yaz

-- Marketplace Accounts
CREATE POLICY "Tenant Isolation Select" ON marketplace_accounts
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON marketplace_accounts
FOR ALL USING (organization_id = requesting_org_id());

-- Master Products
CREATE POLICY "Tenant Isolation Select" ON master_products
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON master_products
FOR ALL USING (organization_id = requesting_org_id());

-- Marketplace Orders
CREATE POLICY "Tenant Isolation Select" ON marketplace_orders
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON marketplace_orders
FOR ALL USING (organization_id = requesting_org_id());

-- Factory Settings
CREATE POLICY "Tenant Isolation Select" ON factory_settings
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON factory_settings
FOR ALL USING (organization_id = requesting_org_id());

-- Customers
CREATE POLICY "Tenant Isolation Select" ON customers
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON customers
FOR ALL USING (organization_id = requesting_org_id());

-- Suppliers
CREATE POLICY "Tenant Isolation Select" ON suppliers
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON suppliers
FOR ALL USING (organization_id = requesting_org_id());

-- Integration Logs
CREATE POLICY "Tenant Isolation Select" ON integration_logs
FOR SELECT USING (organization_id = requesting_org_id());

CREATE POLICY "Tenant Isolation All" ON integration_logs
FOR ALL USING (organization_id = requesting_org_id());

