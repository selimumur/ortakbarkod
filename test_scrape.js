const https = require('https');
const cheerio = require('cheerio');

const url = "https://www.trendyol.com/inarch-dizayn/beliz-modern-led-isikli-3-kapakli-rafli-tv-sehpasi-192-cm-traverten-p-840142428";

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
};

console.log("Fetching URL:", url);

https.get(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status:', res.statusCode);

        try {
            const $ = cheerio.load(data);

            console.log('Title:', $('title').text());

            const jsonLds = $('script[type="application/ld+json"]');
            console.log(`Found ${jsonLds.length} JSON-LD blocks.`);

            jsonLds.each((i, el) => {
                console.log(`--- JSON-LD #${i} ---`);
                const content = $(el).html();
                // Try formatting it
                try {
                    console.log(JSON.stringify(JSON.parse(content), null, 2));
                } catch (e) {
                    console.log(content);
                }
                console.log('---------------------');
            });

            console.log('--- Price Selectors ---');
            console.log('.prc-dsc:', $('.prc-dsc').text());
            console.log('.product-price-container:', $('.product-price-container').text());
            console.log('.ps-curr:', $('.ps-curr').text());
            console.log('.featured-prices:', $('.featured-prices').text());

        } catch (e) {
            console.error("Parse error:", e);
        }
    });

}).on('error', (err) => {
    console.log('Error: ' + err.message);
});
