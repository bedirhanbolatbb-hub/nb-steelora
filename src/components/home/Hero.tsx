import Link from 'next/link'

export default function Hero() {
  return (
    <section className="min-h-[580px] grid grid-cols-1 lg:grid-cols-2">
      {/* Sol: İçerik */}
      <div className="bg-dark-mid flex flex-col justify-center px-8 lg:px-16 py-16 lg:py-0 order-2 lg:order-1">
        <span className="text-gold text-[10px] uppercase tracking-[0.25em] font-body mb-6">
          Yeni Koleksiyon — 2025
        </span>
        <h1 className="font-heading text-[40px] sm:text-[48px] lg:text-[56px] font-light text-champagne leading-[1.1]">
          Her anın
          <br />
          <span className="italic text-gold">zarif</span>
          <br />
          tanığı
        </h1>
        <p className="text-[12px] font-body text-champagne-mid/60 max-w-sm mt-6 leading-relaxed">
          Özenle tasarlanmış her bir parça, stilinize zarafet ve anlam katar.
          Kendinizi özel hissetmeniz için tasarlandı.
        </p>
        <Link
          href="/urunler"
          className="inline-flex items-center mt-8 border border-gold text-gold text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3.5 hover:bg-gold hover:text-white transition-all duration-300 self-start"
        >
          Koleksiyonu Keşfet
        </Link>
      </div>

      {/* Sağ: Görsel Grid */}
      <div className="grid grid-rows-2 grid-cols-2 gap-1 order-1 lg:order-2 min-h-[400px] lg:min-h-0">
        <div className="col-span-2 bg-champagne-dark relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">
              Koleksiyon Görseli
            </span>
          </div>
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">
              Ürün 1
            </span>
          </div>
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">
              Ürün 2
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
