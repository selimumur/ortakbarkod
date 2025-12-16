import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Kullanım Koşulları | OrtakBarkod',
    description: 'OrtakBarkod platformu kullanım koşulları ve üyelik sözleşmesi.',
};

export default function TermsPage() {
    return (
        <article className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-black mb-2">Kullanım Koşulları</h1>
            <p className="text-sm text-gray-500 mb-8">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>

            <p className="lead text-lg text-gray-700">
                Bu Kullanım Koşulları ("Sözleşme"), OrtakBarkod platformunu ("Hizmet") kullanan tüm ziyaretçi ve üyeler ("Kullanıcı") için geçerlidir.
                Platforma üye olarak veya kullanarak bu koşulları kabul etmiş sayılırsınız.
            </p>

            <h3>1. Hizmetin Kapsamı</h3>
            <p>
                OrtakBarkod, e-ticaret satıcıları için envanter yönetimi, pazaryeri entegrasyonu ve finansal takip araçları sunan bir SaaS (Hizmet Olarak Yazılım) platformudur.
                Şirket, hizmetin özelliklerini, fiyatlarını ve kapsamını dilediği zaman değiştirme hakkını saklı tutar.
            </p>

            <h3>2. Üyelik ve Hesap Güvenliği</h3>
            <ul>
                <li>Kullanıcı, kayıt olurken verdiği bilgilerin doğru ve güncel olduğunu taahhüt eder.</li>
                <li>Hesap şifresinin güvenliğinden Kullanıcı sorumludur. Şifre paylaşımı nedeniyle doğacak zararlardan Şirket sorumlu tutulamaz.</li>
                <li>Şüpheli işlem tespiti durumunda Şirket, hesabı askıya alma veya kapatma hakkına sahiptir.</li>
            </ul>

            <h3>3. Kullanım Kuralları</h3>
            <p>Kullanıcı, platformu aşağıdaki amaçlarla kullanamaz:</p>
            <ul>
                <li>Yasadışı, suç teşkil eden veya başkalarının haklarını ihlal eden faaliyetler.</li>
                <li>Platformun teknik altyapısına zarar verecek siber saldırılar veya veri madenciliği.</li>
                <li>Spam, zararlı yazılım dağıtımı veya dolandırıcılık.</li>
            </ul>

            <h3>4. Ödeme ve Abonelik</h3>
            <p>
                Hizmetin bazı bölümleri ücretli abonelik gerektirebilir. Ücretler, ödeme döneminin başında peşin olarak tahsil edilir.
                Ödeme yapılmaması durumunda hizmet erişimi kısıtlanabilir veya durdurulabilir. İade politikamız, ilgili mesafeli satış sözleşmesinde belirtilmiştir.
            </p>

            <h3>5. Fikri Mülkiyet</h3>
            <p>
                OrtakBarkod platformunun tasarımı, yazılımı, logoları ve tüm içeriği Şirket'in mülkiyetindedir.
                İzinsiz kopyalanması, çoğaltılması veya tersine mühendislik yapılması yasaktır.
            </p>

            <h3>6. Sorumluluk Reddi</h3>
            <p>
                Platform "olduğu gibi" sunulmaktadır. Şirket, kesintisiz hizmet, hatasızlık veya belirli bir amaca uygunluk garantisi vermez.
                Platformun kullanımından doğabilecek dolaylı veya doğrudan zararlardan (veri kaybı, kar kaybı vb.) Şirket sorumlu değildir.
            </p>

            <h3>7. Değişiklikler ve Bildirimler</h3>
            <p>
                Şirket, bu koşulları dilediği zaman güncelleyebilir. Güncel koşullar sitede yayınlandığı tarihte yürürlüğe girer.
                Önemli değişiklikler e-posta veya site içi bildirim yoluyla duyurulabilir.
            </p>
        </article>
    );
}
