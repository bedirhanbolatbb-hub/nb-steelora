import LegalPageLayout from '@/components/store/LegalPageLayout'
import { kunyeGetir, kunyeHtml } from '@/lib/legal/veriSorumlusu'
import { HAKLAR_HTML, YURTDISI_HTML, basvuruHtml } from '@/lib/legal/metinler'

export const metadata = { title: 'KVKK Aydınlatma Metni' }
export const dynamic = 'force-dynamic'

/**
 * KVKK Aydınlatma Metni (Faz 12 hukuki tamamlama).
 * Eklenenler: veri sorumlusu künyesi (site_content'ten), yurt dışına aktarım
 * (m.9), m.11 haklarının tamamı, Tebliğ'e uygun başvuru kanalları, site içi
 * ölçüm paragrafı. Metin taslaktır; avukat onayı ayrı yürüyor.
 */
export default async function KvkkPage() {
  const kunye = await kunyeGetir()

  // Künye panelden doldurulmadıysa mevcut asgari bilgiyle basılır — sayfa
  // hiçbir koşulda "veri sorumlusu" başlığı olmadan yayına çıkmaz.
  const kunyeBlok =
    kunyeHtml(kunye) ||
    `<h2>Veri Sorumlusu</h2>
<p>NB Steelora<br>Mezitli / Mersin / Türkiye<br>E-posta: info@nbsteelora.com</p>`

  const govde = [
    `<p>
6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, kişisel verilerinizin
veri sorumlusu sıfatıyla tarafımızca işlenmesine ilişkin sizleri bilgilendirmek isteriz.
</p>`,
    kunyeBlok,
    `<h2>İşlenen Kişisel Veriler</h2>
<ul>
<li><strong>Kimlik:</strong> Ad, soyad</li>
<li><strong>İletişim:</strong> E-posta adresi, telefon numarası, teslimat adresi</li>
<li><strong>Müşteri işlem:</strong> Sipariş geçmişi, sepet içeriği, ödeme durumu, kargo takip bilgisi, ürün yorumları</li>
<li><strong>İşlem güvenliği:</strong> Bağlantı kayıtları, tarayıcı ve cihaz bilgisi</li>
<li><strong>Pazarlama:</strong> Bülten aboneliği (yalnız kendiniz kaydolduysanız)</li>
</ul>
<p>
Ödeme kartı bilgileriniz tarafımızca <strong>görülmez ve saklanmaz</strong>; doğrudan iyzico
Ödeme Hizmetleri A.Ş. altyapısında işlenir.
</p>`,
    `<h2>İşleme Amaçları ve Hukuki Sebepler</h2>
<ul>
<li><strong>Siparişin alınması, ödemenin yürütülmesi ve teslimat:</strong> Sözleşmenin kurulması ve ifası (m.5/2-c).</li>
<li><strong>Fatura, muhasebe ve yasal kayıtlar:</strong> Hukuki yükümlülüğün yerine getirilmesi (m.5/2-ç).</li>
<li><strong>Müşteri destek talepleri ve iade/değişim süreçleri:</strong> Sözleşmenin ifası ve meşru menfaat (m.5/2-c, m.5/2-f).</li>
<li><strong>Site güvenliği ve kötüye kullanımın önlenmesi:</strong> Meşru menfaat (m.5/2-f).</li>
<li><strong>Bülten ve tanıtım iletileri:</strong> Açık rıza (m.5/1).</li>
<li><strong>Gelişmiş site içi ölçüm (kalıcı ziyaretçi numarası):</strong> Açık rıza (m.5/1).</li>
</ul>`,
    `<h2>Site İçi Ölçüm</h2>
<p>
Sitemizde üçüncü taraf analitik hizmeti (ör. reklam ağları, harici izleyiciler)
<strong>kullanılmamaktadır</strong>. Sayfa görüntülemelerini kendi sunucumuzda sayarız; bu temel
sayımda tarayıcınıza çerez yazılmaz, IP adresiniz saklanmaz ve kimliğinizi belirlemeye yarayan
bir kayıt tutulmaz. Tekrar gelen ziyaretçileri tanıyabilmemizi sağlayan kalıcı ziyaretçi numarası
yalnızca açık rızanızla oluşturulur ve rızanızı geri aldığınızda silinir. Ayrıntılar için
<a href="/cerez-politikasi">Çerez Politikası</a> sayfamıza bakabilirsiniz.
</p>`,
    `<h2>Kişisel Verilerin Aktarıldığı Taraflar</h2>
<ul>
<li><strong>iyzico Ödeme Hizmetleri A.Ş.:</strong> Ödeme işleminin güvenli şekilde yürütülmesi (yurt içi).</li>
<li><strong>Anlaşmalı kargo firmaları:</strong> Gönderinin teslim edilmesi; yalnız ad, adres ve telefon bilgisi (yurt içi).</li>
<li><strong>Barındırma, veritabanı ve e-posta hizmet sağlayıcıları:</strong> Sitenin ve bildirim e-postalarının çalışabilmesi (aşağıdaki bölüme bakınız).</li>
<li><strong>Yetkili kamu kurum ve kuruluşları:</strong> Mevzuattan doğan talep hâlinde.</li>
</ul>`,
    YURTDISI_HTML,
    `<h2>Saklama Süreleri</h2>
<p>
Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca ve ilgili mevzuatın öngördüğü
zamanaşımı süreleri kadar saklanır. Sipariş ve fatura kayıtları Türk Ticaret Kanunu ile Vergi Usul
Kanunu uyarınca <strong>10 yıl</strong>; site içi ölçüm kayıtları <strong>13 ay</strong>; çerez
tercihi (rıza) kayıtları rızanın geri alınmasından itibaren <strong>10 yıl</strong> süreyle tutulur.
Süre sonunda verileriniz silinir, yok edilir veya anonim hâle getirilir.
</p>`,
    HAKLAR_HTML,
    basvuruHtml(kunye.eposta, kunye.kep, kunye.adres),
  ].join('\n')

  return (
    <LegalPageLayout eyebrow="Hukuk" title="KVKK Aydınlatma Metni">
      <div dangerouslySetInnerHTML={{ __html: govde }} />
    </LegalPageLayout>
  )
}
