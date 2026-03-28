import LegalPageLayout from '@/components/store/LegalPageLayout'

export const metadata = { title: 'Kargo ve İade' }

export default function KargoVeIadePage() {
  return (
    <LegalPageLayout title="Kargo ve İade">
      <h2>Kargo Bilgileri</h2>

      <ul>
        <li><strong>500 TL ve üzeri siparişlerde</strong> kargo ücretsizdir</li>
        <li><strong>500 TL altı siparişlerde</strong> kargo ücreti 49,90 TL'dir</li>
        <li>Siparişiniz onaylandıktan sonra <strong>1-2 iş günü</strong> içinde kargoya verilir</li>
        <li>Tahmini teslimat süresi: <strong>1-5 iş günü</strong></li>
        <li>Kargo takip numaranız e-posta ile tarafınıza gönderilir</li>
        <li>Teslimat, sipariş sırasında belirttiğiniz adrese yapılır</li>
      </ul>

      <h2>İade Koşulları</h2>

      <p>
        Ürünü teslim aldığınız tarihten itibaren <strong>14 gün</strong> içinde iade talebinde
        bulunabilirsiniz.
      </p>

      <p><strong>İade için gerekli koşullar:</strong></p>
      <ul>
        <li>Ürün kullanılmamış ve orijinal ambalajında olmalıdır</li>
        <li>Ürün faturası ile birlikte iade edilmelidir</li>
        <li>Ürün etiketleri çıkarılmamış olmalıdır</li>
      </ul>

      <p><strong>İade edilemeyen ürünler:</strong></p>
      <ul>
        <li>Hijyen açısından iade edilemeyecek ürünler (kulak delme küpeleri, piercing vb.)</li>
        <li>Kişiye özel üretilmiş veya özelleştirilmiş ürünler</li>
        <li>Ambalajı açılmış ve kullanılmış ürünler</li>
      </ul>

      <h2>İade Süreci</h2>

      <ol>
        <li>
          <strong>Bildirim:</strong> info@nbsteelora.com adresine iade talebinizi ve sipariş
          numaranızı bildirin
        </li>
        <li>
          <strong>Kargolama:</strong> Onay aldıktan sonra ürünü orijinal ambalajında ve faturası
          ile birlikte kargoya verin. İade kargo ücreti alıcıya aittir.
        </li>
        <li>
          <strong>İnceleme:</strong> Ürün tarafımıza ulaştıktan sonra 3-5 iş günü içinde
          incelenir
        </li>
        <li>
          <strong>Para İadesi:</strong> Onaylanan iadelerde 5-10 iş günü içinde ödeme,
          ödemenin yapıldığı yönteme iade edilir
        </li>
      </ol>

      <h2>Hasarlı veya Hatalı Ürün</h2>

      <p>
        Kargo sürecinde hasar gören veya hatalı gönderilen ürünler için:
      </p>
      <ul>
        <li>Teslimat tarihinden itibaren <strong>48 saat</strong> içinde info@nbsteelora.com adresine fotoğraflı bildirim yapın</li>
        <li>Hasarlı ürün iadelerinde kargo ücreti tarafımıza aittir</li>
        <li>Tercih ettiğiniz şekilde değişim veya para iadesi yapılır</li>
      </ul>

      <h2>İletişim</h2>
      <p>
        Kargo ve iade süreçleri hakkında sorularınız için <strong>info@nbsteelora.com</strong> adresinden
        bize ulaşabilirsiniz.
      </p>
    </LegalPageLayout>
  )
}
