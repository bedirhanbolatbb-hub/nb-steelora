import LegalPageLayout from '@/components/store/LegalPageLayout'

export const metadata = { title: 'Mesafeli Satış Sözleşmesi' }

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <LegalPageLayout title="Mesafeli Satış Sözleşmesi">
      <h2>1. Taraflar</h2>
      <p>
        <strong>SATICI:</strong><br />
        Ad Soyad: Nalan Bolat<br />
        Adres: Akdeniz Mahallesi 39823 Sokak Men Tower 1 No:3 Kapı No:11, 33200 Mezitli / Mersin / Türkiye<br />
        Vergi Dairesi: İstiklal Vergi Dairesi<br />
        E-posta: info@nbsteelora.com<br />
        Web: https://www.nbsteelora.com
      </p>
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
        <li>500 TL ve üzeri siparişlerde kargo ücretsizdir</li>
        <li>500 TL altı siparişlerde kargo ücreti 49,90 TL'dir</li>
        <li>Teslimat, ALICI'nın sipariş sırasında belirttiği adrese yapılır</li>
        <li>Kargo takip numarası e-posta ile bildirilir</li>
      </ul>

      <h2>6. Cayma Hakkı</h2>
      <p>
        ALICI, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün içinde herhangi bir
        gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkını kullanabilir.
      </p>
      <p>Cayma hakkının kullanılması için:</p>
      <ul>
        <li>Ürün kullanılmamış ve orijinal ambalajında olmalıdır</li>
        <li>Fatura ile birlikte iade edilmelidir</li>
        <li>info@nbsteelora.com adresine yazılı bildirim yapılmalıdır</li>
        <li>İade kargo ücreti ALICI'ya aittir</li>
        <li>Ürün SATICI'ya ulaştıktan sonra 5-10 iş günü içinde ödeme iadesi yapılır</li>
      </ul>

      <h2>7. Cayma Hakkının Kullanılamayacağı Haller</h2>
      <p>Yönetmelik gereği aşağıdaki hallerde cayma hakkı kullanılamaz:</p>
      <ul>
        <li>Tüketicinin özel istekleri doğrultusunda üretilen veya kişiye özel hale getirilen ürünler</li>
        <li>Hijyen açısından iade edilemeyecek ürünler (kulak delme küpeleri vb.)</li>
        <li>Ambalajı açılmış ve kullanılmış ürünler</li>
      </ul>

      <h2>8. Genel Hükümler</h2>
      <p>
        İşbu sözleşmeden doğan uyuşmazlıklarda Mersin Tüketici Hakem Heyetleri ve Mersin
        Mahkemeleri yetkilidir. ALICI, sipariş onayı ile işbu sözleşmenin tüm koşullarını
        kabul etmiş sayılır.
      </p>
      <p>
        İşbu sözleşme, ALICI tarafından elektronik ortamda onaylandığı tarihte yürürlüğe girer.
      </p>
    </LegalPageLayout>
  )
}
