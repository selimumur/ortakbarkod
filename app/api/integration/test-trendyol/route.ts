import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { seller_id, api_key, api_secret } = body;

        if (!seller_id || !api_key || !api_secret) {
            return NextResponse.json({ success: false, error: "Eksik bilgi" }, { status: 400 });
        }

        // Basic Authorization Header for Trendyol
        const auth = Buffer.from(`${api_key}:${api_secret}`).toString('base64');

        // Test with getting Brands or filtering products (lightweight)
        // Using Filter Products V2 Endpoint
        const url = `https://apigw.trendyol.com/integration/product/sellers/${seller_id}/products?size=1`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': `${seller_id} - SelfIntegration`
            }
        });

        if (response.ok) {
            return NextResponse.json({ success: true });
        } else {
            const errText = await response.text();
            return NextResponse.json({ success: false, error: "Trendyol Hatası: " + response.status + " " + errText });
        }

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
