import Image from 'next/image'
import Link from 'next/link'

export default function BrandBanner() {
  return (
    <section className="bg-champagne-dark">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
        {/* Sol: Marka çekimi (saten kare, statik asset) */}
        <div className="w-full lg:w-1/2 aspect-[4/3] relative overflow-hidden rounded-[4px] border border-line">
          <Image
            src="/hediye-paketi.jpg"
            alt="Saten kumaş üzerinde NB Steelora takı sunumu"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* Sağ: İçerik */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <p className="eyebrow">Özel Hediye Paketi</p>
          <h2 className="font-heading text-[36px] lg:text-[42px] font-semibold text-ink mt-4 leading-tight">
            Sevdiklerinize özel
            <br />
            hediye paketi
          </h2>
          <p className="text-[13px] font-body text-text-secondary mt-4 leading-relaxed max-w-md mx-auto lg:mx-0">
            Her sipariş için ücretsiz premium hediye kutusu ile sevdiklerinizi mutlu edin.
          </p>
          <Link
            href="/urunler"
            className="inline-flex items-center mt-8 bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-all duration-300"
          >
            Hediye Seç
          </Link>
        </div>
      </div>
    </section>
  )
}
