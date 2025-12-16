import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET(request: Request) {
    const orgId = await getOrganizationId();

    if (!orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    try {
        const { data, error } = await supabase
            .from('arbitrage_watchlist')
            .select('*')
            .eq('organization_id', orgId) // Scoped to Organization
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const orgId = await getOrganizationId();

    if (!orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    try {

        const body = await request.json();
        let productData = { ...body };

        // SCRAPE AUTOMATICALLY IF URL PROVIDED
        if (body.product_url && (!body.product_name || !body.current_price)) {
            try {
                const { scrapeProduct } = await import('../../../lib/scraper');
                const scraped = await scrapeProduct(body.product_url);

                if (scraped.success) {
                    productData = {
                        ...productData,
                        ...scraped.data,
                        // If target price is NOT set, default to 25% margin over current price
                        target_price: body.target_price || ((scraped.data?.current_price || 0) * 1.25)
                    };
                }
            } catch (e) {
                console.error("Scraper failed:", e);
                // Continue, maybe user provided partial data
            }
        }

        // Validate required fields (Either provided by user or filled by scraper)
        if (!productData.product_name || !productData.current_price) {
            return NextResponse.json({ error: "Eksik bilgi: Ürün adı veya fiyatı bulunamadı. Lütfen bilgileri manuel girin veya geçerli bir link kullanın." }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('arbitrage_watchlist')
            .insert({
                product_name: productData.product_name,
                product_url: productData.product_url,
                image_url: productData.image_url,
                market_name: productData.market_name,
                target_price: productData.target_price,
                current_price: productData.current_price,
                currency: productData.currency || 'TRY',
                stock_status: productData.stock_status || 'Stokta',
                organization_id: orgId,
                attributes: productData.attributes || {},
                images: productData.images || []
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const orgId = await getOrganizationId();

    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const { error } = await supabase
            .from('arbitrage_watchlist')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
