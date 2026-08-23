import Link from 'next/link'
import LegalPageLayout from '@/components/store/LegalPageLayout'
import { getSiteContent } from '@/lib/supabase/content'
import {
  AYIP_ISPAT_AY,
  AYIP_ZAMANASIMI_YIL,
  AZAMI_TESLIM_GUN,
  CAYMA_SURESI_GUN,
  GERI_GONDERME_GUN,
  GERI_ODEME_GUN,
  HAKEM_HEYETI_SINIRI_TL,
  HAKEM_HEYETI_YILI,
  ONARIM_DEGISIM_IS_GUNU,
  SOZLESME_YOLLARI,
} from '@/lib/legal/sozlesme'
import { FREE_SHIPPING_LABEL } from '@/lib/shipping'
import { ORG_EMAIL } from '@/lib/seo'

export const metadata = { title: 'Kargo, İade ve Değişim' }
export const dynamic = 'force-dynamic'

/**
 * Kargo ve iade sayfası — Faz 20'de yeniden yazıldı.
 *
 * Eski metin üç yerde mevzuata aykırıydı: (1) "İade kargo ücreti alıcıya
 * aittir" — yönetmelikte tüketiciye iade masrafı yükleyen hüküm YOK ve bu
 * cümle kendi ön bilgilendirme formumuzla da çelişiyordu; (2) "5-10 iş günü
 * içinde ödeme iadesi" — yasal sayaç farklı ve üst sınır 14 gün; (3) "48 saat
 * içinde bildirin" — 6502'de ayıp ihbarı için hak düşürücü süre yok, böyle bir
 * süre dayatmak haksız şart.
 *
 * Süreler lib/legal/sozlesme.ts'ten gelir; sayfada elle sayı yazılmaz.
 *
 * TASLAKTIR: avukat onayı alınmadan nihai sayılmamalıdır.
 */
