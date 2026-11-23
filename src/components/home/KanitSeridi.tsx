import { saticiPuaniCumlesi, type SaticiPuani } from '@/lib/metin/saticiPuani'
import { FREE_SHIPPING_SHORT } from '@/lib/shipping'
import { GUVEN_METNI } from '@/lib/metin/guven'

/**
 * İlk ekranın hemen altındaki kanıt şeridi (24 Kas 2026 tasarım denetimi).
 *
 * Eskiden burada iki blok vardı: dört ikonlu 2×2 rozet ızgarası (159 px) ve
 * altında Trendyol puanı bandı (110 px) — telefonda 269 px, ilk ekranın
 * dışında. Aynı dört söz sayfanın altında "Neden NB Steelora" başlığıyla bir
 * kez daha tekrarlanıyordu. Artık TEK satır, üç sütun: en güçlü kanıt (puan)
 * başta, sonra ücretsiz kargo ve iade. Hediye kutusu kendi bölümünde,
 * satıcı kaydı marka bölümünde ve alt bilgide söylenir.
 *
 * BB (Kasım 2026): "alt limit olmaksızın kargo ücretsiz; ana sayfada dikkat
 * çekici görülmeli" — söz duyuru şeridinde, ilk ekranın yazısında ve burada.
 *
 * YENİ İDDİA YOK. Puanın tarihi ve takipçi sayısı sayfanın altındaki marka
 * bölümünde tam hâliyle durur (SaticiPuaniBandi); puan yoksa/eskiyse ilk
 * sütun hediye kutusu olur.
 */
export default function KanitSeridi({ saticiPuani = null }: { saticiPuani?: SaticiPuani | null }) {
  const sutunlar: { ust: string; alt: string; okunan?: string }[] = [
    ...(saticiPuani
      ? [{ ust: `${saticiPuani.puan} / 10`, alt: 'Trendyol satıcı puanımız', okunan: saticiPuaniCumlesi(saticiPuani) }]
      : [{ ust: GUVEN_METNI.hediye, alt: 'Her siparişte ücretsiz' }]),
    { ust: FREE_SHIPPING_SHORT, alt: 'Tüm siparişlerde, alt limit yok' },
    { ust: GUVEN_METNI.iade, alt: 'Sebep göstermeden, iade kargosu bizden' },
  ]

  return (
    <section aria-label="Alışveriş güvenceleri" className="border-b border-line bg-bg">
      <ul className="mx-auto grid max-w-[1400px] grid-cols-3 divide-x divide-line px-2 lg:px-8">
        {sutunlar.map((s) => (
          <li key={s.ust} className="px-2 py-4 text-center lg:py-5">
            {s.okunan && <span className="sr-only">{s.okunan}</span>}
            <p aria-hidden={s.okunan ? true : undefined} className="font-body text-[15px] font-semibold leading-tight text-ink lining-nums lg:text-[17px]">
              {s.ust}
            </p>
            <p aria-hidden={s.okunan ? true : undefined} className="mt-1 font-body text-[12px] leading-snug text-ink-soft lg:text-[13px]">
              {s.alt}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
