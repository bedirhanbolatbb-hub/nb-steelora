import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Gift, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { FREE_SHIPPING_LABEL } from '@/lib/shipping'
import { cleanDescription, hasContent } from '@/lib/catalog/description'
import { materialCare, materialLabel } from '@/lib/catalog/material'
import { resolveBadge } from '@/lib/catalog/badge'
import ProductImageGallery from '@/components/store/ProductImageGallery'
import ProductVariants from '@/components/store/ProductVariants'
import { getVariantGroup } from '@/lib/catalog/variantGroup'
import ProductAccordion from '@/components/store/ProductAccordion'
import AddToCartButton from '@/components/store/AddToCartButton'
import StickyBuyBar, { BUY_BLOCK_ID } from '@/components/store/StickyBuyBar'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, plainText, productJsonLd } from '@/lib/seo'
import RelatedProducts from '@/components/store/RelatedProducts'
import ReviewList from '@/components/store/ReviewList'
import RecentlyViewedTracker from '@/components/store/RecentlyViewedTracker'
import RecentlyViewed from '@/components/store/RecentlyViewed'
import { WHATSAPP_URL } from '@/lib/contact'
import { sunucuOlayi } from '@/lib/analytics/server'

// Aciliyet ve rozet mantığı lib/catalog/badge.ts'te: "Son 1 adet" yalnız gerçekten
// son adette basılır; katalogda stok 1-5 arası ürün çoğunlukta olduğu için eşik
// 1'in üstüne çıkarılırsa sinyal gürültüye döner.



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

  // Ürün görüntüleme sunucuda ölçülür (Faz 12) — engelleyicilerden etkilenmez.
  await sunucuOlayi('product_view', { productId: product.id, path: `/urun/${product.slug}` })

  // products_display view'u custom_price içermeyebilir — direkt products tablosundan al
  const mergedProduct = { ...product, custom_price: priceRow?.custom_price ?? product.custom_price ?? null }

  const material = materialLabel(product.material_type)
  const stock = Number(product.trendyol_stock) || 0
  const badge = resolveBadge(product)

  // Grup üyeleri bir kez çekilir: etiketliyse satın alma kolonunda çip,
  // değilse galerinin altında küçük resim şeridi olarak basılır.
  const { members: variantMembers, useLabels } = await getVariantGroup(product)

  // Elle yazılmış açıklama varsa ham hâli gösterilir; pazaryeri metni temizlenir.
  const hasOverrideDescription = Boolean(product.override_description)
  const cleaned = hasOverrideDescription
    ? { paragraphs: [], bullets: [] }
    : cleanDescription(product.trendyol_description)

  // Yapısal veri: açıklama sanitize edilmiş metinden üretilir (pazaryeri
  // kalıpları temizlenmiş hâli), puan yalnız gerçek onaylı yorum varsa basılır.
  const seoDescription = hasOverrideDescription
    ? plainText(product.override_description)
    : plainText([...cleaned.paragraphs, ...cleaned.bullets].join(' '))

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <JsonLd
        data={productJsonLd({
          slug,
          title: product.display_title,
          description: seoDescription,
          images: (product.display_images as string[] | null) ?? [],
          price: mergedProduct.custom_price ?? product.display_price,
          stock,
          barcode: product.trendyol_barcode ?? null,
          category: product.trendyol_category ?? null,
          material,
          rating: product.avg_rating ?? null,
          reviewCount: product.review_count ?? null,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ürünler', path: '/urunler' },
          { name: product.display_title, path: `/urun/${slug}` },
        ])}
      />

      {/* Görünür breadcrumb — JSON-LD BreadcrumbList ile eşlenik */}
      <nav aria-label="breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-body text-muted">
        <Link href="/" className="hover:text-ink transition-colors">Ana Sayfa</Link>
        <span aria-hidden>/</span>
        <Link href="/urunler" className="hover:text-ink transition-colors">Ürünler</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-soft normal-case tracking-normal truncate max-w-[240px]">{product.display_title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
        {/* Görsel galerisi */}
        <div>
          <ProductImageGallery
            images={product.display_images || []}
            title={product.display_title}
          />
          {!useLabels && (
            <ProductVariants
              members={variantMembers}
              currentId={product.id}
              variant="thumbnails"
            />
          )}
        </div>

        {/* Ürün bilgisi */}
        <div>
          {/* Kategori · malzeme — ince eyebrow hissiyatında (tek kanonik yer) */}
          <p className="text-[10px] font-body text-accent-deep uppercase tracking-[0.22em]">
            {[product.trendyol_category, material].filter(Boolean).join(' · ')}
          </p>

          <h1 className="mt-2.5 font-heading text-[34px] lg:text-[46px] font-medium text-ink leading-[1.1]">
            {product.display_title}
          </h1>

          {useLabels && (
            <ProductVariants members={variantMembers} currentId={product.id} variant="chips" />
          )}

          {/* Fiyat */}
          <div className="flex items-baseline gap-3 mt-6 pt-6 border-t border-line">
            <p className="price text-[28px] text-ink">
              {formatPrice(mergedProduct.custom_price ?? product.display_price)}
            </p>
            {mergedProduct.custom_price && mergedProduct.custom_price < product.display_price && (
              <p className="price text-[16px] text-muted line-through font-normal">
                {formatPrice(product.display_price)}
              </p>
            )}
          </div>

          {/* Tek rozet: Son 1 adet > elle girilen badge > Yeni */}
          {stock > 0 ? (
            badge && (
              <p className="mt-3">
                <span className="bg-surface border border-accent text-accent-deep text-[10px] px-2.5 py-1 font-body font-medium uppercase tracking-[0.15em] rounded-[2px]">
                  {badge.label}
                </span>
              </p>
            )
          ) : (
            <div className="mt-4 border border-line bg-surface-muted text-ink text-[12px] font-body px-4 py-3 text-center">
              Tükendi — Bu ürün şu anda mevcut değil
            </div>
          )}

          {/* Sepete ekle — yapışkan çubuk bu bloğun görünürlüğünü izler */}
          <div className="mt-7" id={BUY_BLOCK_ID}>
            <AddToCartButton
              product={mergedProduct}
              disabled={stock === 0}
            />
          </div>

          {/* Güven şeridi — tek sıra ikonlu kompakt satır (vaatler sabitlerden) */}
          <ul className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-3 text-[10px] font-body text-ink-soft">
            {[
              { Icon: Truck, metin: FREE_SHIPPING_LABEL },
              { Icon: RotateCcw, metin: '14 gün iade' },
              { Icon: Gift, metin: 'Hediye paketi' },
              { Icon: ShieldCheck, metin: 'iyzico güvencesi' },
            ].map(({ Icon, metin }) => (
              <li key={metin} className="flex items-center gap-1.5 whitespace-nowrap">
                <Icon size={13} strokeWidth={1.5} className="text-accent-deep shrink-0" />
                {metin}
              </li>
            ))}
          </ul>

          {/* Hediye satırı */}
          <div className="mt-5 flex items-center gap-3.5 rounded-[4px] bg-surface-muted/60 p-3.5">
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
            className="mt-4 inline-flex items-center justify-center w-full border border-line text-ink-soft text-[11px] uppercase tracking-[0.16em] font-body font-medium px-6 py-3 rounded-[4px] hover:border-ink hover:text-ink transition-colors"
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
                      Tüm siparişlerde kargo ücretsizdir; siparişlerde kargo ücreti sepette gösterilir.
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

      {/* Dar ekranda yapışkan satın alma çubuğu (sm altı) */}
      <StickyBuyBar
        product={mergedProduct}
        title={product.display_title}
        price={mergedProduct.custom_price ?? product.display_price}
        outOfStock={stock === 0}
        hasSizes={useLabels && variantMembers.length > 1}
      />
    </div>
  )
}
