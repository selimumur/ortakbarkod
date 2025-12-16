"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getOrganizationId } from "@/lib/accessControl";
import { revalidatePath } from "next/cache";
import { SuratKargoService } from "@/app/services/surat-kargo";

export type CargoOrderParams = {
    status?: string;
    date_from?: string;
    date_to?: string;
    marketplace?: string;
    search?: string;
    printed?: string; // "true", "false", "all"
    page?: number;
    page_size?: number;
};

export async function getCargoOrdersAction(params: CargoOrderParams) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    let query = supabase
        .from('orders')
        .select(`*`, { count: 'exact' })
        .eq('organization_id', orgId);

    // 1. Statü
    if (params.status) {
        const statusList = params.status.split(',');
        query = query.in('status', statusList);
    }

    // 2. Pazaryeri
    if (params.marketplace && params.marketplace !== 'Tümü') {
        query = query.eq('platform', params.marketplace);
    }

    // 3. Yazdırılma Durumu
    if (params.printed === 'true') {
        query = query.eq('raw_data->>is_printed', 'true');
    } else if (params.printed === 'false') {
        // Not: is_printed != true
        query = query.not('raw_data->>is_printed', 'eq', 'true');
    }

    // 4. Tarih
    if (params.date_from) query = query.gte('order_date', params.date_from);
    if (params.date_to) query = query.lte('order_date', params.date_to);

    // 5. Arama
    if (params.search && params.search.length > 2) {
        query = query.or(`order_number.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,product_code.ilike.%${params.search}%`);
    }

    // 6. Sıralama ve Sayfalama
    const page = params.page || 0;
    const pageSize = params.page_size || 20;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data: ordersData, count, error } = await query
        .order('order_date', { ascending: false })
        .range(from, to);

    if (error) throw new Error(error.message);
    if (!ordersData || ordersData.length === 0) return { orders: [], total: 0 };

    // 7. Master Products Join
    const productCodes = new Set<string>();
    ordersData.forEach(o => {
        if (o.product_code) productCodes.add(o.product_code);
        const raw = o.raw_data || {};
        const lines = raw.lines || raw.items || raw.line_items || [];
        lines.forEach((l: any) => {
            const c = l.merchantSku || l.sku || l.barcode || l.productCode;
            if (c) productCodes.add(c);
        });
    });

    let productMap: Record<string, any> = {};
    if (productCodes.size > 0) {
        const { data: products } = await supabase
            .from('master_products')
            .select('code, name, product_parcels (width, height, depth, weight, desi)')
            .eq('organization_id', orgId) // Security Check
            .in('code', Array.from(productCodes));

        if (products) {
            products.forEach(p => {
                productMap[p.code] = p;
                productMap[p.code.toLowerCase()] = p;
                productMap[p.code.toUpperCase()] = p;
            });
        }
    }

    // 8. Process Data
    const processedData = ordersData.map(order => {
        const raw = order.raw_data || {};
        const line = raw.lines?.[0] || raw.items?.[0] || raw.line_items?.[0] || {};

        const candidateCode = order.product_code || line.merchantSku || line.sku || line.barcode || line.productCode || "";
        const candidateName = order.product_name || line.productName || line.name || "";

        let masterProduct = null;
        if (candidateCode) {
            masterProduct = productMap[candidateCode] || productMap[candidateCode.toLowerCase()] || productMap[candidateCode.toUpperCase()];
        }

        if (!order.product_code) order.product_code = candidateCode;
        if (!order.product_name) order.product_name = masterProduct?.name || candidateName || "İsimsiz Ürün";

        order.master_products = masterProduct;

        let parcels: any[] = [];
        let totalDesi = 0;

        if (raw.package_details) {
            parcels = raw.package_details;
            totalDesi = parcels.reduce((acc: number, p: any) => acc + Number(p.desi), 0);
        } else if (masterProduct?.product_parcels?.length > 0) {
            const count = order.product_count || line.quantity || 1;
            const unitParcels = masterProduct.product_parcels;
            for (let i = 0; i < count; i++) {
                parcels = [...parcels, ...unitParcels];
            }
            totalDesi = parcels.reduce((acc: number, p: any) => acc + Number(p.desi), 0);
        } else {
            totalDesi = Number(order.desi || raw.desi || 0);
            parcels = [{ count: 1, desi: totalDesi }];
        }

        return {
            ...order,
            computed: {
                parcels,
                total_desi: totalDesi.toFixed(2),
                is_missing_info: totalDesi === 0
            }
        };
    });

    return { orders: processedData, total: count };
}

