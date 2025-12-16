import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'KVKK Aydınlatma Metni | OrtakBarkod',
    description: 'Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
};

export default function KVKKPage() {
    return (
        <article className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-black mb-2">KVKK Aydınlatma Metni</h1>
            <p className="text-sm text-gray-500 mb-8">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>

            <p className="lead text-lg text-gray-700">
                Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuat kapsamında,
                OrtakBarkod Yazılım A.Ş. ("Veri Sorumlusu") tarafından kişisel verilerinizin işlenmesi hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.
            </p>

            <h3>1. Veri Sorumlusu</h3>
            <p>
                OrtakBarkod Yazılım A.Ş.<br />
                Adres: Teknopark İstanbul, Pendik/İstanbul<br />
                Mersis No: 012345678900001
            </p>

            <h3>2. İşlenen Kişisel Veriler</h3>
            <p>Tarafımızca işlenebilecek kişisel verileriniz şunlardır:</p>
            <ul>
                <li>Kimlik bilgileriniz (Ad, soyad, T.C. kimlik no).</li>
                <li>İletişim bilgileriniz (E-posta, telefon, adres).</li>
                <li>Müşteri işlem bilgileriniz (Sipariş geçmişi, fatura bilgileri).</li>
                <li>İşlem güvenliği verileriniz (IP adresi, giriş çıkış kayıtları).</li>
            </ul>

            <h3>3. Veri İşleme Amaçları</h3>
            <ul>
                <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
                <li>Sözleşmenin kurulması ve ifası.</li>
                <li>İnsan kaynakları süreçlerinin yürütülmesi.</li>
                <li>Yetkili kişi, kurum ve kuruluşlara bilgi verilmesi.</li>
            </ul>

            <h3>4. Veri Toplama Yöntemi ve Hukuki Sebebi</h3>
            <p>
                Kişisel verileriniz, internet sitemiz, mobil uygulamamız, çağrı merkezimiz veya e-posta yoluyla elektronik ortamda toplanmaktadır.
                Bu veriler, KVKK'nın 5. ve 6. maddelerinde belirtilen "kanunlarda açıkça öngörülmesi", "sözleşmenin kurulması veya ifası",
                "veri sorumlusunun hukuki yükümlülüğü" ve "ilgili kişinin temel haklarına zarar vermemek kaydıyla meşru menfaat" hukuki sebeplerine dayanarak işlenmektedir.
            </p>

            <h3>5. İlgili Kişinin Hakları</h3>
            <p>KVKK'nın 11. maddesi uyarınca veri sahipleri şu haklara sahiptir:</p>
            <ul>
                <li>Kişisel veri işlenip işlenmediğini öğrenme.</li>
                <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme.</li>
                <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme.</li>
                <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme.</li>
                <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme ve silinmesini talep etme.</li>
            </ul>

            <p>
                Haklarınızı kullanmak için taleplerinizi yazılı olarak veya KEP adresi üzerinden şirketimize iletebilirsiniz.
                Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılacaktır.
            </p>
        </article>
    );
}
