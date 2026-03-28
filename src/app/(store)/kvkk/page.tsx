import LegalPageLayout from '@/components/store/LegalPageLayout'

export const metadata = { title: 'KVKK Aydınlatma Metni' }

export default function KvkkPage() {
  return (
    <LegalPageLayout title="KVKK Aydınlatma Metni">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, kişisel verilerinizin
        işlenmesine ilişkin sizleri bilgilendirmek isteriz.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        <strong>Nalan Bolat</strong><br />
        Akdeniz Mahallesi 39823 Sokak Men Tower 1 No:3 Kapı No:11, 33200 Mezitli / Mersin / Türkiye<br />
        E-posta: info@nbsteelora.com
      </p>

      <h2>2. Toplanan Kişisel Veriler</h2>
      <ul>
        <li><strong>Kimlik bilgileri:</strong> Ad, soyad</li>
        <li><strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası, teslimat adresi</li>
        <li><strong>Sipariş bilgileri:</strong> Sipariş geçmişi, sepet içeriği, ödeme durumu</li>
        <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı bilgisi, çerezler</li>
      </ul>

      <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
      <ul>
        <li>Siparişlerin işlenmesi ve teslimatın gerçekleştirilmesi</li>
        <li>Ödeme işlemlerinin yürütülmesi</li>
        <li>Müşteri hizmetleri ve destek sağlanması</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        <li>İletişim taleplerinin yanıtlanması</li>
        <li>Hizmet kalitesinin iyileştirilmesi</li>
      </ul>

      <h2>4. Kişisel Verilerin Aktarımı</h2>
      <p>Kişisel verileriniz aşağıdaki taraflarla paylaşılabilir:</p>
      <ul>
        <li><strong>Kargo firmaları:</strong> Teslimat sürecinin yürütülmesi için</li>
        <li><strong>iyzico ödeme kuruluşu:</strong> Ödeme işlemlerinin güvenli şekilde gerçekleştirilmesi için</li>
        <li><strong>Yetkili kamu kurum ve kuruluşları:</strong> Yasal zorunluluk halinde</li>
      </ul>

      <h2>5. Saklama Süresi</h2>
      <p>
        Kişisel verileriniz, işlenme amaçlarının gerektirdiği süre boyunca saklanır. Ticari defter
        ve belgeler Türk Ticaret Kanunu gereğince 10 yıl süreyle muhafaza edilir. Süre sonunda
        verileriniz silinir, yok edilir veya anonim hale getirilir.
      </p>

      <h2>6. Haklarınız</h2>
      <p>KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
        <li>Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</li>
        <li>KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
        <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
        <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
      </ul>

      <h2>7. Başvuru</h2>
      <p>
        Yukarıda belirtilen haklarınızı kullanmak için <strong>info@nbsteelora.com</strong> adresine
        yazılı olarak başvurabilirsiniz. Başvurularınız en geç 30 gün içinde yanıtlanacaktır.
      </p>

      <h2>8. Çerezler</h2>
      <p>
        Web sitemizde oturum yönetimi ve kullanıcı deneyiminin iyileştirilmesi amacıyla çerezler
        kullanılmaktadır. Tarayıcı ayarlarınızdan çerezleri yönetebilir veya devre dışı
        bırakabilirsiniz; ancak bu durumda sitenin bazı işlevleri kısıtlanabilir.
      </p>
    </LegalPageLayout>
  )
}
