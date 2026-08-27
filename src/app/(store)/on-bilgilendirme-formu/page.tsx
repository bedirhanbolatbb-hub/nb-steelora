import type { Metadata } from 'next'
import LegalPageLayout from '@/components/store/LegalPageLayout'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import { getSiteContent } from '@/lib/supabase/content'
import { AYIP_ISPAT_AY, AYIP_ZAMANASIMI_YIL, AZAMI_TESLIM_GUN, BANKA_YANSIMA_LABEL, CAYMA_SURESI_GUN, GERI_GONDERME_GUN, GERI_ODEME_GUN, HAKEM_HEYETI_SINIRI_TL, HAKEM_HEYETI_YILI, ONARIM_DEGISIM_IS_GUNU, SOZLESME_SURUMU, SOZLESME_YOLLARI, URUN_TOLERANS_KISA } from '@/lib/legal/sozlesme'
import { FREE_SHIPPING_LABEL, HAZIRLIK_LABEL, TASIMA_LABEL } from '@/lib/shipping'
import { ORG_EMAIL } from '@/lib/seo'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ön Bilgilendirme Formu',
  description:
    'Sipariş öncesi zorunlu ön bilgilendirme: satıcı künyesi, ürün bedeli, ödeme ve teslimat koşulları, cayma hakkının kullanımı.',
  alternates: { canonical: '/on-bilgilendirme-formu' },
}
export const dynamic = 'force-dynamic'

/**
 * Ön Bilgilendirme Formu — Mesafeli Sözleşmeler Yönetmeliği m.5.
 *
 * Faz 20'de mevzuattan doğrulanarak yeniden yazıldı. Süreler ve eşikler
 * lib/legal/sozlesme.ts'ten gelir; sayfada elle sayı YAZILMAZ — üç ayrı
 * sayfada üç farklı süre yazılı olması Faz 20'de bulunan kusurdu.
 *
 * TASLAKTIR: avukat onayı alınmadan nihai sayılmamalıdır.
 */
