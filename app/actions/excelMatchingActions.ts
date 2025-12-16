'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getOrganizationId } from "@/lib/accessControl";
import { revalidatePath } from "next/cache";
import * as XLSX from 'xlsx';

// Type definitions
interface ParsedExcelProduct {
    barcode: string;
    remoteProductId: string;
    title?: string;
    price?: number;
    stock?: number;
    modelCode?: string;
    sku?: string;
}

interface MatchResult {
    matched: number;
    skipped: number;
    notFound: number;
    errors: string[];
}

// Parse Excel file based on marketplace type
export async function parseExcelFileAction(
    fileBuffer: ArrayBuffer,
    marketplace: string
): Promise<ParsedExcelProduct[]> {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    try {
        const workbook = XLSX.read(fileBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const products: ParsedExcelProduct[] = [];

        // Parse based on marketplace type
        if (marketplace.toLowerCase().includes('trendyol')) {
            // Trendyol Excel format
            for (const row of data as any[]) {
                const barcode = row['Barkod'] || row['barcode'];
                const remoteProductId = row['Partner ID'] || row['Ürün ID'] || row['productContentId'];

                if (barcode && remoteProductId) {
                    products.push({
                        barcode: String(barcode).trim(),
                        remoteProductId: String(remoteProductId).trim(),
                        title: row['Ürün Adı'] || row['title'],
                        price: parseFloat(row['Satış Fiyatı (KDV Dahil)'] || row['Satış Fiyatı'] || 0),
                        stock: parseInt(row['Stok'] || row['stock'] || 0),
                        modelCode: row['Model Kodu']
                    });
                }
            }
        } else if (marketplace.toLowerCase().includes('woo')) {
            // WooCommerce Excel format
            for (const row of data as any[]) {
                const barcode = row['SKU'] || row['sku'] || row['Barkod'];
                const remoteProductId = row['ID'] || row['id'] || row['Ürün ID'];

                if (barcode && remoteProductId) {
                    products.push({
                        barcode: String(barcode).trim(),
                        remoteProductId: String(remoteProductId).trim(),
                        title: row['Name'] || row['name'] || row['Ürün Adı'],
                        price: parseFloat(row['Price'] || row['price'] || row['Fiyat'] || 0),
                        stock: parseInt(row['Stock'] || row['stock'] || row['Stok'] || 0),
                        sku: row['SKU'] || row['sku']
                    });
                }
            }
        } else {
            // Generic format - try to detect columns
            for (const row of data as any[]) {
                const barcode = row['Barkod'] || row['barcode'] || row['SKU'] || row['sku'];
                const remoteProductId = row['ID'] || row['id'] || row['Ürün ID'] || row['Partner ID'];

                if (barcode && remoteProductId) {
                    products.push({
                        barcode: String(barcode).trim(),
                        remoteProductId: String(remoteProductId).trim(),
                        title: row['Ürün Adı'] || row['title'] || row['Name'] || row['name'],
                        price: parseFloat(row['Fiyat'] || row['price'] || row['Price'] || 0),
                        stock: parseInt(row['Stok'] || row['stock'] || row['Stock'] || 0)
                    });
                }
            }
        }

        if (products.length === 0) {
            throw new Error("Excel dosyasında geçerli ürün bulunamadı. Lütfen dosya formatını kontrol edin.");
        }

        return products;
    } catch (error: any) {
        throw new Error(`Excel dosyası okunamadı: ${error.message}`);
    }
}

// Bulk match products from Excel data
export async function bulkMatchProductsAction(
    excelProducts: ParsedExcelProduct[],
    marketplaceName: string
): Promise<MatchResult> {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const result: MatchResult = {
        matched: 0,
        skipped: 0,
        notFound: 0,
        errors: []
    };

    try {
        // Get marketplace account
        const { data: account, error: accountError } = await supabase
            .from('marketplace_accounts')
            .select('id, store_name, platform')
            .eq('organization_id', orgId)
            .or(`store_name.eq.${marketplaceName},platform.ilike.%${marketplaceName}%`)
            .limit(1)
            .single();

        if (accountError || !account) {
            throw new Error(`Pazaryeri bulunamadı: ${marketplaceName}`);
        }

        // Get all master products for this organization
        const { data: masterProducts, error: productsError } = await supabase
            .from('master_products')
            .select('id, barcode, name, code')
            .eq('organization_id', orgId);

        if (productsError) {
            throw new Error(`Ürünler yüklenemedi: ${productsError.message}`);
        }

        // Create a map of barcode -> master_product_id
        const barcodeMap = new Map<string, any>();
        masterProducts?.forEach(product => {
            if (product.barcode) {
                barcodeMap.set(product.barcode.trim(), product);
            }
        });

        // Get existing matches to avoid duplicates
        const { data: existingMatches } = await supabase
            .from('product_marketplaces')
            .select('product_id, remote_product_id')
            .eq('organization_id', orgId)
            .eq('marketplace_id', account.id);

        const existingMatchSet = new Set<string>();
        existingMatches?.forEach(match => {
            existingMatchSet.add(`${match.product_id}-${match.remote_product_id}`);
        });

        // Process each Excel product
        const matchesToInsert: any[] = [];

        for (const excelProduct of excelProducts) {
            const masterProduct = barcodeMap.get(excelProduct.barcode);

            if (!masterProduct) {
                result.notFound++;
                result.errors.push(`Barkod bulunamadı: ${excelProduct.barcode} (${excelProduct.title || 'İsimsiz'})`);
                continue;
            }

            // Check if already matched
            const matchKey = `${masterProduct.id}-${excelProduct.remoteProductId}`;
            if (existingMatchSet.has(matchKey)) {
                result.skipped++;
                continue;
            }

            // Prepare match data
            matchesToInsert.push({
                product_id: masterProduct.id,
                marketplace_id: account.id,
                remote_product_id: excelProduct.remoteProductId,
                remote_variant_id: excelProduct.remoteProductId,
                barcode: excelProduct.barcode,
                current_sale_price: excelProduct.price || 0,
                stock_quantity: excelProduct.stock || 0,
                status: 'active'
            });
        }

        // Bulk insert matches
        if (matchesToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('product_marketplaces')
                .insert(matchesToInsert);

            if (insertError) {
                throw new Error(`Eşleştirme kaydedilemedi: ${insertError.message}`);
            }

            result.matched = matchesToInsert.length;
        }

        revalidatePath('/urunler/eslestirme');
        return result;

    } catch (error: any) {
        result.errors.push(error.message);
        return result;
    }
}

// Sync product updates to marketplace
export async function syncProductToMarketplaceAction(
    productId: number,
    updates: {
        price?: number;
        stock?: number;
        name?: string;
        description?: string;
    }
) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    try {
        // Get all marketplace links for this product
        const { data: marketplaceLinks, error: linksError } = await supabase
            .from('product_marketplaces')
            .select(`
                id,
                remote_product_id,
                remote_variant_id,
                marketplace_id,
                marketplace_accounts (
                    id,
                    platform,
                    store_name,
                    api_key,
                    api_secret,
                    supplier_id,
                    base_url,
                    store_url,
                    url
                )
            `)
            .eq('organization_id', orgId)
            .eq('product_id', productId)
            .eq('status', 'active');

        if (linksError || !marketplaceLinks || marketplaceLinks.length === 0) {
            // No marketplace links, nothing to sync
            return { success: true, synced: 0 };
        }

        const syncResults = [];

        for (const link of marketplaceLinks) {
            const account = link.marketplace_accounts as any;
            if (!account) continue;

            try {
                if (account.platform.toLowerCase().includes('trendyol')) {
                    // Sync to Trendyol
                    await syncToTrendyol(account, link.remote_product_id, updates);
                    syncResults.push({ marketplace: account.store_name, success: true });
                } else if (account.platform.toLowerCase().includes('woo')) {
                    // Sync to WooCommerce
                    await syncToWooCommerce(account, link.remote_product_id, updates);
                    syncResults.push({ marketplace: account.store_name, success: true });
                }
            } catch (error: any) {
                console.error(`Sync error for ${account.store_name}:`, error);
                syncResults.push({ marketplace: account.store_name, success: false, error: error.message });
            }
        }

        return { success: true, synced: syncResults.length, results: syncResults };

    } catch (error: any) {
        console.error('Sync error:', error);
        return { success: false, error: error.message };
    }
}

