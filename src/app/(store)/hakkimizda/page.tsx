import type { Metadata } from 'next'
import JsonLd from '@/components/seo/JsonLd'
import KirintiYolu from '@/components/seo/KirintiYolu'
import { webPageJsonLd } from '@/lib/seo'
import Image from 'next/image'
import { FREE_SHIPPING_LABEL, TASIMA_LABEL } from '@/lib/shipping'
import { getSiteContent } from '@/lib/supabase/content'
import { isRemoteMedia, IMAGE_QUALITY } from '@/lib/images'

/** Sayfa açıklaması tek yerde: meta description ile şema aynı cümleyi taşır. */
const HAKKIMIZDA_ACIKLAMA =
  "NB Steelora'nın hikâyesi: 316L paslanmaz çelik takıları neden seçtiğimiz, nasıl hazırlayıp gönderdiğimiz ve markanın arkasındaki atölye."

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: HAKKIMIZDA_ACIKLAMA,
  alternates: { canonical: '/hakkimizda' },
}

/**
 * Hakkımızda — fotoğraf slotlu şablon (Faz 11B).
 *
 * Sayfa tamamen yazıydı: markayı anlatan bir sayfada tek bir fotoğraf yoktu.
 * İki slot açıldı (atölye/kurucu + hediye paketi). Görseller site_content'ten
 * okunur ve PANELDEN yüklenir (Site Metinleri → "Hakkımızda — fotoğraflar").
 *
 * YER TUTUCU BASILMAZ: görsel boşken o bölüm tek sütun olarak, dengeli
 * biçimde durur. Stok fotoğraf ya da "görsel yakında" kutusu konmaz — olmayan
 * şeyin yerini doldurmak, sayfayı eksik göstermekten daha kötü.
 *
 * Kutu metni renk SÖYLEMEZ: kutu pembe + altın yaldız baskılı ama bu bilgi
 * koda gömülmez; fotoğrafı BB yükleyince kendisi anlatır.
 */
export default async function HakkimizdaPage() {
  const icerik = await getSiteContent()
  const atolyeGorseli = (icerik.hakkimizda_gorsel_atolye || '').trim()
  const paketGorseli = (icerik.hakkimizda_gorsel_paket || '').trim()

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
      <JsonLd
        data={webPageJsonLd({
          tip: 'AboutPage',
          ad: 'Hakkımızda',
          aciklama: HAKKIMIZDA_ACIKLAMA,
          path: '/hakkimizda',
        })}
      />
      <KirintiYolu
        adimlar={[
          { ad: 'Ana Sayfa', path: '/' },
          { ad: 'Hakkımızda', path: '/hakkimizda' },
        ]}
        className="mb-8"
      />
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

      {/* ── Marka + atölye görseli ── */}
      <section className={atolyeGorseli ? 'grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14' : ''}>
        <div className="max-w-[68ch] space-y-6 text-[13px] lg:text-[14px] font-body text-ink-soft leading-relaxed">
          <p>
            NB Steelora®, Mersin&apos;den tüm Türkiye&apos;ye ulaşan tescilli bir premium çelik takı markasıdır.
            Modern kadının günlük zarafetini yansıtan, şık ve zamansız parçalar tasarlıyoruz.
            Her bir ürünümüz, kalite ve estetiğin bir arada sunulduğu özenli bir sürecin ürünüdür.
          </p>
          <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink pt-2">
            Felsefemiz
          </h2>
          <p>
            Kaliteden ödün vermeden, herkesin ulaşabileceği zarif takılar sunmak en temel
            hedefimizdir. Her ürünün malzemesini kendi sayfasında açıkça yazıyor, gelen her
            parçayı titizlikle kontrol ediyoruz. Tasarımlarımız trendlerin ötesinde, zamansız
            bir zarafet taşır.
          </p>
        </div>

        {atolyeGorseli && (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-surface-muted">
            <Image
              src={atolyeGorseli}
              unoptimized={isRemoteMedia(atolyeGorseli)}
              alt="NB Steelora atölyesinden bir kare"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
              quality={IMAGE_QUALITY}
            />
          </div>
        )}
      </section>

      {/* ── Neden NB Steelora ── */}
      <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink mt-14 mb-4 pt-8 border-t border-line">
        Neden NB Steelora®?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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
          <p className="text-[12px] text-muted">iyzico altyapısı ile 3D Secure güvenlikli ödeme.</p>
        </div>
        <div className="bg-surface-muted/30 p-6">
          <p className="text-[14px] font-heading text-ink mb-2">Hızlı Kargo</p>
          <p className="text-[12px] text-muted">{TASIMA_LABEL} teslimat, {FREE_SHIPPING_LABEL}.</p>
        </div>
        <div className="bg-surface-muted/30 p-6">
          <p className="text-[14px] font-heading text-ink mb-2">14 Gün İade</p>
          <p className="text-[12px] text-muted">Koşulsuz 14 gün iade hakkı; her sipariş hediye kutusunda gönderilir.</p>
        </div>
      </div>

      {/* ── Hediye paketi + görseli ── */}
      <section
        className={`mt-14 pt-8 border-t border-line ${
          paketGorseli ? 'grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14' : ''
        }`}
      >
        {paketGorseli && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-surface-muted lg:order-2">
            <Image
              src={paketGorseli}
              unoptimized={isRemoteMedia(paketGorseli)}
              alt="NB Steelora hediye paketi"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={IMAGE_QUALITY}
            />
          </div>
        )}
        <div className="max-w-[68ch] lg:order-1">
          <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink">
            Kutusundan çıktığı an
          </h2>
          <p className="mt-4 text-[13px] lg:text-[14px] font-body text-ink-soft leading-relaxed">
            Her sipariş ücretsiz hediye kutusunda özenle paketlenir; ayrıca ücret ya da seçim
            gerekmez. Ödeme adımında bırakacağınız not paketin içine konur.
          </p>
        </div>
      </section>

      {/* ── İletişim ── */}
      <div className="max-w-[68ch] text-[13px] lg:text-[14px] font-body text-ink-soft leading-relaxed">
        <h2 className="font-heading text-[22px] lg:text-[26px] font-medium text-ink mt-14 mb-4 pt-8 border-t border-line">
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
