import LegalPageLayout from '@/components/store/LegalPageLayout'
import Link from 'next/link'
import {
  GERI_GONDERME_GUN,
  GERI_ODEME_GUN,
  HAKEM_HEYETI_SINIRI_TL,
  HAKEM_HEYETI_YILI,
  SOZLESME_YOLLARI,
} from '@/lib/legal/sozlesme'
import { ORG_EMAIL } from '@/lib/seo'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'

export const metadata = { title: 'Mesafeli Satış Sözleşmesi' }
export const dynamic = 'force-dynamic'

export default async function MesafeliSatisSozlesmesiPage() {
  // Satıcı bilgileri tek kaynaktan (panel → Site Metinleri künyesi).
  const kunye = await kunyeGetir()
  return (
    <LegalPageLayout eyebrow="Hukuk" title="Mesafeli Satış Sözleşmesi">
      <h2>1. Taraflar</h2>
      <p><strong>SATICI:</strong></p>
      <SaticiKunyesi kunye={kunye} baslikYok />
      <p>
        <strong>ALICI:</strong><br />
        Sipariş sırasında beyan edilen ad, soyad, adres, e-posta ve telefon bilgileri geçerlidir.
      </p>

      <h2>2. Sözleşmenin Konusu</h2>
      <p>
        İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
        Yönetmeliği hükümleri uyarınca, ALICI'nın SATICI'ya ait www.nbsteelora.com internet
        sitesinden elektronik ortamda sipariş verdiği ürünlerin satışı ve teslimi ile ilgili
        tarafların hak ve yükümlülüklerini düzenler.
      </p>

      <h2>3. Ürün Bilgileri</h2>
      <p>
        Satışa konu ürünlerin cinsi, miktarı, fiyatı ve temel nitelikleri sipariş onay
        sayfasında ve e-posta ile gönderilen sipariş özetinde belirtilmiştir. Ürün görselleri
        temsilidir; renk, boyut gibi özelliklerde ekran farklılıklarından kaynaklanan küçük
        sapmalar olabilir.
      </p>

      <h2>4. Fiyat ve Ödeme</h2>
      <p>
        Tüm fiyatlar Türk Lirası (TRY) cinsindendir ve KDV dahildir. Ödeme, iyzico altyapısı
        üzerinden 3D Secure güvenlikli kredi/banka kartı ile yapılır. SATICI, sipariş
        onaylanmadan önce fiyat değişikliği yapma hakkını saklı tutar.
      </p>

      <h2>5. Teslimat</h2>
      <ul>
        <li>Teslimat süresi: Sipariş onayından itibaren 1-5 iş günü</li>
        <li>Kargoya verme: Onaydan sonra 1-2 iş günü içinde</li>
        <li>Tüm siparişlerde kargo ücreti SATICI tarafından karşılanır; ALICI'dan kargo bedeli tahsil edilmez</li>
        <li>Teslimat, ALICI'nın sipariş sırasında belirttiği adrese yapılır</li>
        <li>Kargo takip numarası e-posta ile bildirilir</li>
      </ul>

      <h2>6. Cayma Hakkı</h2>
      <p>
        ALICI, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün içinde herhangi bir
        gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkını kullanabilir.
      </p>
      <p>Cayma hakkının kullanılmasına ilişkin esaslar:</p>
      <ul>
        <li>
          ALICI, Hesabım → Siparişlerim ekranından iade talebi oluşturabilir,{' '}
          <Link href={SOZLESME_YOLLARI.caymaFormu}>örnek cayma formunu</Link> gönderebilir
          ya da açık bir cayma beyanını {ORG_EMAIL} adresine iletebilir. Form kullanmak
          zorunlu değildir; talep SATICI'ya ulaştığında derhâl teyit bildirimi gönderilir.
        </li>
        <li>
          ALICI, cayma bildirimini yönelttiği tarihten itibaren {GERI_GONDERME_GUN} gün
          içinde ürünü SATICI'ya geri gönderir (Yönetmelik m.13/1).
        </li>
        <li>
          <strong>İade kargo ücreti SATICI'ya aittir.</strong> Yönetmelikte tüketiciye iade
          masrafı yükleyen hüküm bulunmamaktadır.
        </li>
        <li>
          ALICI, ürünü işleyişine, teknik özelliklerine ve kullanım talimatlarına uygun
          biçimde incelemesinden doğan değişikliklerden sorumlu değildir (m.13/2);
          ambalajın açılmış olması tek başına cayma hakkını ortadan kaldırmaz.
        </li>
        <li>
          Ürünün, iade için belirtilen taşıyıcıya teslim edildiği tarihten itibaren en geç{' '}
          {GERI_ODEME_GUN} gün içinde, varsa teslimat masrafları dâhil tahsil edilen tüm
          ödemeler, ALICI'nın kullandığı ödeme aracına uygun şekilde ve tek seferde iade
          edilir (m.12/1).
        </li>
      </ul>

      <h2>7. Cayma Hakkının Kullanılamayacağı Haller</h2>
      <p>Yönetmelik m.15 gereği yalnızca aşağıdaki hallerde cayma hakkı kullanılamaz:</p>
      <ul>
        <li>
          <strong>m.15/1(b)</strong> — ALICI'nın istekleri veya kişisel ihtiyaçları
          doğrultusunda hazırlanan ürünler (isim/harf/tarih yazdırılan ya da özel ölçüye
          göre üretilen ürünler).
        </li>
        <li>
          <strong>m.15/1(ç)</strong> — Tesliminden sonra ambalaj, bant, mühür veya paket
          gibi koruyucu unsurları açılmış olan ürünlerden, iadesi sağlık ve hijyen
          açısından uygun olmayanlar; mağazada bu kapsama yalnızca küpe, piercing ve
          benzeri vücut deldirme takıları girer.
        </li>
      </ul>
      <p>
        Bunların dışındaki ürünlerde ambalajın açılmış olması cayma hakkını ortadan
        kaldırmaz.
      </p>

      <h2>8. Genel Hükümler</h2>
      <p>
        İşbu sözleşmeden doğan uyuşmazlıklarda ALICI, değeri{' '}
        {HAKEM_HEYETI_SINIRI_TL.toLocaleString('tr-TR')} TL'nin altındaki uyuşmazlıklar
        için <strong>kendi yerleşim yerinin bulunduğu veya işlemin yapıldığı yerdeki</strong>{' '}
        İl veya İlçe Tüketici Hakem Heyetine başvurabilir ({HAKEM_HEYETI_YILI} yılı parasal
        sınırı; her yıl yeniden değerleme oranında artar). Bu tutarın üzerindeki
        uyuşmazlıklarda 6502 sayılı Kanun m.73/A uyarınca dava açılmadan önce arabulucuya
        başvurulması dava şartıdır; ardından Tüketici Mahkemesine başvurulabilir. ALICI'nın
        tüketici sıfatından doğan yetkili merci seçme hakkı bu sözleşmeyle sınırlandırılamaz.
      </p>
      <p>
        İşbu sözleşme, ALICI tarafından elektronik ortamda onaylandığı tarihte yürürlüğe girer.
      </p>
    </LegalPageLayout>
  )
}
