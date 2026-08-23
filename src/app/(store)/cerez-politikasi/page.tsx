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
import { CEREZ_SURUMU, surumBloguHtml } from '@/lib/legal/surum'
import { hesapSilmeMetniGetir } from '@/lib/legal/hesapSilmeMetni'

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
<li><strong>Üye girişi yaptığınızda</strong> site içi hareketleriniz (görüntülenen ve favorilenen ürünler, sepet hareketleri, arama sorguları) üyelik hesabınızla ilişkilendirilir; bu kayıtlar 13 ay saklanır, hesabınızı sildiğinizde silinir. Ayrıntı: <a href="/kvkk">KVKK Aydınlatma Metni</a>.</li>
</ul>
`.trim()

export default async function CerezPolitikasiPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('site_content')
    .select('key, value')
    .in('key', ['cerez_politikasi', 'cerez_politikasi_surum', 'cerez_politikasi_yururluk'])

  const icerik = Object.fromEntries((data || []).map((r: any) => [r.key, (r.value || '').trim()]))
  const [kunye, hesapSilmeBlok] = await Promise.all([kunyeGetir(), hesapSilmeMetniGetir()])

  const giris = icerik.cerez_politikasi || GIRIS_TASLAK

  const bolumler = [
    kunyeHtml(kunye),
    giris,
    '<h2>Kullandığımız çerezler ve yerel depolama</h2>' + envanterTablosuHtml(),
    HUKUKI_SEBEPLER_HTML,
    SAKLAMA_HTML,
    YURTDISI_HTML,
    HAKLAR_HTML,
    hesapSilmeBlok,
    basvuruHtml(kunye.eposta, kunye.kep, kunye.adres),
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
    // Sürüm + yürürlük TEK KAYNAKTAN (Faz 26). Panel alanları boşken yürürlük
    // satırı tamamen düşüyordu; artık koddaki tarihe düşer.
    surumBloguHtml(
      CEREZ_SURUMU,
      { surum: icerik.cerez_politikasi_surum, yururluk: icerik.cerez_politikasi_yururluk },
      `Bu politikanın sürümü, çerez tercihinizi kaydederken tutulan sürüm bilgisiyle aynıdır; böylece
hangi metin sürümüne onay verdiğiniz izlenebilir. Politika güncellendiğinde tercihiniz yeniden
sorulur.`
    ),
  ].filter(Boolean)

  return (
    <LegalPageLayout eyebrow="Gizlilik" title="Çerez Politikası">
      <div dangerouslySetInnerHTML={{ __html: bolumler.join('\n') }} />
    </LegalPageLayout>
  )
}
