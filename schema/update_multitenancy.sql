-- 1. Create a function to safely add organization_id
CREATE OR REPLACE FUNCTION add_org_id_if_not_exists(tbl text) RETURNS void AS $$
BEGIN
    -- Only proceed if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'organization_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN organization_id text', tbl);
            RAISE NOTICE 'Added organization_id to %', tbl;
        ELSE
            RAISE NOTICE 'organization_id already exists in %', tbl;
        END IF;
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping.', tbl;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a function to enable RLS and add policy
CREATE OR REPLACE FUNCTION enable_rls_and_policy(tbl text) RETURNS void AS $$
BEGIN
    -- Only proceed if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- Drop existing policy to avoid error
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', tbl);

        -- Create Policy using Clerk Org ID (auth.jwt() ->> 'org_id')
        EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL USING (organization_id = (select auth.jwt() ->> ''org_id''))', tbl);
        
        RAISE NOTICE 'RLS and Policy enabled for %', tbl;
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping RLS.', tbl;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply to all tables
-- List of tables identified previously
SELECT add_org_id_if_not_exists('orders');
SELECT enable_rls_and_policy('orders');

SELECT add_org_id_if_not_exists('products');
SELECT enable_rls_and_policy('products');

SELECT add_org_id_if_not_exists('customers');
SELECT enable_rls_and_policy('customers');

SELECT add_org_id_if_not_exists('suppliers');
SELECT enable_rls_and_policy('suppliers');

SELECT add_org_id_if_not_exists('expenses');
SELECT enable_rls_and_policy('expenses');

SELECT add_org_id_if_not_exists('invoices');
SELECT enable_rls_and_policy('invoices');

SELECT add_org_id_if_not_exists('production');
SELECT enable_rls_and_policy('production');

SELECT add_org_id_if_not_exists('recipes');
SELECT enable_rls_and_policy('recipes');

SELECT add_org_id_if_not_exists('stock_movements');
SELECT enable_rls_and_policy('stock_movements');

SELECT add_org_id_if_not_exists('production_orders');
SELECT enable_rls_and_policy('production_orders');

SELECT add_org_id_if_not_exists('manufacturing_orders');
SELECT enable_rls_and_policy('manufacturing_orders');

SELECT add_org_id_if_not_exists('work_orders');
SELECT enable_rls_and_policy('work_orders');

SELECT add_org_id_if_not_exists('users');
SELECT enable_rls_and_policy('users');

SELECT add_org_id_if_not_exists('organizations');
SELECT enable_rls_and_policy('organizations');

SELECT add_org_id_if_not_exists('profiles');
SELECT enable_rls_and_policy('profiles');

SELECT add_org_id_if_not_exists('accounts');
SELECT enable_rls_and_policy('accounts');

SELECT add_org_id_if_not_exists('transactions');
SELECT enable_rls_and_policy('transactions');

-- Cargo Connections
SELECT add_org_id_if_not_exists('cargo_connections');
SELECT enable_rls_and_policy('cargo_connections'); 

-- 4. Cleanup helper functions
DROP FUNCTION add_org_id_if_not_exists(text);
DROP FUNCTION enable_rls_and_policy(text);
