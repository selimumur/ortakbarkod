'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { hasModuleAccess, getOrganizationId } from "@/lib/accessControl";

// --- TYPES ---

export type SettingsSummary = {
    connectedMarketplaces: number;
    planName: string;
    notifications: number;
};

export type AccountInfo = {
    profile: {
        full_name: string | null;
        email: string | null;
        phone: string | null;
        department: string | null;
        avatar_url: string | null;
    };
    company: {
        name: string;
        tax_office: string;
        tax_number: string;
        address: string;
        phone: string;
        email: string;
        website: string;
        sector: string;
        social_media: {
            instagram: string;
            linkedin: string;
        };
    };
};

// --- ACTIONS ---

export async function getSettingsSummaryAction(): Promise<SettingsSummary> {
    const orgId = await getOrganizationId();
    if (!orgId) return { connectedMarketplaces: 0, planName: 'Standart', notifications: 0 };

    const supabase = getSupabaseAdmin();

    // Count Connected Marketplaces
    const { count: marketplaceCount } = await supabase
        .from('marketplace_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

    return {
        connectedMarketplaces: marketplaceCount || 0,
        planName: "Pro Paket", // Todo: Fetch from subscription table if exists
        notifications: 3 // Mock notification count
    };
}

export async function getAccountInfoAction(): Promise<AccountInfo> {
    const { userId } = await auth();
    const orgId = await getOrganizationId();

    if (!userId || !orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // 1. Get User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // 2. Get Company Info from factory_settings
    const { data: settings } = await supabase
        .from('factory_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single();

    return {
        profile: {
            full_name: profile?.full_name || '',
            email: profile?.email || '',
            phone: profile?.phone || '',
            department: profile?.department || '',
            avatar_url: profile?.avatar_url || ''
        },
        company: settings?.company_info || {
            name: '',
            tax_office: '',
            tax_number: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            sector: '',
            social_media: { instagram: '', linkedin: '' }
        }
    };
}

// --- NEW ACTION: Get Factory Settings (Generic) ---
export async function getFactorySettingsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // Use maybeSingle because it might not exist yet
    const { data, error } = await supabase
        .from('factory_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data || {};
}

// --- NEW ACTION: Update Definitions (Brand) ---
export async function updateDefinitionAction(data: { default_brand_id?: number | null, default_brand_name?: string }) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    // Check if exists
    const { data: existing } = await supabase.from('factory_settings').select('id').eq('organization_id', orgId).maybeSingle();

    let error;
    if (existing) {
        const { error: err } = await supabase
            .from('factory_settings')
            .update(data)
            .eq('organization_id', orgId);
        error = err;
    } else {
        const { error: err } = await supabase
            .from('factory_settings')
            .insert({
                organization_id: orgId,
                ...data
            });
        error = err;
    }

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/tanimlamalar');
    return { success: true };
}

// --- NEW ACTION: Update Printer Config ---
export async function updatePrinterConfigAction(config: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    // Check if exists
    const { data: existing } = await supabase.from('factory_settings').select('id').eq('organization_id', orgId).maybeSingle();

    let error;
    if (existing) {
        const { error: err } = await supabase
            .from('factory_settings')
            .update({ printer_config: config })
            .eq('organization_id', orgId);
        error = err;
    } else {
        const { error: err } = await supabase
            .from('factory_settings')
            .insert({
                organization_id: orgId,
                printer_config: config
            });
        error = err;
    }

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/yazici');
    return { success: true };
}


export async function updateProfileAction(data: { full_name: string; phone: string; department: string }) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('profiles').upsert({
        id: userId,
        ...data,
        updated_at: new Date().toISOString()
    });

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/hesap');
    return { success: true };
}

export async function updateCompanyInfoAction(companyInfo: AccountInfo['company']) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Check if settings exist
    const { data: existing } = await supabase
        .from('factory_settings')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

    let error;

    if (existing) {
        // Update
        const { error: updateError } = await supabase
            .from('factory_settings')
            .update({ company_info: companyInfo })
            .eq('organization_id', orgId);
        error = updateError;
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('factory_settings')
            .insert({
                organization_id: orgId,
                company_info: companyInfo
            });
        error = insertError;
    }

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/hesap');
    revalidatePath('/ayarlar/pazaryerleri');
    return { success: true };
}

// --- MARKETPLACE ACTIONS ---

export async function getMarketplacesAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('organization_id', orgId);

    return data || [];
}

