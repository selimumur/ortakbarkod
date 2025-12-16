import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOrganizationId } from "@/lib/accessControl";

import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const { productIds, accountId, type, value } = await request.json();

        if (!productIds || !productIds.length || !accountId) {
            return NextResponse.json({ success: false, error: "Eksik parametreler" }, { status: 400 });
        }

        const orgId = await getOrganizationId();

        if (!orgId) {
            return NextResponse.json({ success: false, error: "Yetkisiz Erişim" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Get Account
        const { data: account, error: accountError } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('organization_id', orgId)
            .single();

        if (accountError || !account) {
            return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
        }

        // 2. Get Products
        const { data: products } = await supabase
            .from('master_products')
            .select('*')
            .in('id', productIds)
            .eq('organization_id', orgId);

        if (!products || products.length === 0) {
            return NextResponse.json({ success: false, error: "Ürünler bulunamadı" }, { status: 404 });
        }

        // 3. Prepare Payload
        const items = products.map((p: any) => {
            if (!p.barcode) return null;

            let newPrice = p.price;
            if (type === 'set') newPrice = value;
            else if (type === 'percent_inc') newPrice = p.price + (p.price * value / 100);
            else if (type === 'percent_dec') newPrice = p.price - (p.price * value / 100);

            // Round to 2 decimals
            newPrice = parseFloat(newPrice.toFixed(2));

            return {
                barcode: p.barcode,
                salePrice: newPrice,
                listPrice: newPrice // Updating list price too
            };
        }).filter(Boolean);

        if (items.length === 0) return NextResponse.json({ success: false, error: "Geçerli ürün yok" });

        // 4. Send to Trendyol
        const basicAuth = Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64');
        const url = `https://api.trendyol.com/sapigw/suppliers/${account.supplier_id}/v2/products/price-and-inventory`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
                'User-Agent': `${account.supplier_id} - SelfIntegration`
            },
            body: JSON.stringify({ items })
        });

        const result = await response.json();

        if (response.ok) {
            return NextResponse.json({ success: true, message: "Fiyat güncellemesi kuyruğa alındı.", batchRequestId: result.batchRequestId });
        } else {
            return NextResponse.json({ success: false, error: "Trendyol Hatası", details: result });
        }

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
