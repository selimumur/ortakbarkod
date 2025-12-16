import * as cheerio from 'cheerio';

export async function scrapeProduct(url: string) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            // If 403 or 404, we might still want to try returning partial data if available, but usually it's blocking.
            // For now, throw to handle in caller.
            console.error(`Scraper fetch failed: ${res.status} ${res.statusText} for ${url}`);
            throw new Error(`URL erişilemedi: ${res.status}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // --- 1. Basic Metadata Extraction (OpenGraph) ---
        let title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
        let image = $('meta[property="og:image"]').attr('content');
        let siteName = $('meta[property="og:site_name"]').attr('content');

        // Clean title
        if (siteName) {
            title = title.replace(` | ${siteName}`, '').replace(` - ${siteName}`, '');
        }
        title = title.replace(' - Trendyol', '').replace(' - Hepsiburada', '').replace(' | Amazon.com.tr', '').trim();


        // --- 2. Price Extraction Strategies ---
        let price = 0;

        // A. JSON-LD (Most reliable if present)
        $('script[type="application/ld+json"]').each((_, el) => {
            if (price > 0) return; // Found already
            try {
                const jsonText = $(el).html();
                if (!jsonText) return;
                const json = JSON.parse(jsonText);

                // Handle single Product
                if (json['@type'] === 'Product' || json['@type'] === 'Offer') {
                    extractPriceFromJson(json);
                }
                // Handle Graph array
                else if (json['@graph'] && Array.isArray(json['@graph'])) {
                    json['@graph'].forEach((item: any) => {
                        if (item['@type'] === 'Product' || item['@type'] === 'Offer') {
                            extractPriceFromJson(item);
                        }
                    });
                }
            } catch (e) { /* ignore */ }
        });

        function extractPriceFromJson(obj: any) {
            if (price > 0) return;
            const offer = obj.offers;
            if (offer) {
                // If offers is array (AggregateOffer)
                if (Array.isArray(offer)) {
                    // Get lowPrice or first price
                    const p = offer[0].price || offer[0].lowPrice || offer[0].highPrice;
                    if (p) price = parseFloat(p);
                } else {
                    const p = offer.price || offer.lowPrice || offer.highPrice;
                    if (p) price = parseFloat(p);
                }
            }
        }

        // B. Fallback Selectors (If JSON-LD failed)
        if (!price) {
            // Trendyol
            if (url.includes('trendyol.com')) {
                const pText = $('.prc-dsc').text() || $('.product-price-container').text() || $('.featured-prices .ps-curr').text();
                if (pText) price = parsePriceText(pText);
            }
            // Hepsiburada
            else if (url.includes('hepsiburada.com')) {
                const pText = $('[data-bind="markupText:\'currentPriceBeforePoint\'"]').text() ||
                    $('#offering-price span').first().text() ||
                    $('.product-price-wrapper span').first().text();
                if (pText) price = parsePriceText(pText);
            }
            // Amazon
            else if (url.includes('amazon')) {
                const whole = $('.a-price-whole').first().text();
                const fraction = $('.a-price-fraction').first().text();
                if (whole) {
                    price = parsePriceText(whole + (fraction ? ',' + fraction : ''));
                }
            }
            // General Fallback (OpenGraph Price)
            else {
                const ogPrice = $('meta[property="og:price:amount"]').attr('content') ||
                    $('meta[property="product:price:amount"]').attr('content');
                if (ogPrice) price = parseFloat(ogPrice);
            }
        }

        // Last ditch fallback for specific problematic layouts? 
        // Sometimes Hepsiburada classes change dynamically. 
        // Just rely on what we have.


        // --- 3. Infer Missing Metadata ---

        // Detect Market Name from URL if OG is missing
        if (!siteName) {
            if (url.includes('trendyol.com')) siteName = 'Trendyol';
            else if (url.includes('amazon.')) siteName = 'Amazon';
            else if (url.includes('hepsiburada.com')) siteName = 'Hepsiburada';
            else if (url.includes('n11.com')) siteName = 'n11';
            else siteName = new URL(url).hostname.replace('www.', '');
        }

        // If Image missing, try simple selectors
        if (!image) {
            if (url.includes('trendyol')) image = $('.base-product-image img').attr('src');
            else if (url.includes('hepsiburada')) image = $('img.product-image').attr('src');
            else if (url.includes('amazon')) image = $('#landingImage').attr('src');
        }


        // Validation
        if (!title && !price) {
            return {
                success: false,
                data: null,
                error: "Ürün bilgileri çekilemedi (Captcha veya bilinmeyen yapı)."
            };
        }

        return {
            success: true,
            data: {
                product_name: title || "İsimsiz Ürün",
                product_url: url,
                image_url: image || "", // Allow empty image
                market_name: siteName,
                current_price: price || 0,
                currency: 'TRY',
                stock_status: price > 0 ? 'Stokta' : 'Stok Yok'
            }
        };

    } catch (error: any) {
        console.error("Scrape Error:", error.message);
        return { success: false, error: error.message };
    }
}

function parsePriceText(text: string): number {
    if (!text) return 0;

    // Remove currency symbols and whitespace
    let clean = text.replace(/TL|TRY|USD|EUR|€|\$|\s/g, '').trim();

    // European format (common in TR): 1.234,56 -> 1234.56
    // US format: 1,234.56 -> 1234.56

    // Simple heuristic: 
    // If it has comma as last separator -> comma is decimal
    // If it has dot as last separator -> dot is decimal

    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > lastDot) {
        // 1.250,90 or 1250,90 case
        clean = clean.replace(/\./g, ''); // remove thousands dots
        clean = clean.replace(',', '.');  // replace decimal comma
    } else if (lastDot > lastComma) {
        // 1,250.90 or 1250.90 case
        clean = clean.replace(/,/g, ''); // remove thousands commas
    }
    // Else (no separators or only one type not appearing as separator?)
    // Actually if only one exists (e.g. 1500), parseFloat handles it.
    // If 1500,50 -> comma is found, dot is -1. lastComma > lastDot triggers first block. Correct.
    // If 1500.50 -> dot found. lastDot > lastComma triggers second block. Correct.

    return parseFloat(clean) || 0;
}
