document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btn-save');
    const btnDownload = document.getElementById('btn-download-imgs');
    const statusDiv = document.getElementById('status');
    const pTitle = document.getElementById('p-title');
    const pPrice = document.getElementById('p-price');
    const pTargetPrice = document.getElementById('p-target-price');
    const pImage = document.getElementById('p-image');
    const attrsContainer = document.getElementById('attrs-container');
    const imgCountBadge = document.getElementById('img-count');

    let currentProduct = null;
    const API_URL = 'https://ortakbarkod.vercel.app/api/arbitrage/watchlist';

    // Helper to visualize attributes
    function renderAttributes(attrs) {
        if (!attrs || Object.keys(attrs).length === 0) {
            attrsContainer.innerHTML = "<span style='color:#666'>Özellik bulunamadı</span>";
            return;
        }
        let html = "";
        Object.entries(attrs).forEach(([k, v]) => {
            html += `<span class="tag">${k}: ${v}</span>`;
        });
        attrsContainer.innerHTML = html;
    }

    // 1. Get Details
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_DETAILS" }, function (response) {
            if (response) {
                currentProduct = response;

                // Populate Inputs
                pTitle.value = response.title || '';
                pPrice.value = response.price || 0;
                pImage.src = response.image || ''; // Preview Main

                // Suggest a target price (10% profit?)
                // pTargetPrice.value = (response.price * 1.2).toFixed(2); 

                // Render Attributes
                renderAttributes(response.attributes);

                // Image Count
                if (response.images && response.images.length > 0) {
                    imgCountBadge.innerText = `${response.images.length} Görsel`;
                    imgCountBadge.style.display = 'block';
                    btnDownload.innerText = `📸 ${response.images.length} Görseli İndir`;
                }

            } else {
                statusDiv.innerText = "Veri çekilemedi. Sayfayı yenileyin.";
                statusDiv.className = "status error";
                btnSave.disabled = true;
                btnDownload.disabled = true;
            }
        });
    });

    // 2. Download Logic (Downloads images one by one)
    btnDownload.addEventListener('click', async () => {
        if (!currentProduct || !currentProduct.images) return;

        btnDownload.disabled = true;
        btnDownload.innerText = "İndiriliyor...";

        // We need 'downloads' permission in manifest.
        // If not available, we can try creating anchor tags.

        try {
            for (let i = 0; i < currentProduct.images.length; i++) {
                const url = currentProduct.images[i];
                const filename = `urun-gorsel-${i + 1}.jpg`;

                // Use Chrome API if possible
                if (chrome.downloads) {
                    chrome.downloads.download({
                        url: url,
                        filename: "arbitraj/" + filename
                    });
                } else {
                    // Fallback
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.target = "_blank";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    await new Promise(r => setTimeout(r, 500)); // Pause
                }
            }
            statusDiv.innerText = "İndirme başlatıldı.";
            statusDiv.className = "status success";
        } catch (e) {
            statusDiv.innerText = "İndirme hatası: " + e.message;
            statusDiv.className = "status error";
        } finally {
            btnDownload.disabled = false;
            btnDownload.innerText = `📸 ${currentProduct.images.length} Görseli İndir`;
        }
    });

    // 3. Save Logic
    btnSave.addEventListener('click', async () => {
        if (!currentProduct) return;

        btnSave.disabled = true;
        btnSave.innerText = "Kaydediliyor...";
        statusDiv.innerText = "";

        const payload = {
            product_name: pTitle.value,
            current_price: parseFloat(pPrice.value),
            target_price: parseFloat(pTargetPrice.value) || 0,
            image_url: currentProduct.image,
            product_url: currentProduct.url,
            market_name: currentProduct.market,
            currency: 'TRY',
            stock_status: 'Stokta',
            // New Fields
            attributes: currentProduct.attributes,
            images: currentProduct.images
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                statusDiv.innerText = "✅ Başarıyla Kaydedildi!";
                statusDiv.className = "status success";
                btnSave.innerText = "Tamamlandı";
            } else {
                throw new Error(result.error || "Sunucu hatası");
            }
        } catch (error) {
            statusDiv.innerText = "❌ Hata: " + error.message;
            statusDiv.className = "status error";
            btnSave.disabled = false;
            btnSave.innerText = "Tekrar Dene";
        }
    });
});