export async function addMarketplaceAction(data: any) {
    try {
        const orgId = await getOrganizationId();
        if (!orgId) throw new Error("Unauthorized");

        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from('marketplace_accounts')
            .insert({
                organization_id: orgId,
                ...data
            });

        if (error) throw new Error(error.message);
        revalidatePath('/ayarlar/pazaryerleri');
        return { success: true };
    } catch (error: any) {
        console.error('addMarketplaceAction error:', error);
        throw new Error(error.message || 'Mağaza eklenirken bir hata oluştu');
    }
}

export async function updateMarketplaceAction(id: string, data: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('marketplace_accounts')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/pazaryerleri');
    return { success: true };
}

export async function deleteMarketplaceAction(id: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('marketplace_accounts')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/pazaryerleri');
    return { success: true };
}

// --- CARGO ACTIONS ---

export async function getCargoConnectionsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('cargo_connections')
        .select('*')
        .eq('organization_id', orgId);

    return data || [];
}

export async function saveCargoConnectionAction(provider: string, data: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Check if exists
    const { data: existing } = await supabase
        .from('cargo_connections')
        .select('id')
        .eq('organization_id', orgId)
        .eq('provider', provider)
        .single();

    let error;

    if (existing) {
        // Update
        const { error: updateError } = await supabase
            .from('cargo_connections')
            .update({ ...data, is_active: true })
            .eq('id', existing.id)
            .eq('organization_id', orgId);
        error = updateError;
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('cargo_connections')
            .insert({
                organization_id: orgId,
                provider,
                ...data,
                is_active: true
            });
        error = insertError;
    }

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/kargo');
    return { success: true };
}

export async function deleteCargoConnectionAction(provider: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('cargo_connections')
        .delete()
        .eq('organization_id', orgId)
        .eq('provider', provider);

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/kargo');
    return { success: true };
}

// --- USER MANAGEMENT ACTIONS ---

export async function getOrganizationUsersAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();

    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    return data || [];
}

export async function createOrganizationUserAction(data: {
    email: string;
    full_name: string;
    role: string;
    password?: string;
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    // 1. Check Limit
    const { checkLimit } = await import('@/lib/subscription');
    const { allowed, limit } = await checkLimit('users');
    if (!allowed) {
        throw new Error(`Kullanıcı limitinize (${limit}) ulaştınız. Lütfen paketinizi yükseltin.`);
    }

    const client = await clerkClient();

    try {
        // 1. Create User in Clerk
        const clerkUser = await client.users.createUser({
            emailAddress: [data.email],
            password: data.password,
            firstName: data.full_name.split(' ')[0],
            lastName: data.full_name.split(' ').slice(1).join(' '),
            publicMetadata: {
                role: data.role,
                organization_id: orgId
            }
        });

        // 2. Create Profile in Supabase
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('profiles').insert({
            id: clerkUser.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            organization_id: orgId,
            is_active: true
        });

        if (error) {
            await client.users.deleteUser(clerkUser.id);
            throw new Error("Veritabanı kaydı oluşturulamadı: " + error.message);
        }

        // 3. Send Invite Email
        const { sendInviteEmailAction } = await import('@/app/actions/emailActions');
        await sendInviteEmailAction(data.email, "Yönetici", data.role, "https://ortakbarkod.com/sign-in");

        revalidatePath('/ayarlar/kullanicilar');
        return { success: true };

    } catch (e: any) {
        throw new Error(e.errors ? e.errors[0]?.message : e.message);
    }
}

export async function updateOrganizationUserAction(id: string, data: {
    full_name: string;
    role: string;
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const client = await clerkClient();
    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', id).single();

    if (!profile || profile.organization_id !== orgId) {
        throw new Error("Bu kullanıcıyı düzenleme yetkiniz yok.");
    }

    await client.users.updateUser(id, {
        publicMetadata: {
            role: data.role,
            organization_id: orgId
        }
    });

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name,
            role: data.role
        })
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/kullanicilar');
    return { success: true };
}

export async function deleteOrganizationUserAction(id: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const client = await clerkClient();
    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', id).single();
    if (!profile || profile.organization_id !== orgId) {
        throw new Error("Bu kullanıcıyı silme yetkiniz yok.");
    }

    try {
        await client.users.deleteUser(id);
    } catch (e) {
        console.error("Clerk silme hatası:", e);
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/ayarlar/kullanicilar');
    return { success: true };
}