export type LabelResult = {
    success: boolean;
    html?: string;
    warning?: string;
    error?: string;
    printed_orders?: string[];
};

export async function generateCargoLabelsAction(orderIds: string[], forceReprint: boolean = false): Promise<LabelResult> {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    if (!orderIds || orderIds.length === 0) throw new Error("Sipariş seçilmedi.");

    const supabase = getSupabaseAdmin();

    // 1. Fetch Orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', orgId)
        .in('id', orderIds);

    if (error || !orders) throw new Error("Siparişler bulunamadı.");

    // 2. Prepare Product Data (for Label)
    const productCodes = new Set<string>();
    orders.forEach(o => {
        if (o.product_code) productCodes.add(o.product_code);
        const raw = o.raw_data || {};
        const lines = raw.lines || raw.items || raw.line_items || [];
        if (lines.length > 0) {
            const c = lines[0].merchantSku || lines[0].sku || lines[0].barcode;
            if (c) productCodes.add(c);
        }
    });

    let productMap: Record<string, any> = {};
    if (productCodes.size > 0) {
        const { data: products } = await supabase
            .from('master_products')
            .select('code, name, product_parcels (desi)')
            .eq('organization_id', orgId)
            .in('code', Array.from(productCodes));

        if (products) {
            products.forEach(p => {
                productMap[p.code] = p;
                productMap[p.code.toLowerCase()] = p; // simplified map
            });
        }
    }

    orders.forEach(o => {
        const pCode = o.product_code || o.raw_data?.lines?.[0]?.merchantSku || "N/A";
        o.master_products = productMap[pCode] || productMap[pCode.toLowerCase()] || null;
    });

    // 3. Already Printed Check
    if (!forceReprint) {
        const alreadyPrinted = orders.filter(o => o.raw_data?.is_printed);
        if (alreadyPrinted.length > 0) {
            return {
                success: false,
                warning: "ALREADY_PRINTED",
                printed_orders: alreadyPrinted.map(o => o.order_number)
            };
        }
    }

    // 4. Cargo Integration (SÜRAT)
    const { data: connection } = await supabase
        .from('cargo_connections')
        .select('*')
        .eq('provider', 'Surat')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .single();

    let suratService: SuratKargoService | null = null;
    if (connection) {
        suratService = new SuratKargoService(connection.username, connection.password);
    }

    for (const order of orders) {
        if (suratService && (!order.cargo_tracking_number || forceReprint)) {
            try {
                const raw = order.raw_data || {};
                const shipmentData = raw.shipmentAddress || raw.shipping || {};

                const address = shipmentData.fullAddress || shipmentData.address_1 || "";
                const city = shipmentData.city || "";
                const district = shipmentData.district || "";
                const phone = shipmentData.phone || raw.billing?.phone || "5555555555";
                const name = order.customer_name || "Alici";

                let desi = "1";
                if (order.master_products?.product_parcels?.[0]?.desi) {
                    desi = String(order.master_products.product_parcels[0].desi);
                } else if (order.desi) {
                    desi = String(order.desi);
                }

                const result = await suratService.createShipment({
                    AliciAdresi: address.substring(0, 200),
                    Il: city,
                    Ilce: district,
                    TelefonCep: phone,
                    KisiKurum: name,
                    OzelKargoTakipNo: order.order_number,
                    BirimDesi: desi,
                    Adet: 1
                }, 'MARKKETPLACE'); // Typo in original service call preserved 'MARKKETPLACE' ? Let's Assume 'MARKETPLACE' but keeping safe if string literal required. Wait, let's fix typo if logic allows. Original code had 'MARKKETPLACE'.

                if (!result.isError && result.Barcode) {
                    order.cargo_tracking_number = result.Barcode;

                    await supabase.from('orders').update({
                        cargo_tracking_number: result.Barcode,
                        cargo_provider: 'Surat'
                    }).eq('id', order.id);

                    await supabase.from('cargo_shipments').insert({
                        order_id: order.id,
                        tracking_number: result.Barcode,
                        status: 'created',
                        cargo_provider: 'Surat'
                    });
                } else {
                    console.error(`Sürat Kargo Hatası (${order.order_number}):`, result.Message);
                }
            } catch (err) {
                console.error("Cargo Integration Error:", err);
            }
        }
    }

    // 5. Update Printed Status
    const now = new Date().toISOString();
    const updates = orders.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        raw_data: { ...o.raw_data, is_printed: true, printed_at: now }
    }));
    await supabase.from('orders').upsert(updates);

    // 6. Generate HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Kargo Etiketleri</title>
    <style>
        @page { size: A6; margin: 0; }
        body { margin: 0; padding: 0; font-family: sans-serif; }
        .label { 
            width: 100mm; height: 147mm; 
            margin: 0 auto; 
            page-break-after: always; 
            position: relative; 
            box-sizing: border-box;
            padding: 5mm;
            border: 1px dotted #ccc;
        }
        @media print {
            .label { border: none; }
        }
        .header { text-align: center; font-size: 12px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
        .barcode-container { text-align: center; margin: 15px 0; }
        .barcode-img { max-width: 90%; height: 70px; }
        
        .customer-info { font-size: 14px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .label-val { font-weight: bold; }
        
        .footer { 
            position: absolute; bottom: 5mm; right: 5mm; text-align: right; 
            border-top: 1px solid #000; padding-top: 5px; width: 100%;
        }
        .product-name { font-size: 11px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;}
        .product-code { font-size: 28px; font-family: monospace; font-weight: 900; background: #000; color: #fff; padding: 4px 8px; display: inline-block;}
        
        .marketplace-badge {
            position: absolute; top: 5mm; right: 5mm; font-size: 10px; font-weight: bold; border: 1px solid #000; padding: 2px 4px; border-radius: 4px;
        }
        .cargo-logo { font-size: 20px; font-weight: 900; letter-spacing: -1px; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
</head>
<body>
    ${orders.map((o: any) => {
        const pCode = o.product_code || o.master_products?.code || "KOD_YOK";
        const pName = o.product_name || o.master_products?.name || "Ürün Adı Yok";
        const barcodeVal = o.cargo_tracking_number || o.order_number;
        const isAhmet = !o.cargo_tracking_number;

        return `
        <div class="label">
            <div class="marketplace-badge">${o.platform}</div>
            
            <div class="header">
                <div class="cargo-logo">SÜRAT KARGO</div>
                <div style="font-size:10px;">${new Date().toLocaleDateString('tr-TR')}</div>
            </div>

            <div class="customer-info">
                <div class="row">
                    <span>ALICI:</span>
                    <span class="label-val">${o.customer_name}</span>
                </div>
                <div style="font-size: 12px; height: 40px; overflow: hidden; margin-top: 5px; border: 1px solid #eee; padding: 5px;">
                     ${o.raw_data?.shipmentAddress?.fullAddress || o.raw_data?.shipping?.address_1 || ""} <br>
                     ${o.raw_data?.shipmentAddress?.district || ""} / ${o.raw_data?.shipmentAddress?.city || ""}
                </div>
                <div class="row" style="margin-top:5px;">
                    <span>Desi:</span> <span class="label-val">${o.master_products?.product_parcels?.[0]?.desi || o.desi || "1"}</span>
                </div>
            </div>

            <div class="barcode-container">
                <svg class="barcode"
                    jsbarcode-format="CODE128"
                    jsbarcode-value="${barcodeVal}"
                    jsbarcode-width="2"
                    jsbarcode-height="60"
                    jsbarcode-displayValue="true">
                </svg>
                ${isAhmet ? '<p style="font-size:10px; color:red;">(Resmi Kargo Barkodu Oluşmadı)</p>' : ''}
            </div>

            <div class="footer">
                <div class="product-name">${pName}</div>
                <div class="product-code">${pCode}</div>
                <div style="font-size: 10px; margin-top:5px;">Sip: ${o.order_number}</div>
            </div>
        </div>
        `;
    }).join('')}

    <script>
        JsBarcode(".barcode").init();
        // window.onload = function() { window.print(); } // Auto print disable to let user see
        setTimeout(() => { window.print(); }, 500);
    </script>
</body>
</html>
    `;

    revalidatePath('/kargo');

    return { success: true, html };
}
