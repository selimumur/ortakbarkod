// content.js - Enhanced for Attributes & Multiple Images

function getTrendyolData() {
    try {
        // 1. Try React State (Most reliable)
        if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__) {
            const product = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product;

            // Attributes
            const attributes = {};
            if (product.attributes) {
                product.attributes.forEach(attr => {
                    attributes[attr.key.name] = attr.value.name;
                });
            }

            // Images
            const images = product.images.map(img => "https://cdn.dsmcdn.com/" + img);

            return {
                title: product.name,
                price: product.price.sellingPrice.value,
                image: images[0],
                images: images,
                market: 'Trendyol',
                attributes: attributes,
                url: window.location.href
            };
        }
    } catch (e) { console.log('Trendyol state error', e); }

    // 2. DOM Scraper Fallback
    const attributes = {};

    // Standard Detail Attributes
    document.querySelectorAll('.detail-attr-item').forEach(item => {
        const key = item.querySelector('.attr-name')?.innerText?.trim();
        const val = item.querySelector('.attr-value')?.innerText?.trim();
        if (key && val) attributes[key] = val;
    });

    // Specific Request: .product-attributes-section
    const attrSection = document.querySelector('.product-attributes-section');
    if (attrSection) {
        // Try to find list items or rows
        attrSection.querySelectorAll('li, .attribute-item').forEach(li => {
            // Try explicit selectors first
            const keyEl = li.querySelector('.attribute-label') || li.querySelector('strong') || li.querySelector('span:first-child');
            const valEl = li.querySelector('.attribute-value') || li.querySelector('span:last-child');

            if (keyEl && valEl && keyEl !== valEl) {
                attributes[keyEl.innerText.replace(':', '').trim()] = valEl.innerText.trim();
            } else {
                // Text fallback logic
                const txt = li.innerText.trim();
                if (txt.includes(':')) {
                    const parts = txt.split(':');
                    if (parts.length >= 2) {
                        attributes[parts[0].trim()] = parts.slice(1).join(':').trim();
                    }
                }
            }
        });
    }

    // Images Fallback
    const images = [];
    document.querySelectorAll('.product-slide img').forEach(img => {
        if (img.src) images.push(img.src);
    });

    return {
        title: document.querySelector('.pr-new-br span')?.innerText || document.title,
        price: parseFloat(document.querySelector('.prc-dsc')?.innerText?.replace(/[^0-9,]/g, '').replace(',', '.') || 0),
        image: document.querySelector('.product-slide img')?.src,
        images: images.length > 0 ? images : [document.querySelector('.product-slide img')?.src],
        attributes: attributes,
        market: 'Trendyol',
        url: window.location.href
    };
}

function getHepsiburadaData() {
    // Similar logic for HB (Parsing JSON-LD is best)
    try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (let s of scripts) {
            const json = JSON.parse(s.innerText);
            if (json['@type'] === 'Product') {
                return {
                    title: json.name,
                    price: parseFloat(json.offers?.price || 0),
                    image: json.image,
                    images: Array.isArray(json.image) ? json.image : [json.image],
                    market: 'Hepsiburada',
                    attributes: {}, // HB often doesn't put attributes in JSON-LD
                    url: window.location.href
                };
            }
        }
    } catch (e) { }

    // DOM Fallback
    const attributes = {};
    document.querySelectorAll('.data-list-tech-spec tr').forEach(tr => {
        const key = tr.querySelector('th')?.innerText?.trim();
        const val = tr.querySelector('td')?.innerText?.trim();
        if (key && val) attributes[key] = val;
    });

    return {
        title: document.querySelector('h1#product-name')?.innerText || document.title,
        price: 0, // Complex on HB DOM
        image: "",
        images: [],
        attributes: attributes,
        market: 'Hepsiburada',
        url: window.location.href
    }
}

function getGenericData() {
    return {
        title: document.title,
        price: 0,
        image: "",
        images: [],
        attributes: {},
        market: window.location.hostname,
        url: window.location.href
    };
}

function extractProductDetails() {
    const host = window.location.hostname;
    let data;

    if (host.includes('trendyol')) data = getTrendyolData();
    else if (host.includes('hepsiburada')) data = getHepsiburadaData();
    else data = getGenericData();

    if (!data) data = getGenericData();

    // Ensure fields exist
    if (!data.images) data.images = data.image ? [data.image] : [];
    if (!data.attributes) data.attributes = {};

    return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_DETAILS") {
        sendResponse(extractProductDetails());
    }
});
