import Link from 'next/link'
import { ShieldCheck, Store, Tag } from 'lucide-react'
import { SaticiPuaniBandi } from '@/components/store/SaticiPuani'
import type { SaticiPuani } from '@/lib/metin/saticiPuani'
import { odemeGuvenceSatiri } from '@/lib/metin/guven'
import { kartOdemesiAcikMi } from '@/lib/tosla/client'

/**
 * Marka bölümü v3 (24 Kas 2026 tasarım denetimi) — eski "Neden NB Steelora".
 *
 * Eski bölüm dört ikonlu bir ızgaraydı ve ilk ekranın altındaki rozetlerin
 * aynısını tekrar ediyordu (ücretsiz kargo, iade, hediye kutusu); ilk kutusu
 * da "316L Medikal Çelik — Kararmaz, paslanmaz, solmaz" diyordu. Kataloğun
 * yarısı kaplama pirinç; mutlak ve belgesiz bir sözdü, kaldırıldı.
 *
 * Yerine markanın kim olduğu ve neye güvenilebileceği: metin Hakkımızda
 * sayfasındaki yayınlanmış cümlelerden, ödeme satırı lib/metin/guven'den
 * (tek kaynak). Üç satırın üçü de DOĞRULANABİLİR şeyler söyler. Trendyol
 * puanının tarihli tam hâli burada durur (ilk ekranın altındaki şeritte
 * yalnız rakam var).
 *
 * "Tasarlıyoruz / üretiyoruz" YAZILMAZ: ürünler seçilir, kontrol edilir,
 * paketlenir.
 */
export default function WhyUs({ saticiPuani = null }: { saticiPuani?: SaticiPuani | null }) {
  const satirlar = [
    {
      Icon: Tag,
      baslik: 'Malzemesi açıkça yazar',
      metin: 'Her ürünün sayfasında: 316L paslanmaz çelik ya da kaplama pirinç. Kaplama ürünler bijuteridir; altın ya da gümüş değildir.',
    },
    {
      Icon: ShieldCheck,
      baslik: 'Güvenli ödeme',
      metin: odemeGuvenceSatiri(kartOdemesiAcikMi()),
    },
    {
      Icon: Store,
      baslik: 'Satıcı bilgileri açık',
      metin: 'Unvanımız, adresimiz ve ETBİS kaydımız İletişim sayfasında ve her sayfanın altında yazar.',
    },
  ]

  return (
    <section className="pt-12 lg:pt-20">
      <div className="mx-auto max-w-[1400px] px-4 lg:grid lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div data-reveal>
          <h2 className="font-heading text-[24px] font-medium leading-tight text-ink lg:text-[32px]">
            Seçiyoruz, kontrol ediyoruz, paketliyoruz
          </h2>
          <p className="mt-3 max-w-[58ch] font-body text-[15px] leading-relaxed text-ink-soft">
            NB Steelora, Mersin&apos;den tüm Türkiye&apos;ye satış yapan tescilli bir takı
            markasıdır. 316L paslanmaz çelik ve kaplama takıları seçip sunuyoruz; gelen her
            parçayı tek tek kontrol ediyor, hediye kutusunda kendimiz paketleyip gönderiyoruz.
          </p>
          <Link
            prefetch={false}
            href="/hakkimizda"
            className="mt-2 inline-flex min-h-[44px] items-center font-body text-[14px] text-ink underline decoration-accent underline-offset-4 transition-colors hover:text-accent-deep"
          >
            Hakkımızda
          </Link>
        </div>

        <ul className="mt-4 divide-y divide-line border-y border-line font-body lg:mt-0">
          {satirlar.map(({ Icon, baslik, metin }, i) => (
            <li
              key={baslik}
              className="flex items-start gap-3 py-3.5"
              data-reveal
              style={{ '--reveal-delay': `${i * 50}ms` } as React.CSSProperties}
            >
              <Icon size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-deep" aria-hidden />
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-ink">{baslik}</h3>
                <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">{metin}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {saticiPuani && (
        <div className="mt-8 lg:mt-12">
          <SaticiPuaniBandi veri={saticiPuani} />
        </div>
      )}
    </section>
  )
}
