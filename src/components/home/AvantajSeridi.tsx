import { Gift, RotateCcw, ShieldCheck, Truck } from 'lucide-react'

/**
 * İlk ekranın hemen altındaki fayda şeridi (Kasım 2026).
 *
 * BB: "tüm siparişlerde alt limit olmaksızın kargo ücretsiz; bu özelliğimiz
 * ana sayfada dikkat çekici görülmeli." Müşterinin ilk ekranda aklına gelen
 * dört soru — kargo kaç para, iade edebilir miyim, ödeme güvenli mi, nasıl
 * paketleniyor — burada tek bakışta cevaplanır. Telefonda 2×2, masaüstünde
 * tek sıra.
 *
 * YENİ İDDİA YOK: dördü de sitede zaten yazan vaatler (lib/shipping.ts,
 * WhyUs, sepet güven satırı). Panel karşılığı gerekmiyor — sabit vaatler.
 */
const MADDELER = [
  { Icon: Truck, baslik: 'Ücretsiz kargo', metin: 'Tüm siparişlerde, alt limit yok', vurgulu: true },
  { Icon: Gift, baslik: 'Hediye kutusunda', metin: 'Her sipariş kutusunda gönderilir', vurgulu: false },
  { Icon: RotateCcw, baslik: '14 gün iade', metin: 'Koşulsuz iade hakkı', vurgulu: false },
  { Icon: ShieldCheck, baslik: 'Güvenli ödeme', metin: 'iyzico güvencesiyle', vurgulu: false },
] as const

export default function AvantajSeridi() {
  return (
    <section aria-label="Alışveriş güvenceleri" className="border-b border-line bg-bg">
      <ul className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-4 gap-y-4 px-4 py-5 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-6">
        {MADDELER.map(({ Icon, baslik, metin, vurgulu }) => (
          <li key={baslik} className="flex items-start gap-3">
            <span
              className={
                vurgulu
                  ? 'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-bg'
                  : 'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-line/40 text-accent-deep'
              }
            >
              <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-body text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
                {baslik}
              </span>
              <span className="mt-0.5 block font-body text-[12px] leading-snug text-ink-soft">{metin}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
