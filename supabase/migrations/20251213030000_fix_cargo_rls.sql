-- Add organization_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cargo_connections' AND column_name = 'organization_id') THEN
        ALTER TABLE public.cargo_connections ADD COLUMN organization_id text;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.cargo_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own cargo connections" ON public.cargo_connections;
DROP POLICY IF EXISTS "Users can insert their own cargo connections" ON public.cargo_connections;
DROP POLICY IF EXISTS "Users can update their own cargo connections" ON public.cargo_connections;
DROP POLICY IF EXISTS "Users can delete their own cargo connections" ON public.cargo_connections;

-- Create Policies based on Organization ID (SaaS Multi-tenancy)
CREATE POLICY "Users can view their own cargo connections"
ON public.cargo_connections
FOR SELECT
USING (
  organization_id = (select auth.jwt() ->> 'org_id')
  OR
  (organization_id IS NULL AND auth.uid()::text = user_id::text) -- Fallback for legacy user-based rows
);

CREATE POLICY "Users can insert their own cargo connections"
ON public.cargo_connections
FOR INSERT
WITH CHECK (
  organization_id = (select auth.jwt() ->> 'org_id')
);

CREATE POLICY "Users can update their own cargo connections"
ON public.cargo_connections
FOR UPDATE
USING (
  organization_id = (select auth.jwt() ->> 'org_id')
)
WITH CHECK (
  organization_id = (select auth.jwt() ->> 'org_id')
);

CREATE POLICY "Users can delete their own cargo connections"
ON public.cargo_connections
FOR DELETE
USING (
  organization_id = (select auth.jwt() ->> 'org_id')
);
