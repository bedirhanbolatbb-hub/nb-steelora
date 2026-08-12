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
          <h2 className="font-heading text-[32px] text-text-primary">
            {title || (<>Öne Çıkan <span className="italic text-gold">Parçalar</span></>)}
          </h2>
          {subtitle && <p className="text-[12px] font-body text-text-muted mt-1">{subtitle}</p>}
        </div>
        <Link
          href="/urunler"
          className="text-[11px] uppercase tracking-[0.15em] font-body text-gold hover:text-gold-light transition-colors hidden sm:block"
        >
          Tümünü Gör →
        </Link>
      </div>
      <FeaturedCarousel products={products} />
    </section>
  )
}
