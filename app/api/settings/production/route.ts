import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('production_settings').select('*').eq('organization_id', orgId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const body = await request.json();

  // We upsert based on organization_id. 
  // Warning: If DB schema forces 'id' PK and doesn't have unique constraint on org_id, this might fail or duplicate.
  // Assuming 'production_settings' table update is handled or we use org_id as key.
  // Ideally: .upsert({ organization_id: orgId, ...body }, { onConflict: 'organization_id' })
  const { error } = await supabase.from('production_settings').upsert({ organization_id: orgId, ...body }, { onConflict: 'organization_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}