export default async function KargoVeIadePage() {
  const icerik = await getSiteContent()
  const yanitSuresi = (icerik.yanit_suresi_taahhudu ?? '').trim()
  const iadeFirmasi = (icerik.iade_kargo_firmasi ?? '').trim()

  return (
    <LegalPageLayout eyebrow="Yardım" title="Kargo, İade ve Değişim">
      <h2>Kargo</h2>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full border-collapse text-[13px] font-body">
          <tbody>
            {[
              ['Kargo ücreti', <strong key="k">{FREE_SHIPPING_LABEL}</strong>, 'Alt sınır yoktur.'],
              ['Hazırlık süresi', '1–2 iş günü', 'Ödeme onayından sonra kargoya verilir.'],
              ['Tahmini teslim', '1–5 iş günü', 'Kargo firmasının teslim süresine bağlıdır.'],
              ['Yasal azami süre', `${AZAMI_TESLIM_GUN} gün`, 'Aşılırsa sözleşmeyi feshedebilirsiniz.'],
              ['Takip', 'E-posta ile', 'Takip numarası hazır olunca gönderilir.'],
            ].map(([ad, deger, not]) => (
              <tr key={String(ad)} className="border-b border-line last:border-0">
                <td className="py-3 pr-4 align-top text-ink-soft">{ad}</td>
                <td className="py-3 pr-4 align-top font-medium text-ink whitespace-nowrap">{deger}</td>
                <td className="py-3 align-top text-muted">{not}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        Siparişinizi <Link href="/kargo-takip">kargo takip sayfasından</Link> üye olmadan da
        izleyebilirsiniz. Ürünün stokta bulunmaması siparişinizin tek taraflı iptal edilmesi
        sonucunu doğurmaz; böyle bir durumda sizinle iletişime geçeriz.
      </p>

      <h2>Cayma Hakkı (Koşulsuz İade)</h2>
      <p>
        Ürünü teslim aldığınız günden itibaren <strong>{CAYMA_SURESI_GUN} gün</strong>{' '}
        içinde, hiçbir gerekçe göstermeden ve cezai şart ödemeden siparişinizden
        cayabilirsiniz.
      </p>
      <p>
        <strong>Nasıl yapılır?</strong> Hesabım → Siparişlerim ekranından iade talebi
        oluşturun,{' '}
        <Link href={SOZLESME_YOLLARI.caymaFormu}>örnek cayma formunu</Link> gönderin ya da
        {' '}{ORG_EMAIL} adresine sipariş numaranızla birlikte bir e-posta yazın. Form
        doldurmak zorunlu değildir. Talebiniz bize ulaştığında size derhâl teyit bildirimi
        gönderilir.
      </p>
      <p>
        <strong>Ürünü geri gönderme.</strong> Cayma bildiriminizi gönderdiğiniz tarihten
        itibaren <strong>{GERI_GONDERME_GUN} gün</strong> içinde ürünü bize ulaştırın.
        Ürünü, işleyişini ve özelliklerini anlamak için makul ölçüde inceleyebilirsiniz;
        bu incelemeden doğan değişikliklerden sorumlu tutulmazsınız.{' '}
        <strong>Ambalajı açmanız cayma hakkınızı ortadan kaldırmaz.</strong>
      </p>
      <p>
        <strong>İade kargo ücreti tarafımıza aittir.</strong>{' '}
        {iadeFirmasi ? (
          <>İade gönderileriniz <strong>{iadeFirmasi}</strong> ile yapılır; kargo firmasını ve iade kodunu talebiniz onaylandığında e-posta ile bildiririz.</>
        ) : (
          <>Talebiniz onaylandığında kullanacağınız kargo firmasını ve iade kodunu e-posta ile bildiririz. İade ücretini hiçbir hâlde sizden talep etmeyiz.</>
        )}
      </p>
      <p>
        <strong>Geri ödeme.</strong> Ürünü iade kargosuna teslim ettiğiniz tarihten itibaren
        en geç <strong>{GERI_ODEME_GUN} gün</strong> içinde iade işlemini başlatırız; varsa
        teslimat masrafları dâhil tahsil edilen tüm tutar, ödeme yaptığınız yönteme tek
        seferde iade edilir. Kredi kartı ile ödediyseniz bankanız, bize ulaşan tutarı
        kullanılabilir limitinize tek seferde eklemekle yükümlüdür;{' '}
        <strong>kartınıza yansıması bankanıza bağlı olarak 3–7 iş günü sürebilir</strong> ve
        bu süre bizim kontrolümüzde değildir.
      </p>

      <h2>Cayma Hakkının Kullanılamadığı Ürünler</h2>
      <p>Mevzuat gereği yalnızca iki durumda cayma hakkı kullanılamaz:</p>
      <ul>
        <li>
          <strong>Kişiye özel hazırlanan ürünler</strong> — isim, harf veya tarih
          yazdırılan, ya da özel ölçüye göre üretilen ürünler.
        </li>
        <li>
          <strong>Hijyen mührü açılmış küpe, piercing ve benzeri vücut deldirme takıları.</strong>{' '}
          Bu ürünler koruyucu bant/mühürle gönderilir; mühür açılmamışsa cayma hakkınız
          aynen geçerlidir.
        </li>
      </ul>
      <p>
        Kolye, bileklik, yüzük ve halhal gibi diğer tüm ürünlerde ambalajı açmanız iade
        hakkınızı etkilemez.
      </p>

      <h2>Değişim</h2>
      <p>
        Beden ya da model değişimi istiyorsanız, cayma hakkınızı kullanıp iade oluşturmanız
        ve yeni ürünü ayrıca sipariş etmeniz en hızlı yoldur — böylece yeni ürün stoktan
        ayrılır ve beklemezsiniz. Değişimde de kargo ücreti tarafımıza aittir. Ayıplı bir
        ürün söz konusuysa aşağıdaki haklarınız geçerlidir.
      </p>

      <h2>Ayıplı, Hasarlı veya Yanlış Ürün</h2>
      <p>
        Kargo sürecinde hasar gören, eksik, kırık ya da siparişinizden farklı bir ürün
        ulaştıysa {ORG_EMAIL} adresine ürünün ve kargo paketinin fotoğraflarıyla birlikte
        yazın. <strong>Bildirim için tarafımızca dayatılan bir süre yoktur.</strong>
      </p>
      <p>
        6502 sayılı Kanun m.11 uyarınca şu haklardan <strong>dilediğinizi</strong>{' '}
        kullanabilirsiniz: sözleşmeden dönme (bedel iadesi), ayıp oranında bedelden indirim,
        ücretsiz onarım veya ayıpsız misli ile değiştirilme. Seçtiğiniz talebi yerine
        getirmekle yükümlüyüz; onarım ve değişim talepleri en geç{' '}
        <strong>{ONARIM_DEGISIM_IS_GUNU} iş günü</strong> içinde karşılanır. Tüm masraflar
        (kargo dâhil) bize aittir.
      </p>
      <p>
        Teslimden itibaren <strong>{AYIP_ISPAT_AY} ay</strong> içinde ortaya çıkan ayıpların
        teslim anında var olduğu kabul edilir; aksini ispat bize düşer. Ayıplı maldan
        sorumluluğumuz <strong>{AYIP_ZAMANASIMI_YIL} yıl</strong> sürer.
      </p>
      <p>
        <strong>Üretim toleransı ayıp değildir:</strong> takılarımız el işçiliğiyle
        tamamlandığı için renk tonu, taş yerleşimi ve simetride ürünler arasında küçük
        farklılıklar olabilir. Kırık, eksik parça veya yanlış ürün gibi gerçek kusurlarda
        yukarıdaki haklarınız aynen saklıdır.
      </p>

      <h2>Uyuşmazlık Çözümü</h2>
      <p>
        Anlaşamazsak, değeri{' '}
        <strong>{HAKEM_HEYETI_SINIRI_TL.toLocaleString('tr-TR')} TL'nin altındaki</strong>{' '}
        uyuşmazlıklarda <strong>yerleşim yerinizin</strong> veya işlemin yapıldığı yerin İl
        ya da İlçe <strong>Tüketici Hakem Heyetine</strong> başvurabilirsiniz
        ({HAKEM_HEYETI_YILI} yılı sınırı; her yıl güncellenir). Başvuru e-Devlet üzerinden{' '}
        <strong>TÜBİS</strong> ile ya da heyete şahsen/posta yoluyla yapılır. Bu tutarın
        üzerinde, dava açmadan önce <strong>arabulucuya</strong> başvurmanız dava şartıdır;
        ardından Tüketici Mahkemesine gidebilirsiniz.
      </p>

      <h2>İletişim</h2>
      <p>
        Kargo ve iade süreçleri için {ORG_EMAIL} adresinden ya da{' '}
        <Link href="/iletisim">iletişim sayfamızdan</Link> bize ulaşabilirsiniz.
        {yanitSuresi ? ` Mesajlarınıza en geç ${yanitSuresi} içinde dönüyoruz.` : ''}
      </p>
      <p className="text-[12px]">
        Ayrıntılı yasal metinler:{' '}
        <Link href={SOZLESME_YOLLARI.onBilgilendirme}>Ön Bilgilendirme Formu</Link> ·{' '}
        <Link href={SOZLESME_YOLLARI.mesafeliSatis}>Mesafeli Satış Sözleşmesi</Link> ·{' '}
        <Link href={SOZLESME_YOLLARI.caymaFormu}>Örnek Cayma Formu</Link>
      </p>
    </LegalPageLayout>
  )
}
