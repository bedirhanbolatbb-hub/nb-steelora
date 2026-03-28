export const metadata = { title: 'Hakkımızda' }

export default function HakkimizdaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] font-light text-text-primary mb-2">
        Hakkımızda
      </h1>
      <div className="w-16 h-px bg-gold mb-10" />

      <p className="font-heading text-[22px] text-text-primary italic leading-relaxed mb-10">
        &ldquo;Her parça bir hikaye anlatır. NB Steelora®, bu hikayeleri zarafetle hayata
        geçirir.&rdquo;
      </p>

      <div className="space-y-6 text-[13px] font-body text-text-secondary leading-relaxed">
        <p>
          NB Steelora®, Mersin&apos;den tüm Türkiye&apos;ye ulaşan tescilli bir premium çelik takı markasıdır.
          Modern kadının günlük zarafetini yansıtan, şık ve zamansız parçalar tasarlıyoruz.
          Her bir ürünümüz, kalite ve estetiğin bir arada sunulduğu özenli bir sürecin ürünüdür.
        </p>

        <h2 className="font-heading text-[24px] font-light text-text-primary mt-10 mb-4">
          Felsefemiz
        </h2>
        <p>
          Kaliteden ödün vermeden, herkesin ulaşabileceği zarif takılar sunmak en temel
          hedefimizdir. Sertifikalı malzemeler kullanıyor, her ürünümüzü titizlikle kontrol
          ediyoruz. Tasarımlarımız trendlerin ötesinde, zamansız bir zarafet taşır.
        </p>

        <h2 className="font-heading text-[24px] font-light text-text-primary mt-10 mb-4">
          Neden NB Steelora®?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div className="bg-champagne-dark/30 p-6">
            <p className="text-[14px] font-heading text-text-primary mb-2">Sertifikalı Ürünler</p>
            <p className="text-[12px] text-text-muted">
              Tüm ürünlerimiz orijinallik sertifikası ile gönderilir.
            </p>
          </div>
          <div className="bg-champagne-dark/30 p-6">
            <p className="text-[14px] font-heading text-text-primary mb-2">Güvenli Ödeme</p>
            <p className="text-[12px] text-text-muted">
              iyzico altyapısı ile 3D Secure güvenlikli ödeme.
            </p>
          </div>
          <div className="bg-champagne-dark/30 p-6">
            <p className="text-[14px] font-heading text-text-primary mb-2">Hızlı Kargo</p>
            <p className="text-[12px] text-text-muted">
              1-5 iş günü teslimat, 500₺ üzeri ücretsiz kargo.
            </p>
          </div>
          <div className="bg-champagne-dark/30 p-6">
            <p className="text-[14px] font-heading text-text-primary mb-2">14 Gün İade</p>
            <p className="text-[12px] text-text-muted">
              Koşulsuz 14 gün iade hakkı ve özel hediye paketi.
            </p>
          </div>
        </div>

        <h2 className="font-heading text-[24px] font-light text-text-primary mt-10 mb-4">
          İletişim
        </h2>
        <p>
          Sorularınız ve önerileriniz için bize{' '}
          <a href="mailto:info@nbsteelora.com" className="text-gold hover:text-gold-light transition-colors">
            info@nbsteelora.com
          </a>{' '}
          adresinden ulaşabilirsiniz.
        </p>
      </div>
    </div>
  )
}
