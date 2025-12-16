import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabaseClient' // Use Admin client for system actions

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    // 1. Verify Webhook Signature
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!WEBHOOK_SECRET || !SUPABASE_KEY) {
        console.warn("Missing Env Vars for Webhook");
        return new Response('Missing WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400
        })
    }

    const payload = await req.json()
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', {
            status: 400
        })
    }

    // 2. Handle Events
    const eventType = evt.type;
    const supabase = getSupabaseAdmin();

    if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const email = email_addresses && email_addresses[0]?.email_address;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();

        // A. Sync to Profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: id,
                email: email,
                full_name: fullName,
                avatar_url: image_url,
                organization_id: id // Default to personal org
            });

        if (profileError) console.error('Profile Sync Error:', profileError);

        // B. Create Personal Subscription (Free Trial)
        // Check if sub exists (idempotency) - use maybeSingle to avoid errors
        const { data: existingSub } = await supabase
            .from('saas_subscriptions')
            .select('id')
            .eq('tenant_id', id)
            .maybeSingle();

        if (!existingSub) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14); // 14 Day Trial

            const { data: newSub, error: subError } = await supabase
                .from('saas_subscriptions')
                .insert({
                    tenant_id: id,
                    plan_id: 'starter', // Default plan
                    status: 'trial',
                    start_date: startDate.toISOString(),
                    current_period_end: endDate.toISOString()
                })
                .select()
                .single();

            if (subError) {
                console.error('Subscription Creation Error:', subError);
            } else if (newSub) {
                // C. Add Default Modules for Starter Plan (Trial includes marketplace)
                const defaultModules = ['marketplace', 'production']; // Starter plan modules

                const modulesToInsert = defaultModules.map(moduleId => ({
                    subscription_id: newSub.id,
                    module_id: moduleId
                }));

                const { error: moduleError } = await supabase
                    .from('saas_subscription_modules')
                    .insert(modulesToInsert);

                if (moduleError) {
                    console.error('Module Assignment Error:', moduleError);
                }
            }
        }

        // D. Send Welcome Email
        if (email) {
            const { sendWelcomeEmailAction } = await import('@/app/actions/emailActions');
            await sendWelcomeEmailAction(email, first_name || 'Kullanıcı');
        }
    }

    if (eventType === 'organization.created') {
        const { id, name, slug } = evt.data;
        // Handle Org Subscription creation if needed
        // Currently focusing on User flow
    }

    return new Response('', { status: 200 })
}