// Helper: Sync to Trendyol
async function syncToTrendyol(account: any, productContentId: string, updates: any) {
    const authHeader = Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64');

    // Trendyol API endpoint for updating price and inventory
    const url = `https://api.trendyol.com/sapigw/suppliers/${account.supplier_id}/products/price-and-inventory`;

    const items = [];

    // Prepare update payload
    const item: any = {
        barcode: updates.barcode || '', // Barcode is required
        quantity: updates.stock !== undefined ? updates.stock : undefined,
        salePrice: updates.price !== undefined ? updates.price : undefined,
        listPrice: updates.price !== undefined ? updates.price : undefined
    };

    // Remove undefined fields
    Object.keys(item).forEach(key => item[key] === undefined && delete item[key]);

    if (Object.keys(item).length > 1) { // More than just barcode
        items.push(item);
    }

    if (items.length === 0) {
        return; // Nothing to update
    }

    const payload = { items };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Trendyol API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

// Helper: Sync to WooCommerce
async function syncToWooCommerce(account: any, productId: string, updates: any) {
    let baseUrl = account.base_url || account.store_url || account.url;
    if (baseUrl && !baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
    }

    const url = `${baseUrl}/wp-json/wc/v3/products/${productId}`;

    const payload: any = {};

    if (updates.price !== undefined) {
        payload.regular_price = String(updates.price);
        payload.price = String(updates.price);
    }

    if (updates.stock !== undefined) {
        payload.stock_quantity = updates.stock;
        payload.manage_stock = true;
    }

    if (updates.name) {
        payload.name = updates.name;
    }

    if (updates.description) {
        payload.description = updates.description;
    }

    if (Object.keys(payload).length === 0) {
        return; // Nothing to update
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64')
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WooCommerce API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
}
