import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Gizlilik Politikası | OrtakBarkod',
    description: 'OrtakBarkod Gizlilik Politikası ve veri işleme kuralları.',
};

export default function PrivacyPage() {
    return (
        <article className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-black mb-2">Gizlilik Politikası</h1>
            <p className="text-sm text-gray-500 mb-8">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>

            <p className="lead text-lg text-gray-700">
                OrtakBarkod ("Şirket", "Biz") olarak, kullanıcılarımızın ("Kullanıcı", "Siz") gizliliğine büyük önem veriyoruz.
                Bu Gizlilik Politikası, platformumuzu kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
            </p>

            <h3>1. Toplanan Veriler</h3>
            <p>Hizmetlerimizi sunabilmek için aşağıdaki veri türlerini toplayabiliriz:</p>
            <ul>
                <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, T.C. kimlik numarası (gerekirse).</li>
                <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, adres.</li>
                <li><strong>İşlem Güvenliği Bilgileri:</strong> IP adresi, log kayıtları, cihaz bilgileri.</li>
                <li><strong>Müşteri İşlem Bilgileri:</strong> Siparişler, fatura detayları, ödeme geçmişi.</li>
            </ul>

            <h3>2. Verilerin Kullanım Amacı</h3>
            <p>Topladığımız veriler şu amaçlarla işlenmektedir:</p>
            <ul>
                <li>Hizmetlerin sağlanması, üyelik işlemlerinin gerçekleştirilmesi.</li>
                <li>Yasal yükümlülüklerin (örneğin fatura kesme, vergi mevzuatı) yerine getirilmesi.</li>
                <li>Müşteri desteği sağlama ve sorun giderme.</li>
                <li>Platform güvenliğinin sağlanması ve dolandırıcılığın önlenmesi.</li>
            </ul>

            <h3>3. Verilerin Paylaşımı</h3>
            <p>
                Kişisel verileriniz, yasal zorunluluklar haricinde ve açık rızanız olmaksızın üçüncü taraflarla paylaşılmaz.
                Ancak, hizmeti sağlamak için iş birliği yaptığımız tedarikçiler (örn: sunucu hizmeti, ödeme altyapısı) ile gerekli güvenlik önlemleri altında paylaşılabilir.
            </p>

            <h3>4. Çerezler (Cookies)</h3>
            <p>
                Platformumuzda kullanıcı deneyimini iyileştirmek için çerezler kullanılmaktadır.
                Tarayıcı ayarlarınızdan çerezleri yönetebilir veya engelleyebilirsiniz, ancak bu durumda platformun bazı özellikleri düzgün çalışmayabilir.
            </p>

            <h3>5. Veri Güvenliği</h3>
            <p>
                Verilerinizi korumak için endüstri standardı güvenlik önlemleri (SSL şifreleme, güvenlik duvarları, erişim kontrolleri) uygulamaktayız.
                Ancak internet üzerinden veri iletiminin %100 güvenli olduğunu garanti edemeyiz.
            </p>

            <h3>6. İletişim</h3>
            <p>
                Gizlilik politikamızla ilgili sorularınız için bizimle iletişime geçebilirsiniz:<br />
                <strong>E-posta:</strong> destek@ortakbarkod.com<br />
                <strong>Adres:</strong> Teknopark İstanbul, Pendik/İstanbul
            </p>
        </article>
    );
}