export default async function OnBilgilendirmeFormuPage() {
  const [kunye, icerik] = await Promise.all([kunyeGetir(), getSiteContent()])

  // İade taşıyıcısı m.5/1(g) uyarınca ZORUNLU ön bilgilendirme unsuru oldu
  // (Değişik: RG-24/5/2025-32909). Panelden girilir; girilmediyse uydurma
  // firma adı yazmak yerine dürüst bir bekleme cümlesi kurulur.
  const iadeFirmasi = (icerik.iade_kargo_firmasi ?? '').trim()
  const iadeKodu = (icerik.iade_kargo_kodu ?? '').trim()

  return (
    <LegalPageLayout eyebrow="Hukuk" title="Ön Bilgilendirme Formu" path="/on-bilgilendirme-formu" aciklama="Sipariş öncesi zorunlu ön bilgilendirme: satıcı künyesi, ürün bedeli, ödeme ve teslimat koşulları, cayma hakkının kullanımı.">
      <p>
        Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
        Yönetmeliği uyarınca, siparişinizi tamamlamadan önce bilmeniz gereken hususları
        içerir. Sipariş sayfasındaki onay kutusunu işaretlemeniz, bu formu okuduğunuz
        anlamına gelir.
      </p>

      <h2>1. Satıcı Bilgileri</h2>
      <SaticiKunyesi kunye={kunye} baslikYok />

      <h2>2. Ürünün Temel Nitelikleri</h2>
      <p>
        Sipariş ettiğiniz ürünün cinsi, miktarı, malzemesi ve görselleri ilgili ürün
        sayfasında yer alır. Sipariş özetinde ve sipariş onay e-postanızda ürün adı, adedi
        ve birim fiyatı ayrıca belirtilir.
      </p>
      <p>
        <strong>Ürün görseli ve üretim toleransı.</strong> {URUN_TOLERANS_KISA} Ürün
        görselleri temsilidir; ekran ve aydınlatma farklılıkları nedeniyle renk algısı
        değişebilir. Bu madde, ayıplı maldan doğan sorumluluğumuzu sınırlamaz.
      </p>

      <h2>3. Toplam Fiyat ve Ödeme</h2>
      <p>
        Sitede gösterilen tüm fiyatlar Türk Lirası (TRY) cinsinden ve <strong>KDV
        dahildir</strong>. Varsa indirim, sepet toplamına yansıtılarak ödeme adımında
        gösterilir; ödeyeceğiniz nihai tutar ödeme düğmesinin üzerinde yazan tutardır.
        Ek bir masraf, hizmet bedeli ya da komisyon alınmaz.
      </p>
      <p>
        Kargo: <strong>{FREE_SHIPPING_LABEL}</strong>. Teslimat masrafı tüketiciye
        yansıtılmaz.
      </p>
      <p>
        Ödeme, iyzico altyapısı üzerinden 3D Secure doğrulamalı kredi/banka kartı ile
        alınır. Kart bilgileriniz tarafımızca saklanmaz.
      </p>

      <h2>4. Teslimat</h2>
      <p>
        Siparişler, ödeme onayının ardından <strong>{HAZIRLIK_LABEL}</strong> içinde hazırlanıp
        anlaşmalı kargo firmasına teslim edilir; kargo firmasının teslim süresi{' '}
        <strong>{TASIMA_LABEL}dür</strong> ve bu süre kargoya verildikten sonra başlar. Kargo
        takip numarası hazır olduğunda e-posta ile bildirilir.
      </p>
      <p>
        Mesafeli Sözleşmeler Yönetmeliği m.16 uyarınca yasal azami teslim süresi{' '}
        <strong>{AZAMI_TESLIM_GUN} gündür</strong>; kişiye özel hazırlanan ürünler bu
        sürenin dışındadır ve ürün sayfasında belirtilen hazırlık süresine tabidir. Bu
        süre içinde teslim edilmemesi hâlinde sözleşmeyi feshedebilirsiniz; fesih hâlinde
        teslimat masrafları dâhil tahsil edilen tüm ödemeler, fesih bildiriminizin bize
        ulaşmasından itibaren <strong>{GERI_ODEME_GUN} gün</strong> içinde kanuni faiziyle
        birlikte iade edilir.
      </p>
      <p>
        Ürünün stokta bulunmaması, ifanın imkânsızlaşması sayılmaz; böyle bir durumda
        siparişinizi tek taraflı iptal etmeyiz, sizinle iletişime geçeriz.
      </p>

      <h2>5. Cayma Hakkı</h2>
      <p>
        Ürünü siz ya da belirlediğiniz üçüncü kişi teslim aldığı günden itibaren{' '}
        <strong>{CAYMA_SURESI_GUN} gün</strong> içinde, hiçbir gerekçe göstermeden ve cezai
        şart ödemeden sözleşmeden cayabilirsiniz. Sözleşmenin kurulmasından teslime kadar
        geçen sürede de cayabilirsiniz. Tek siparişle ayrı ayrı teslim edilen ürünlerde son
        ürünün, birden fazla parçadan oluşan üründe son parçanın teslim alındığı gün esas
        alınır. Ürünün kargoya verilmesi teslim sayılmaz.
      </p>
      <p>
        <strong>Cayma usulü.</strong> Hesabım → Siparişlerim ekranından iade talebi
        oluşturabilir,{' '}
        <Link href={SOZLESME_YOLLARI.caymaFormu}>örnek cayma formunu</Link> doldurup
        gönderebilir veya açık bir cayma beyanını yazılı olarak ya da kalıcı veri
        saklayıcısı ile (e-posta) {ORG_EMAIL} adresine iletebilirsiniz.{' '}
        <strong>Form kullanmak zorunlu değildir.</strong> Talebiniz bize ulaştığında size
        derhâl teyit bildirimi gönderilir.
      </p>
      <p>
        <strong>Ürünü geri gönderme.</strong> Cayma bildiriminizi yönelttiğiniz tarihten
        itibaren <strong>{GERI_GONDERME_GUN} gün</strong> içinde ürünü bize geri
        göndermeniz gerekir. Ürünü, işleyişine ve kullanım talimatlarına uygun biçimde
        incelemenizden doğan değişikliklerden sorumlu değilsiniz.
      </p>
      <p>
        <strong>İade kargosu tarafımıza aittir.</strong>{' '}
        {iadeFirmasi ? (
          <>
            İade gönderileriniz <strong>{iadeFirmasi}</strong> ile
            {iadeKodu ? (
              <>
                , <strong>{iadeKodu}</strong> anlaşma kodu kullanılarak
              </>
            ) : null}{' '}
            yapılır; bu taşıyıcıyla gönderdiğinizde iade masrafından sorumlu tutulmazsınız.
            Bulunduğunuz yerde bu firmanın şubesi yoksa, ürünü hiçbir ilave masraf talep
            etmeksizin adresinizden aldırırız.
          </>
        ) : (
          <>
            İade talebinizi onayladığımızda kullanacağınız kargo firmasını ve iade kodunu
            size e-posta ile bildiririz. İade kargo ücretini hiçbir hâlde sizden talep
            etmeyiz.
          </>
        )}
      </p>
      <p>
        <strong>Geri ödeme.</strong> Ürünün yukarıda belirtilen taşıyıcıya teslim edildiği
        tarihten itibaren en geç <strong>{GERI_ODEME_GUN} gün</strong> içinde, varsa
        teslimat masrafları dâhil tahsil edilen tüm ödemeler, satın alırken kullandığınız
        ödeme aracına uygun şekilde, size hiçbir masraf veya yükümlülük getirmeden tek
        seferde iade edilir. Ödemeniz kredi kartıyla yapılmışsa, kart çıkaran kuruluş
        tarafımızca aktarılan tutarı kendisine ulaşmasını takiben kullanılabilir limitinize{' '}
        <strong>tek seferde</strong> ilave etmekle yükümlüdür; bankanın hesabınıza yansıtma
        süresi (genellikle {BANKA_YANSIMA_LABEL}) bizim kontrolümüzde değildir.
      </p>

      <h2>6. Cayma Hakkının Kullanılamayacağı Haller</h2>
      <p>Mesafeli Sözleşmeler Yönetmeliği m.15 uyarınca yalnızca şu iki hâlde cayma hakkı kullanılamaz:</p>
      <ul>
        <li>
          <strong>m.15/1(b)</strong> — İstekleriniz veya kişisel ihtiyaçlarınız
          doğrultusunda hazırlanan ürünler (isim, harf, tarih yazdırılan ya da özel ölçüye
          göre üretilen kişiselleştirilmiş ürünler).
        </li>
        <li>
          <strong>m.15/1(ç)</strong> — Teslimden sonra ambalaj, bant, mühür veya paket gibi
          koruyucu unsurları açılmış olan ürünlerden, iadesi sağlık ve hijyen açısından
          uygun olmayanlar. Mağazamızda bu kapsama yalnızca{' '}
          <strong>küpe, piercing ve benzeri vücut deldirme takıları</strong> girer; bu
          ürünler hijyen mührü veya koruyucu bantla gönderilir.
        </li>
      </ul>
      <p>
        <strong>Bunun dışındaki tüm ürünlerde ambalajı açmanız cayma hakkınızı ortadan
        kaldırmaz.</strong> Ürünü, işleyişini ve özelliklerini anlamak için makul ölçüde
        inceleyebilirsiniz; bu incelemeden doğan değişikliklerden sorumlu tutulmazsınız
        (m.13/2). Yukarıdaki iki istisnaya giren ürünlerde de koruyucu unsur açılmamışsa
        cayma hakkınız aynen geçerlidir.
      </p>

      <h2>7. İade Adresi</h2>
      <p>
        İade gönderileri, yukarıdaki satıcı künyesinde belirtilen adrese yapılır. Kargo
        firması ve iade kodu, talebiniz onaylandığında e-posta ile bildirilir.
      </p>

      <h2>8. Ayıplı Ürün</h2>
      <p>
        Teslim aldığınız ürünün ayıplı olması hâlinde, 6502 sayılı Kanun m.11 uyarınca{' '}
        <strong>sözleşmeden dönme</strong>, <strong>ayıp oranında bedelden indirim</strong>,{' '}
        <strong>ücretsiz onarım</strong> veya{' '}
        <strong>ayıpsız misli ile değiştirilme</strong> haklarından dilediğinizi
        kullanabilirsiniz; tercih ettiğiniz talebi yerine getirmekle yükümlüyüz. Onarım veya
        değişim talepleri en geç <strong>{ONARIM_DEGISIM_IS_GUNU} iş günü</strong> içinde
        karşılanır.
      </p>
      <p>
        Teslim tarihinden itibaren <strong>{AYIP_ISPAT_AY} ay</strong> içinde ortaya çıkan
        ayıpların teslim anında var olduğu kabul edilir; aksini ispat satıcıya aittir
        (m.10/1). Ayıplı maldan sorumluluğumuz teslim tarihinden itibaren{' '}
        <strong>{AYIP_ZAMANASIMI_YIL} yıllık</strong> zamanaşımına tabidir (m.12); ayıp ağır
        kusur veya hile ile gizlenmişse zamanaşımı uygulanmaz. Seçimlik hakkın
        kullanılmasından doğan tüm masraflar tarafımızca karşılanır. Ayıp bildirimi için
        tarafımızca dayatılan bir süre yoktur.
      </p>

      <h2>9. Uyuşmazlık Çözümü</h2>
      <p>
        Şikâyet ve itirazlarınızı, değeri{' '}
        <strong>{HAKEM_HEYETI_SINIRI_TL.toLocaleString('tr-TR')} TL'nin altındaki</strong>{' '}
        uyuşmazlıklarda, yerleşim yerinizin bulunduğu <em>veya</em> işlemin yapıldığı
        yerdeki <strong>İl veya İlçe Tüketici Hakem Heyetine</strong> iletebilirsiniz
        ({HAKEM_HEYETI_YILI} yılı parasal sınırı; her yıl yeniden değerleme oranında
        artar). Başvuru, e-Devlet üzerinden <strong>Tüketici Bilgi Sistemi (TÜBİS)</strong>{' '}
        ile ya da heyete şahsen veya posta yoluyla yapılabilir; sözlü başvuru kabul edilmez.
      </p>
      <p>
        Bu tutarın üzerindeki uyuşmazlıklarda, 6502 sayılı Kanun m.73/A uyarınca{' '}
        <strong>dava açılmadan önce arabulucuya başvurulması dava şartıdır</strong>;
        ardından <strong>Tüketici Mahkemesine</strong> başvurabilirsiniz.
      </p>

      <h2>10. Bu Metnin Sürümü</h2>
      <p>
        Yürürlükteki sürüm: <strong>{SOZLESME_SURUMU}</strong>. Siparişinizde onayladığınız
        sürüm, sipariş kaydınıza damgalanır ve sipariş onay e-postanızda belirtilir.
      </p>
    </LegalPageLayout>
  )
}
