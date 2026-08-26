import { FREE_SHIPPING_LABEL } from '@/lib/shipping'

export const metadata = { title: 'Hakkımızda' }

export default function HakkimizdaPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
      <header className="max-w-[68ch] border-b border-line pb-8 mb-10">
        <p className="eyebrow">Marka</p>
        <h1 className="font-heading text-[38px] lg:text-[48px] font-medium text-ink leading-tight mt-2">
          Hakkımızda
        </h1>
      </header>

      <p className="font-heading text-[22px] lg:text-[26px] text-ink italic leading-relaxed mb-10 max-w-[68ch]">
        &ldquo;Her parça bir hikaye anlatır. NB Steelora®, bu hikayeleri zarafetle hayata
        geçirir.&rdquo;
      </p>

      <div className="max-w-[68ch] space-y-6 text-[13px] lg:text-[14px] font-body text-ink-soft leading-relaxed">
        <p>
          NB Steelora®, Mersin&apos;den tüm Türkiye&apos;ye ulaşan tescilli bir premium çelik takı markasıdır.
          Modern kadının günlük zarafetini yansıtan, şık ve zamansız parçalar tasarlıyoruz.
          Her bir ürünümüz, kalite ve estetiğin bir arada sunulduğu özenli bir sürecin ürünüdür.
        </p>

        <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink mt-12 mb-4 pt-8 border-t border-line">
          Felsefemiz
        </h2>
        <p>
          Kaliteden ödün vermeden, herkesin ulaşabileceği zarif takılar sunmak en temel
          hedefimizdir. Her ürünün malzemesini kendi sayfasında açıkça yazıyor, gelen her
          parçayı titizlikle kontrol ediyoruz. Tasarımlarımız trendlerin ötesinde, zamansız
          bir zarafet taşır.
        </p>

        <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink mt-12 mb-4 pt-8 border-t border-line">
          Neden NB Steelora®?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          {/* Faz 11A kapanış: burada "Sertifikalı Ürünler — tüm ürünlerimiz
              orijinallik sertifikası ile gönderilir" yazıyordu. Sertifika
              gönderilmiyor (BB kararı), yani karşılığı olmayan bir vaatti.
              Yerine ürünün gerçekten taşıdığı malzeme bilgisi kondu; "tüm
              ürünler" denmiyor çünkü katalogda kaplama ve boncuk parçalar da
              var — malzeme her ürünün kendi sayfasında yazılı. */}
          <div className="bg-surface-muted/30 p-6">
            <p className="text-[14px] font-heading text-ink mb-2">316L Paslanmaz Çelik</p>
            <p className="text-[12px] text-muted">
              Çelik koleksiyonumuz 316L paslanmaz çeliktir; her ürünün malzemesi kendi
              sayfasında yazar.
            </p>
          </div>
          <div className="bg-surface-muted/30 p-6">
            <p className="text-[14px] font-heading text-ink mb-2">Güvenli Ödeme</p>
            <p className="text-[12px] text-muted">
              iyzico altyapısı ile 3D Secure güvenlikli ödeme.
            </p>
          </div>
          <div className="bg-surface-muted/30 p-6">
            <p className="text-[14px] font-heading text-ink mb-2">Hızlı Kargo</p>
            <p className="text-[12px] text-muted">
              1-5 iş günü teslimat, {FREE_SHIPPING_LABEL}.
            </p>
          </div>
          <div className="bg-surface-muted/30 p-6">
            <p className="text-[14px] font-heading text-ink mb-2">14 Gün İade</p>
            <p className="text-[12px] text-muted">
              Koşulsuz 14 gün iade hakkı ve özel hediye paketi.
            </p>
          </div>
        </div>

        <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink mt-12 mb-4 pt-8 border-t border-line">
          İletişim
        </h2>
        <p>
          Sorularınız ve önerileriniz için bize{' '}
          <a href="mailto:info@nbsteelora.com" className="text-accent-deep hover:text-ink transition-colors">
            info@nbsteelora.com
          </a>{' '}
          adresinden ulaşabilirsiniz.
        </p>
      </div>
    </div>
  )
}
