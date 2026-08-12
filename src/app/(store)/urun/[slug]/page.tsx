import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { FREE_SHIPPING_LABEL, FREE_SHIPPING_MIN_LABEL } from '@/lib/shipping'
import { cleanDescription, hasContent } from '@/lib/catalog/description'
import { materialCare, materialLabel } from '@/lib/catalog/material'
import ProductImageGallery from '@/components/store/ProductImageGallery'
import ProductVariants from '@/components/store/ProductVariants'
import ProductAccordion from '@/components/store/ProductAccordion'
import AddToCartButton from '@/components/store/AddToCartButton'
import RelatedProducts from '@/components/store/RelatedProducts'
import ReviewList from '@/components/store/ReviewList'
import RecentlyViewedTracker from '@/components/store/RecentlyViewedTracker'
import RecentlyViewed from '@/components/store/RecentlyViewed'

// Stok bu eşiğin altındaysa (0 hariç) kalan adet gösterilir.
const LOW_STOCK_THRESHOLD = 5

const WHATSAPP_URL = 'https://wa.me/905536552020'

/**
 * SEO başlığı ve açıklaması UZUN Trendyol adından üretilir; sayfadaki H1
 * görünen (kısa/override) addır. Böylece kısa ad kampanyası arama görünürlüğünü
 * değiştirmez.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('products_display')
    .select('trendyol_title, display_title, display_images, trendyol_category, display_price')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return {}

  const seoTitle = data.trendyol_title || data.display_title
  const description = `${seoTitle} — ${data.trendyol_category ?? 'NB Steelora'}. ${formatPrice(
    data.display_price
  )}. ${FREE_SHIPPING_LABEL}, 14 gün koşulsuz iade.`

  return {
    title: seoTitle,
    description,
    alternates: { canonical: `/urun/${slug}` },
    openGraph: {
      title: seoTitle,
      description,
      images: data.display_images?.[0] ? [{ url: data.display_images[0] }] : undefined,
    },
  }
}

export default async function UrunDetayPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const service = createServiceClient()

  const [{ data: product }, { data: priceRow }] = await Promise.all([
    supabase.from('products_display').select('*').eq('slug', slug).single(),
    service.from('products').select('custom_price').eq('slug', slug).single(),
  ])

  if (!product) notFound()

  // products_display view'u custom_price içermeyebilir — direkt products tablosundan al
  const mergedProduct = { ...product, custom_price: priceRow?.custom_price ?? product.custom_price ?? null }

  const material = materialLabel(product.material_type)
  const stock = Number(product.trendyol_stock) || 0
  const lowStock = stock > 0 && stock <= LOW_STOCK_THRESHOLD

  // Elle yazılmış açıklama varsa ham hâli gösterilir; pazaryeri metni temizlenir.
  const hasOverrideDescription = Boolean(product.override_description)
  const cleaned = hasOverrideDescription
    ? { paragraphs: [], bullets: [] }
    : cleanDescription(product.trendyol_description)

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Görsel galerisi */}
        <div>
          <ProductImageGallery
            images={product.display_images || []}
            title={product.display_title}
          />
          <ProductVariants product={product} />
        </div>

        {/* Ürün bilgisi */}
        <div>
          <h1 className="font-heading text-[30px] lg:text-[38px] font-semibold text-ink leading-tight">
            {product.display_title}
          </h1>

          {/* Kategori · malzeme — malzeme beyanının tek kanonik yeri */}
          <p className="mt-2 text-[11px] font-body text-muted tracking-[0.08em]">
            {[product.trendyol_category, material].filter(Boolean).join(' · ')}
          </p>

          {/* Fiyat */}
          <div className="flex items-baseline gap-3 mt-6">
            <p className="price text-[26px] text-ink">
              {formatPrice(mergedProduct.custom_price ?? product.display_price)}
            </p>
            {mergedProduct.custom_price && mergedProduct.custom_price < product.display_price && (
              <p className="price text-[16px] text-muted line-through font-normal">
                {formatPrice(product.display_price)}
              </p>
            )}
          </div>

          {/* Stok durumu — aciliyet yalnız gerçek düşük stokta */}
          {stock > 0 ? (
            lowStock && (
              <p className="mt-2 text-[12px] font-body text-accent-deep font-medium">
                Son {stock} adet
              </p>
            )
          ) : (
            <div className="mt-4 border border-line bg-surface-muted text-ink text-[12px] font-body px-4 py-3 text-center">
              Tükendi — Bu ürün şu anda mevcut değil
            </div>
          )}

          {/* Sepete ekle */}
          <div className="mt-6">
            <AddToCartButton
              product={mergedProduct}
              disabled={stock === 0}
            />
          </div>

          {/* Güven şeridi — vaatler shipping sabitinden */}
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-body text-ink-soft">
            {[
              FREE_SHIPPING_LABEL,
              '14 gün koşulsuz iade',
              'Ücretsiz hediye paketi',
              'iyzico ile güvenli ödeme',
            ].map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-accent leading-none mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {/* Hediye satırı */}
          <div className="mt-6 flex items-center gap-3 border border-line rounded-[4px] p-3">
            <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-[2px]">
              <Image
                src="/hediye-paketi.jpg"
                alt="NB Steelora hediye paketi"
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <p className="text-[12px] font-body text-ink-soft">
              Ücretsiz premium hediye kutusunda gönderilir.
            </p>
          </div>

          {/* WhatsApp ghost CTA */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center w-full border border-ink text-ink text-[11px] uppercase tracking-[0.15em] font-body font-medium px-6 py-3 rounded-[4px] hover:bg-ink hover:text-bg transition-colors"
          >
            Sorunuz mu var? WhatsApp&apos;tan yazın
          </a>

          {/* Bilgi sekmeleri */}
          <ProductAccordion
            sections={[
              {
                title: 'Ürün Açıklaması',
                content: hasOverrideDescription ? (
                  <div dangerouslySetInnerHTML={{ __html: product.override_description }} />
                ) : hasContent(cleaned) ? (
                  <div className="space-y-3">
                    {cleaned.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {cleaned.bullets.length > 0 && (
                      <ul className="space-y-1.5 pt-1">
                        {cleaned.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <span className="text-accent leading-none mt-1">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-muted">Bu ürün için açıklama bulunmuyor.</p>
                ),
              },
              {
                title: 'Malzeme & Bakım',
                content: (
                  <div className="space-y-2">
                    {material && (
                      <p>
                        <span className="text-ink font-medium">Malzeme:</span> {material}
                      </p>
                    )}
                    <p>{materialCare(product.material_type)}</p>
                  </div>
                ),
              },
              {
                title: 'Kargo & İade',
                content: (
                  <div className="space-y-2">
                    <p>
                      {FREE_SHIPPING_MIN_LABEL} siparişlerde kargo ücretsizdir; altındaki
                      siparişlerde kargo ücreti sepette gösterilir.
                    </p>
                    <p>Siparişler 1-5 iş günü içinde kargoya verilir.</p>
                    <p>
                      Teslimattan itibaren 14 gün içinde koşulsuz iade hakkınız vardır.
                      Ayrıntılar için{' '}
                      <Link href="/kargo-ve-iade" className="text-accent-deep underline underline-offset-2">
                        Kargo ve İade
                      </Link>{' '}
                      sayfasına bakabilirsiniz.
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Yorumlar */}
      <ReviewList productId={product.id} />

      {/* İlgili Ürünler */}
      <RelatedProducts
        productId={product.id}
        category={product.trendyol_category || ''}
      />

      {/* Son Görüntülenenler */}
      <RecentlyViewedTracker slug={slug} />
      <RecentlyViewed currentSlug={slug} />
    </div>
  )
}
