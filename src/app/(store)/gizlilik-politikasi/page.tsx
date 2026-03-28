import LegalPageLayout from '@/components/store/LegalPageLayout'

export const metadata = { title: 'Gizlilik Politikası' }

export default function GizlilikPolitikasiPage() {
  return (
    <LegalPageLayout title="Gizlilik Politikası">
      <h2>1. Giriş</h2>
      <p>
        NB Steelora olarak müşterilerimizin gizliliğine büyük önem veriyoruz. Bu politika,
        www.nbsteelora.com üzerinden toplanan kişisel bilgilerin nasıl toplandığını, kullanıldığını
        ve korunduğunu açıklar.
      </p>

      <h2>2. Toplanan Bilgiler</h2>
      <p><strong>Sipariş sırasında:</strong></p>
      <ul>
        <li>Ad, soyad</li>
        <li>E-posta adresi</li>
        <li>Telefon numarası</li>
        <li>Teslimat adresi</li>
      </ul>
      <p><strong>Teknik bilgiler:</strong></p>
      <ul>
        <li>IP adresi</li>
        <li>Tarayıcı türü ve sürümü</li>
        <li>Ziyaret edilen sayfalar ve süresi</li>
        <li>Çerez verileri</li>
      </ul>

      <h2>3. Bilgilerin Kullanım Amacı</h2>
      <p>Toplanan bilgiler yalnızca aşağıdaki amaçlarla kullanılır:</p>
      <ul>
        <li>Siparişlerin işlenmesi ve teslimatı</li>
        <li>Müşteri destek taleplerinin yanıtlanması</li>
        <li>Sipariş durumu bildirimleri</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
      </ul>
      <p>
        Kişisel bilgileriniz pazarlama amacıyla üçüncü taraflarla paylaşılmaz veya satılmaz.
      </p>

      <h2>4. Güvenlik</h2>
      <p>Verilerinizin güvenliği için aşağıdaki önlemleri alıyoruz:</p>
      <ul>
        <li><strong>SSL Sertifikası:</strong> Tüm veri iletişimi 256-bit SSL ile şifrelenir</li>
        <li><strong>iyzico PCI DSS:</strong> Ödeme altyapımız iyzico tarafından sağlanır ve PCI DSS uyumludur</li>
        <li><strong>Kart bilgisi saklanmaz:</strong> Kredi kartı bilgileriniz sunucularımızda kesinlikle saklanmaz; tüm ödeme işlemleri iyzico üzerinden güvenli şekilde gerçekleştirilir</li>
        <li><strong>3D Secure:</strong> Tüm ödemeler 3D Secure doğrulaması ile yapılır</li>
      </ul>

      <h2>5. Üçüncü Taraf Hizmetler</h2>
      <p>Hizmetlerimizi sunmak için aşağıdaki üçüncü taraf sağlayıcılarla çalışıyoruz:</p>
      <ul>
        <li><strong>iyzico:</strong> Ödeme işlemleri</li>
        <li><strong>Kargo firmaları:</strong> Teslimat hizmetleri</li>
        <li><strong>Supabase:</strong> Veri depolama altyapısı</li>
      </ul>

      <h2>6. İletişim</h2>
      <p>
        Gizlilik politikamız hakkında sorularınız için <strong>info@nbsteelora.com</strong> adresinden
        bize ulaşabilirsiniz.
      </p>

      <p>
        <em>Son güncelleme: Mart 2025</em>
      </p>
    </LegalPageLayout>
  )
}
