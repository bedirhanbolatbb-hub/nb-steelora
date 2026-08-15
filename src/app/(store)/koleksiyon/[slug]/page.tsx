import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductCardV2 from '@/components/store/ProductCardV2'
import { getCollection } from '@/lib/collections'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getCollection(slug)
  if (!data) return {}

  const { collection } = data
  const description =
    collection.description || `${collection.name} koleksiyonu — NB Steelora küratörlü seçki.`

  return {
    title: collection.name,
    description,
    alternates: { canonical: `/koleksiyon/${slug}` },
    openGraph: {
      title: collection.name,
      description,
      images: data.cover ? [{ url: data.cover }] : undefined,
    },
  }
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
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div data-reveal>
              <p className="eyebrow">Koleksiyon</p>
              <h1 className="font-heading text-[40px] lg:text-[56px] font-medium text-ink leading-[1.08] mt-3">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-[14px] lg:text-[15px] font-body text-ink-soft leading-relaxed mt-5 max-w-prose">
                  {collection.description}
                </p>
              )}
              <p className="text-[11px] font-body text-muted mt-5 tracking-[0.08em]">
                {products.length} parça
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
                  alt={collection.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 560px"
                  quality={IMAGE_QUALITY}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  priority
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ürünler */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px] font-body text-muted mb-4">
              Bu koleksiyondaki parçalar şu anda stokta değil.
            </p>
            <Link
              href="/urunler"
              className="inline-flex items-center justify-center bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
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
    </div>
  )
}
