import Link from 'next/link'

export default function BrandBanner() {
  return (
    <section className="bg-champagne-dark">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
        {/* Sol: Görsel Placeholder */}
        <div className="w-full lg:w-1/2 aspect-[4/3] bg-champagne-mid relative overflow-hidden flex items-center justify-center">
          <span className="text-text-primary/20 text-[11px] font-body tracking-wider uppercase">
            Hediye Paketi Görseli
          </span>
        </div>

        {/* Sağ: İçerik */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <span className="text-gold text-[10px] uppercase tracking-[0.25em] font-body">
            Özel Hediye Paketi
          </span>
          <h2 className="font-heading text-[36px] lg:text-[42px] font-light text-text-primary mt-4 leading-tight">
            Sevdiklerinize özel
            <br />
            <span className="italic text-gold">hediye paketi</span>
          </h2>
          <p className="text-[12px] font-body text-text-secondary mt-4 leading-relaxed max-w-md mx-auto lg:mx-0">
            Her sipariş için ücretsiz premium hediye kutusu ile sevdiklerinizi mutlu edin.
          </p>
          <Link
            href="/urunler"
            className="inline-flex items-center mt-8 bg-gold text-white text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3.5 hover:bg-gold-light transition-all duration-300"
          >
            Hediye Seç
          </Link>
        </div>
      </div>
    </section>
  )
}
