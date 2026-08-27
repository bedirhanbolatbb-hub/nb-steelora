import { Gem, Truck, RotateCcw, Gift } from 'lucide-react'
import { FREE_SHIPPING_MIN_LABEL } from '@/lib/shipping'

/**
 * Neden NB Steelora v2 — 4 sütun, ikonlu, tek satır açıklamalar.
 * Vaatler mevcut sabitlerden; yeni iddia yok.
 */
const MADDELER = [
  { Icon: Gem, baslik: '316L Medikal Çelik', metin: 'Kararmaz, paslanmaz, solmaz.' },
  // Faz 11A: etiket küçültülüyordu ve ekranda cümle "tüm siparişlerde." diye
  // küçük harfle başlıyordu. Diğer üç maddenin hepsi büyük harfle başlıyor;
  // tek bu satır bozuktu. Sabit olduğu gibi basılır.
  { Icon: Truck, baslik: 'Ücretsiz Kargo', metin: `${FREE_SHIPPING_MIN_LABEL}.` },
  { Icon: RotateCcw, baslik: 'Kolay İade', metin: 'Koşulsuz 14 gün iade hakkı.' },
  // Faz 11D: "Hediye Paketi" hediye ürün algısı yaratıyordu; tek anlam —
  // her sipariş kutuda gelir. Kutunun görünümüne dair sıfat da yazılmıyor.
  { Icon: Gift, baslik: 'Hediye Kutusu', metin: 'Her sipariş hediye kutusunda gönderilir.' },
]

export default function WhyUs() {
  return (
    <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-20">
      <div className="mb-10 text-center" data-reveal>
        <p className="eyebrow">Neden NB Steelora</p>
        <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
          Her parçanın arkasında duruyoruz
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 lg:gap-8">
        {MADDELER.map(({ Icon, baslik, metin }, i) => (
          <div
            key={baslik}
            className="text-center"
            data-reveal
            style={{ '--reveal-delay': `${i * 50}ms` } as React.CSSProperties}
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent-line/40 text-accent-deep">
              <Icon size={18} strokeWidth={1.4} />
            </span>
            <h3 className="mt-3 text-[11px] font-body font-semibold uppercase tracking-[0.16em] text-ink">
              {baslik}
            </h3>
            <p className="mt-1.5 text-[12px] font-body text-ink-soft">{metin}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
