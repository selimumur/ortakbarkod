import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * TEMPORARY FIX ENDPOINT
 * This endpoint adds missing modules to existing subscriptions
 * Run once to fix existing users, then can be removed
 */
export async function POST(request: Request) {
    try {
        const supabase = getSupabaseAdmin();

        // 1. Get all active subscriptions without modules
        const { data: subscriptions, error: subError } = await supabase
            .from('saas_subscriptions')
            .select('id, tenant_id, plan_id, status');

        if (subError) {
            console.error('Error fetching subscriptions:', subError);
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found' });
        }

        let fixed = 0;
        let skipped = 0;

        for (const sub of subscriptions) {
            // Check if modules already exist
            const { data: existingModules } = await supabase
                .from('saas_subscription_modules')
                .select('id')
                .eq('subscription_id', sub.id);

            if (existingModules && existingModules.length > 0) {
                skipped++;
                continue; // Already has modules
            }

            // Add default modules based on plan
            const defaultModules = ['marketplace', 'production']; // Starter plan modules

            const modulesToInsert = defaultModules.map(moduleId => ({
                subscription_id: sub.id,
                module_id: moduleId
            }));

            const { error: moduleError } = await supabase
                .from('saas_subscription_modules')
                .insert(modulesToInsert);

            if (moduleError) {
                console.error(`Error adding modules for subscription ${sub.id}:`, moduleError);
            } else {
                fixed++;
                console.log(`Added modules for subscription ${sub.id} (tenant: ${sub.tenant_id})`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Fixed ${fixed} subscriptions, skipped ${skipped}`,
            fixed,
            skipped,
            total: subscriptions.length
        });

    } catch (error: any) {
        console.error('Fix modules error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
