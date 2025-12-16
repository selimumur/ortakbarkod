import { createClient } from '@supabase/supabase-js';

export const createClerkSupabaseClient = (clerkToken: string | null | undefined) => {
  const headers = clerkToken ? { global: { headers: { Authorization: `Bearer ${clerkToken}` } } } : {};

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    headers
  );
};

// ADMIN Client (Service Role) - Bypasses RLS
export const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// RLS-Compat Helper (Simulates Org Context for Admin Operations if needed)
// Use this when you want to use Admin key but scoped to an Org for safety?
// Actually RLS is bypassed by Service Key.
// So we need a client that USES the Users Token properly.

// Renaming for clarity


