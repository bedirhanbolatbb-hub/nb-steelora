import LegalPageLayout from '@/components/store/LegalPageLayout'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import { CAYMA_SURESI_GUN, SOZLESME_SURUMU } from '@/lib/legal/sozlesme'
import { FREE_SHIPPING_LABEL } from '@/lib/shipping'

export const metadata = { title: 'Ön Bilgilendirme Formu' }
export const dynamic = 'force-dynamic'

/**
 * Ön Bilgilendirme Formu (Faz 19'da eklendi).
 *
 * Mesafeli Sözleşmeler Yönetmeliği m.5, sözleşmeden AYRI bir ön bilgilendirme
 * yükümlülüğü getiriyor: satıcı kimliği, ürünün temel nitelikleri, vergiler
 * dahil toplam fiyat, ödeme ve teslimat, cayma hakkının süresi/koşulları/
 * usulü, iade adresi ve şikâyet mercii. Sitede yalnız mesafeli satış
 * sözleşmesi vardı; bu metin eksikti.
 *
 * Ürüne özel bilgiler (cins, adet, fiyat) burada TEKRARLANMAZ — onlar sipariş
 * özetinde ve onay e-postasında kişiye özel olarak veriliyor. Burada
 * değişmeyen çerçeve yazılı.
 */
export default async function OnBilgilendirmeFormuPage() {
  const kunye = await kunyeGetir()

  return (
    <LegalPageLayout eyebrow="Hukuk" title="Ön Bilgilendirme Formu">
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
        ve birim fiyatı ayrıca belirtilir. Ürün görselleri temsilidir; ekran farklılıkları
        nedeniyle renkte küçük sapmalar olabilir.
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
        Siparişler, ödeme onayının ardından hazırlanarak anlaşmalı kargo firmasına teslim
        edilir. Yasal azami teslim süresi <strong>30 gündür</strong>; olağan durumda
        teslimat bu sürenin çok altında gerçekleşir. Kargo takip numarası hazır olduğunda
        e-posta ile bildirilir.
      </p>

      <h2>5. Cayma Hakkı</h2>
      <p>
        Ürünü teslim aldığınız tarihten itibaren <strong>{CAYMA_SURESI_GUN} gün</strong>
        içinde hiçbir gerekçe göstermeden ve cezai şart ödemeden sözleşmeden cayabilirsiniz.
        Cayma bildirimini bu süre içinde yazılı olarak ya da kalıcı veri saklayıcısı ile
        (e-posta) iletmeniz yeterlidir.
      </p>
      <p>
        <strong>Cayma usulü:</strong> Hesabım → Siparişlerim ekranından iade talebi
        oluşturabilir ya da satıcı iletişim adresine e-posta gönderebilirsiniz. Cayma
        bildiriminiz bize ulaştıktan sonra ürünü {CAYMA_SURESI_GUN} gün içinde iade
        etmeniz gerekir. Cayma hakkının kullanılması hâlinde iade kargo bedeli
        tarafımızca karşılanır.
      </p>
      <p>
        <strong>Geri ödeme:</strong> Cayma bildiriminizin ulaşmasından itibaren en geç
        14 gün içinde, ödemeyi yaptığınız yöntemle ve masrafsız olarak iade edilir.
        Bankanızın hesabınıza yansıtma süresi buna dahil değildir.
      </p>

      <h2>6. Cayma Hakkının İstisnaları</h2>
      <p>
        Yönetmeliğin 15. maddesi uyarınca; tüketicinin istekleri doğrultusunda kişiye özel
        hazırlanan ürünler (isim/harf yazdırma gibi kişiselleştirmeler) ile tesliminden
        sonra ambalajı açılmış olması hâlinde iadesi sağlık ve hijyen açısından uygun
        olmayan ürünlerde (ör. küpe, piercing) cayma hakkı kullanılamaz. Bu ürünlerde
        cayma hakkı, <strong>ambalaj açılmamış ve ürün kullanılmamış</strong> olmak
        kaydıyla geçerlidir.
      </p>

      <h2>7. İade Adresi</h2>
      <p>
        İade gönderileri, satıcı künyesinde belirtilen adrese yapılır. İade sürecini
        başlatmadan önce bizimle iletişime geçmeniz, kargo anlaşma kodunun tarafınıza
        iletilmesi açısından önemlidir.
      </p>

      <h2>8. Uyuşmazlık Çözümü</h2>
      <p>
        Şikâyet ve itirazlarınızı, Ticaret Bakanlığınca her yıl belirlenen parasal
        sınırlar dâhilinde, mal veya hizmeti satın aldığınız yahut ikametgâhınızın
        bulunduğu yerdeki <strong>Tüketici Hakem Heyetine</strong> veya{' '}
        <strong>Tüketici Mahkemesine</strong> iletebilirsiniz.
      </p>

      <h2>9. Bu Metnin Sürümü</h2>
      <p>
        Yürürlükteki sürüm: <strong>{SOZLESME_SURUMU}</strong>. Siparişinizde onayladığınız
        sürüm, sipariş kaydınıza damgalanır ve sipariş onay e-postanızda belirtilir.
      </p>
    </LegalPageLayout>
  )
}
