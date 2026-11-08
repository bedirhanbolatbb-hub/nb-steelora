import { Gift, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { SaticiPuaniBandi } from '@/components/store/SaticiPuani'
import type { SaticiPuani } from '@/lib/metin/saticiPuani'

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
 *
 * 8 Kas 2026: şeridin altında Trendyol satıcı puanı bandı (panel: Site
 * Metinleri → Trendyol satıcı puanı). Puan yoksa/eskiyse bant hiç basılmaz.
 */
const MADDELER = [
  { Icon: Truck, baslik: 'Ücretsiz kargo', metin: 'Tüm siparişlerde, alt limit yok', vurgulu: true },
  // Hediye notu ödeme adımında, ücretsiz (lib/legal/sss.ts ile aynı vaat).
  { Icon: Gift, baslik: 'Hediye kutusunda', metin: 'Her siparişte, hediye notu ücretsiz', vurgulu: false },
  // "Koşulsuz" yazılmaz: hijyen mührü açılmış küpe/piercing ve kişiye özel
  // ürünlerde cayma hakkı yok (bkz. /kargo-ve-iade). Doğru ve güçlü olan iki
  // vaat: sebep sorulmaz, iade kargosu bizden.
  { Icon: RotateCcw, baslik: '14 gün iade', metin: 'Sebep göstermeden, iade kargosu bizden', vurgulu: false },
  // 7 Kas 2026: "iyzico güvencesiyle" kalktı (kart ödemesi kapalı, havale/EFT).
  // ETBİS kaydı sitede zaten doğrulanabilir (footer bağlantısı) — yeni iddia değil.
  { Icon: ShieldCheck, baslik: 'Kayıtlı satıcı', metin: 'Ticaret Bakanlığı ETBİS kaydı', vurgulu: false },
] as const

export default function AvantajSeridi({ saticiPuani = null }: { saticiPuani?: SaticiPuani | null }) {
  return (
    <section aria-label="Alışveriş güvenceleri" className="border-b border-line bg-bg">
      <ul className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-3 gap-y-4 px-4 py-5 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-6">
        {MADDELER.map(({ Icon, baslik, metin, vurgulu }) => (
          <li key={baslik} className="flex items-start gap-2.5 sm:gap-3">
            <span
              className={
                vurgulu
                  ? 'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-bg sm:h-9 sm:w-9'
                  : 'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-line/40 text-accent-deep sm:h-9 sm:w-9'
              }
            >
              <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-ink sm:text-[12px] sm:tracking-[0.12em]">
                {baslik}
              </span>
              <span className="mt-0.5 block font-body text-[12px] leading-snug text-ink-soft">{metin}</span>
            </span>
          </li>
        ))}
      </ul>
      {saticiPuani && <SaticiPuaniBandi veri={saticiPuani} />}
    </section>
  )
}
