import Link from 'next/link'
import FeaturedCarousel from './FeaturedCarousel'

interface Props {
  title?: string
  subtitle?: string
  /** Liste anasayfada hesaplanır; bölümler arası tekrar orada engellenir. */
  products: any[]
}

export default function FeaturedProducts({ title, subtitle, products }: Props) {
  if (products.length === 0) return null

  return (
    <section id="one-cikanlar" className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="eyebrow">Seçki</p>
          <h2 className="font-heading text-[34px] font-semibold text-ink mt-2">
            {title || 'Öne Çıkan Parçalar'}
          </h2>
          {subtitle && <p className="text-[12px] font-body text-muted mt-1">{subtitle}</p>}
        </div>
        <Link
          href="/urunler"
          className="text-[11px] uppercase tracking-[0.15em] font-body font-medium text-ink border-b border-accent pb-0.5 hover:text-accent-deep transition-colors hidden sm:block"
        >
          Tümünü Gör →
        </Link>
      </div>
      <FeaturedCarousel products={products} />
    </section>
  )
}
