import LegalPageLayout from '@/components/store/LegalPageLayout'
import { createServiceClient } from '@/lib/supabase/service'

export const metadata = { title: 'Çerez Politikası' }
export const dynamic = 'force-dynamic'

/**
 * Metin site_content'ten gelir (panel → Site Metinleri: cerez_politikasi).
 * Anahtar boşsa aşağıdaki taslak basılır — sayfa hiçbir koşulda boş kalmaz.
 * TASLAK: hukuk gözden geçirmesi bekliyor.
 */
const TASLAK = `
<h2>Çerez nedir?</h2>
<p>Çerezler, siteyi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu politika, NB Steelora olarak hangi çerezleri hangi amaçla kullandığımızı açıklar.</p>

<h2>Kullandığımız çerezler</h2>

<h3>1. Zorunlu çerezler (onay gerekmez)</h3>
<ul>
<li><strong>Sepet ve oturum:</strong> Sepetinizin ve giriş durumunuzun korunması için gereklidir.</li>
<li><strong>Güvenlik:</strong> Form gönderimlerinin doğrulanması ve kötüye kullanımın engellenmesi.</li>
<li><strong>Tercih kaydı:</strong> Bu sayfadaki çerez tercihinizi hatırlayan kayıt.</li>
</ul>
<p>Bu çerezler olmadan site çalışmaz; bu nedenle kapatılamaz.</p>

<h3>2. Anonim ziyaret ölçümü (onay gerekmez, çerez kullanılmaz)</h3>
<p>Sitenin hangi sayfalarının ne kadar görüntülendiğini kendi sunucumuzda ölçüyoruz. Bu ölçüm:</p>
<ul>
<li>tarayıcınıza <strong>hiçbir çerez yazmaz</strong>,</li>
<li><strong>IP adresinizi saklamaz</strong> — yalnız günlük değişen bir anahtarla geçici, geri döndürülemez bir oturum numarası üretmek için kullanılır ve hemen atılır,</li>
<li>tarayıcı bilginizden yalnız <strong>cihaz tipini</strong> (telefon, tablet, masaüstü) türetir,</li>
<li>kişisel profil oluşturmaz, sizi başka sitelerde takip etmez.</li>
</ul>
<p>Bu ölçüm toplu istatistik ürettiği ve sizi tanımlamadığı için onayınıza bağlı değildir.</p>

<h3>3. Gelişmiş analitik (yalnız onayınızla)</h3>
<p>Onay verirseniz tarayıcınıza kalıcı bir ziyaretçi numarası yazarız. Bu numara, sitemize daha önce gelip gelmediğinizi ve ziyaretleriniz arasındaki yolculuğu anlamamızı sağlar. Numara yalnız bizim sunucumuzda tutulur, üçüncü taraflarla paylaşılmaz ve reklam amacıyla kullanılmaz. Onayınızı dilediğiniz an geri alabilirsiniz; geri aldığınızda bu numara silinir ve numaraya bağlı kayıtlar anonim hâle getirilir.</p>

<h3>4. Pazarlama çerezleri</h3>
<p>Şu anda sitemizde <strong>hiçbir reklam pikseli veya üçüncü taraf izleyici bulunmamaktadır.</strong> İleride eklenmesi hâlinde, kullanılmadan önce ayrıca onayınız istenecektir.</p>

<h2>Üçüncü taraf hizmetler</h2>
<p>Ödeme işlemleri iyzico altyapısı üzerinden yürütülür ve ödeme adımında iyzico'nun kendi güvenlik çerezleri devreye girer. Kargo takibi için anlaşmalı kargo firmalarıyla yalnız gönderinizi ulaştırmak için gereken bilgiler paylaşılır.</p>

<h2>Saklama süresi</h2>
<p>Ölçüm kayıtları en fazla <strong>13 ay</strong> saklanır ve sonrasında silinir. Onay kayıtlarınız, onayın varlığını kanıtlayabilmek amacıyla mevzuatın öngördüğü süre boyunca tutulur.</p>

<h2>Tercihlerinizi değiştirme</h2>
<p>Sayfanın en altındaki <strong>“Çerez tercihleri”</strong> bağlantısına tıklayarak seçimlerinizi dilediğiniz an güncelleyebilir veya geri alabilirsiniz. Ayrıca tarayıcınızın ayarlarından çerezleri silebilir ya da engelleyebilirsiniz; zorunlu çerezleri engellemeniz hâlinde sepet gibi işlevler çalışmayabilir.</p>

<h2>Haklarınız</h2>
<p>KVKK kapsamındaki haklarınızı (bilgi talep etme, silme, düzeltme) kullanmak için <a href="mailto:info@nbsteelora.com">info@nbsteelora.com</a> adresine yazabilirsiniz. Talebiniz en geç 30 gün içinde sonuçlandırılır.</p>
`

export default async function CerezPolitikasiPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('site_content')
    .select('value')
    .eq('key', 'cerez_politikasi')
    .maybeSingle()

  const icerik = (data?.value || '').trim() || TASLAK

  return (
    <LegalPageLayout eyebrow="Gizlilik" title="Çerez Politikası">
      <div dangerouslySetInnerHTML={{ __html: icerik }} />
    </LegalPageLayout>
  )
}
