import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductCardV2 from '@/components/store/ProductCardV2'
import { aciklamaBol, getCollection } from '@/lib/collections'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY, isRemoteMedia } from '@/lib/images'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, sayfaUstVerisi } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getCollection(slug)
  if (!data) return {}

  const { collection } = data
  // Uzun açıklamada arama motoruna yalnız giriş cümlesi gider (aciklamaBol).
  const description =
    aciklamaBol(collection.description).giris ||
    `${collection.name} koleksiyonu — NB Steelora küratörlü seçki.`

  return sayfaUstVerisi({
    baslik: collection.name,
    aciklama: description,
    yol: `/koleksiyon/${slug}`,
    gorsel: data.cover,
  })
}

export default async function KoleksiyonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getCollection(slug)
  if (!data) notFound()

  const { collection, products, cover } = data
  const aciklama = aciklamaBol(collection.description)

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: collection.name, path: `/koleksiyon/${slug}` },
        ])}
      />

      {/* Hikâye bandı */}
      <section className="bg-surface-muted border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-14 items-center">
            <div data-reveal>
              <p className="eyebrow">Koleksiyon</p>
              <h1 className="font-heading text-[30px] lg:text-[48px] font-medium text-ink leading-[1.1] mt-2">
                {collection.name}
              </h1>
              {aciklama.giris && (
                <p className="text-[15px] lg:text-[16px] font-body text-ink-soft leading-relaxed mt-3 max-w-prose">
                  {aciklama.giris}
                </p>
              )}
              <p className="text-[13px] font-body text-muted mt-3">
                {products.length} ürün
              </p>
            </div>

            {/* Kapak: koleksiyonun kendi görseli yoksa ilk aktif ürününki */}
            {cover && (
              <div
                className="relative aspect-[4/3] lg:aspect-[3/2] overflow-hidden rounded-[4px] bg-surface order-first lg:order-last"
                data-reveal
              >
                <Image
                  src={cover}
                  unoptimized={isRemoteMedia(cover)}
                  alt={collection.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 560px"
                  quality={IMAGE_QUALITY}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  priority
                  fetchPriority="high"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ürünler */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 lg:py-16">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[15px] font-body text-ink-soft mb-4">
              Bu koleksiyondaki ürünler şu anda stokta değil.
            </p>
            <Link
              prefetch={false}
              href="/urunler"
              className="basis inline-flex min-h-[52px] items-center justify-center rounded-[4px] bg-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep"
            >
              Tüm Ürünler
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {products.map((product: any, i: number) => (
              <div
                key={product.id}
                data-reveal
                style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}
              >
                <ProductCardV2 product={product} priority={i < 4} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Uzun açıklamanın devamı ürünlerin altında: alışveriş eden önce
          ürünleri görür, bilgi arayan metnin tamamını burada bulur. */}
      {aciklama.devam && (
        <section className="border-t border-line bg-surface-muted">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-14">
            <h2 className="font-heading text-[22px] lg:text-[28px] font-medium text-ink">
              Bu seçki hakkında
            </h2>
            <p className="text-[15px] lg:text-[16px] font-body text-ink-soft leading-relaxed mt-3 max-w-prose">
              {aciklama.devam}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
