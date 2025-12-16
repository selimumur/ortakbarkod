import React from 'react';
import { Download, Globe, CheckCircle, AlertTriangle, FolderOpen, Chrome } from 'lucide-react';

export default function ExtensionGuidePage() {
    return (
        <div className="md:p-12 p-6 min-h-full bg-[#0B1120] text-white flex flex-col items-center">

            <div className="text-center mb-12 max-w-3xl">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/30">
                    <Globe size={40} className="text-white" />
                </div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-4">
                    Arbitraj Asistanı Kurulumu
                </h1>
                <p className="text-lg text-gray-400">
                    Bot korumalarına takılmadan, %100 başarı oranıyla ürün eklemek için Chrome eklentisini kullanın.
                </p>
                <div className='mt-6'>
                    <a href="/arbitraj-asistani.zip" download className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-600/20">
                        <Download size={20} />
                        Eklentiyi İndir (.zip)
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Versiyon 1.0 • 15KB</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">

                {/* Step 1 */}
                <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">1</div>
                    <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                        <FolderOpen /> Klasöre Çıkartın
                    </h3>
                    <p className="text-gray-400 mb-4">
                        İndirdiğiniz <code>arbitraj-asistani.zip</code> dosyasını bir klasöre çıkartın.
                    </p>
                    <div className="bg-black/50 p-4 rounded-lg border border-gray-800 font-mono text-xs text-gray-500">
                        /Klasör<br />
                        &nbsp;&nbsp;manifest.json<br />
                        &nbsp;&nbsp;content.js<br />
                        &nbsp;&nbsp;popup.html
                    </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">2</div>
                    <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                        <Chrome /> Chrome Ayarları
                    </h3>
                    <ul className="space-y-3 text-gray-400">
                        <li className="flex gap-2">
                            <span className="w-5 h-5 bg-gray-800 rounded-full flex-shrink-0 flex items-center justify-center text-xs">1</span>
                            Chrome adres çubuğuna <code>chrome://extensions</code> yazın.
                        </li>
                        <li className="flex gap-2">
                            <span className="w-5 h-5 bg-gray-800 rounded-full flex-shrink-0 flex items-center justify-center text-xs">2</span>
                            Sağ üstteki <strong>Geliştirici Modu</strong>nu açın.
                        </li>
                    </ul>
                </div>

                {/* Step 3 */}
                <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">3</div>
                    <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                        <Download /> Yükleyin
                    </h3>
                    <p className="text-gray-400 mb-4">
                        <strong>"Paketlenmemiş öğe yükle"</strong> butonuna tıklayın ve zipi çıkarttığınız klasörü seçin.
                    </p>
                    <div className="p-4 bg-green-900/20 border border-green-900/50 rounded-lg text-green-400 text-sm">
                        İşlem tamam! Tarayıcınızın sağ üst köşesinde Arbitraj Asistanı ikonunu göreceksiniz.
                    </div>
                </div>

                {/* Step 4 */}
                <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">4</div>
                    <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                        <CheckCircle /> Kullanım
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Herhangi bir Trendyol veya Hepsiburada ürün sayfasına gidin. Eklenti ikonuna tıklayın.<br /><br />
                        <ul>
                            <li>• Fiyat ve resim otomatik çekilir.</li>
                            <li>• "Kaydet" butonu ile ürünü tek tıkla panelinize gönderin.</li>
                        </ul>
                    </p>
                </div>

            </div>
        </div>
    );
}
