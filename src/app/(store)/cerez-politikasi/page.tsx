import LegalPageLayout from '@/components/store/LegalPageLayout'
import { createServiceClient } from '@/lib/supabase/service'
import { kunyeGetir, kunyeHtml } from '@/lib/legal/veriSorumlusu'
import { envanterTablosuHtml } from '@/lib/legal/cerezEnvanteri'
import {
  HAKLAR_HTML,
  HUKUKI_SEBEPLER_HTML,
  SAKLAMA_HTML,
  YURTDISI_HTML,
  basvuruHtml,
} from '@/lib/legal/metinler'
import { CONSENT_VERSION } from '@/lib/analytics/consent'

export const metadata = { title: 'Çerez Politikası' }
export const dynamic = 'force-dynamic'

/**
 * Çerez Politikası (Faz 12 hukuki tamamlama).
 *
 * Yapı: künye → giriş → çerez tablosu → hukuki sebepler → saklama →
 * yurt dışına aktarım → haklar → başvuru → tercih yönetimi → sürüm/yürürlük.
 *
 * Giriş bölümü site_content.cerez_politikasi anahtarından düzenlenebilir;
 * diğer bölümler kodda tutulur ki mevzuat gereği zorunlu unsurlar yanlışlıkla
 * silinemesin. Tüm metinler taslaktır (avukat onayı ayrı yürüyor).
 */
const GIRIS_TASLAK = `
<h2>Çerez nedir?</h2>
<p>Çerezler, siteyi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu politika, hangi çerezleri ve benzeri teknolojileri (yerel depolama dahil) hangi amaçla kullandığımızı, ne kadar süreyle sakladığımızı ve tercihlerinizi nasıl yönetebileceğinizi açıklar.</p>

<h2>Kısaca</h2>
<ul>
<li>Çerez tercihinizi belirlemeden önce sitemizde <strong>hiçbir çerez yazılmaz</strong>.</li>
<li>Ziyaret sayımımız çerezsizdir; <strong>IP adresiniz saklanmaz</strong> ve kişisel profil oluşturulmaz.</li>
<li>Kalıcı ziyaretçi numarası <strong>yalnızca açık rızanızla</strong> yazılır ve rızanızı geri aldığınızda silinir.</li>
<li>Sitemizde <strong>reklam pikseli veya üçüncü taraf izleyici bulunmamaktadır</strong>.</li>
</ul>
`.trim()

export default async function CerezPolitikasiPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('site_content')
    .select('key, value')
    .in('key', ['cerez_politikasi', 'cerez_politikasi_surum', 'cerez_politikasi_yururluk'])

  const icerik = Object.fromEntries((data || []).map((r: any) => [r.key, (r.value || '').trim()]))
  const kunye = await kunyeGetir()

  const giris = icerik.cerez_politikasi || GIRIS_TASLAK
  // Sürüm rıza kaydıyla aynı olmalı: panelde boşsa koddaki rıza sürümü basılır.
  const surum = icerik.cerez_politikasi_surum || CONSENT_VERSION
  const yururluk = icerik.cerez_politikasi_yururluk || ''

  const bolumler = [
    kunyeHtml(kunye),
    giris,
    '<h2>Kullandığımız çerezler ve yerel depolama</h2>' + envanterTablosuHtml(),
    HUKUKI_SEBEPLER_HTML,
    SAKLAMA_HTML,
    YURTDISI_HTML,
    HAKLAR_HTML,
    basvuruHtml(kunye.iletisim, kunye.kep),
    `
<h2>Tercihlerinizi yönetme</h2>
<p>
Sayfanın en altındaki <strong>“Çerez tercihleri”</strong> bağlantısına tıklayarak seçimlerinizi
dilediğiniz an güncelleyebilir veya geri alabilirsiniz. Ayrıca tarayıcınızın ayarlarından
çerezleri silebilir ya da engelleyebilirsiniz; zorunlu çerezleri engellemeniz hâlinde sepet gibi
işlevler çalışmayabilir.
</p>
<p>
Kişisel verilerinizin korunmasına ilişkin genel bilgilendirme için
<a href="/kvkk">KVKK Aydınlatma Metni</a> sayfamızı inceleyebilirsiniz.
</p>`.trim(),
    `
<hr>
<p><small>
<strong>Sürüm:</strong> ${surum}${yururluk ? ` · <strong>Yürürlük tarihi:</strong> ${yururluk}` : ''}<br>
Bu politikanın sürümü, çerez tercihinizi kaydederken tutulan sürüm bilgisiyle aynıdır; böylece
hangi metin sürümüne onay verdiğiniz izlenebilir. Politika güncellendiğinde tercihiniz yeniden
sorulur.
</small></p>`.trim(),
  ].filter(Boolean)

  return (
    <LegalPageLayout eyebrow="Gizlilik" title="Çerez Politikası">
      <div dangerouslySetInnerHTML={{ __html: bolumler.join('\n') }} />
    </LegalPageLayout>
  )
}
