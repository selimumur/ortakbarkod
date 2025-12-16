
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const marketplaceIds = JSON.parse(formData.get('marketplaceIds') as string || '[]');

        if (!file || marketplaceIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const supabase = getSupabaseAdmin();
        let successCount = 0;

        for (const row of data as any[]) {
            // Excel Columns: "Barkod" or "Ürün Kodu", "Fiyat"
            // We match by code/barcode
            const code = row['Barkod'] || row['Ürün Kodu'] || row['Kod'] || row['Barcode'];
            const price = row['Fiyat'] || row['Price'] || row['Satış Fiyatı'];

            if (!code || !price) continue;

            // 1. Find Product
            const { data: product } = await supabase
                .from('master_products')
                .select('id')
                .eq('code', String(code).trim())
                .eq('organization_id', userId)
                .single();

            if (product) {
                // 2. Update/Insert for each selected market
                for (const mid of marketplaceIds) {
                    const { error } = await supabase
                        .from('product_marketplaces')
                        .update({
                            current_sale_price: parseFloat(price),
                            last_price_check_at: new Date().toISOString()
                        })
                        .eq('product_id', product.id)
                        .eq('marketplace_id', mid)
                        .eq('organization_id', userId); // Scoped update

                    if (!error) successCount++;
                }
            }
        }

        return NextResponse.json({ success: true, message: `${successCount} updates processed` });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
