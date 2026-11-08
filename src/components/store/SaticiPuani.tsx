import { saticiPuaniCumlesi, type SaticiPuani } from '@/lib/metin/saticiPuani'

/**
 * Trendyol satıcı puanı rozeti — üç görünüm, tek dil (8 Kas 2026).
 *
 *  · SaticiPuaniKarti  → ürün sayfası, güven şeridinin altı
 *  · SaticiPuaniBandi  → ana sayfa, fayda şeridinin içi
 *  · SaticiPuaniSatiri → sepet paneli, /sepet, ödeme, havale bekleyen sipariş
 *
 * TASARIM: kuyumculuktaki ayar damgasından esinli ince altın halka. Yay,
 * puanın kendisi kadar dolu (9,7 → %97): tepedeki küçük boşluk dürüst ve
 * "10 üzerinden" bilgisini görsel olarak da verir. Rakam Playfair, astar
 * rakam (lining-nums) — eski stil rakamda "10" "1o" gibi okunuyordu.
 *
 * Trendyol logosu ya da rozet görseli KULLANILMAZ (marka izni yok; sitenin
 * fildişi-mürekkep-altın dilini de bozardı) — kaynak yazıyla söylenir.
 * Veri ve gizleme kuralları: lib/metin/saticiPuani.
 *
 * Kanca da 'use client' da yok: sunucu sayfaları ve istemci bileşenleri aynı
 * dosyayı kullanır. Ekran okuyucu tek cümle duyar; görsel parçalar gizli.
 */

const CEVRE = 2 * Math.PI * 30

function Muhur({
  veri,
  kimlik,
  boyut,
  yazi,
}: {
  veri: SaticiPuani
  kimlik: string
  boyut: string
  yazi: string
}) {
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center ${boyut}`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={kimlik} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E2C88F" />
            <stop offset="0.55" stopColor="#B8934E" />
            <stop offset="1" stopColor="#7E6232" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="none" stroke="#A78443" strokeOpacity="0.18" strokeWidth="1" />
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke={`url(#${kimlik})`}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray={`${(CEVRE * veri.oran).toFixed(2)} ${CEVRE.toFixed(2)}`}
          transform="rotate(-90 32 32)"
        />
        <circle cx="32" cy="32" r="26.25" fill="none" stroke="#A78443" strokeOpacity="0.32" strokeWidth="0.6" />
      </svg>
      <span className={`relative font-heading font-semibold leading-none text-ink lining-nums ${yazi}`}>
        {veri.puan}
      </span>
    </span>
  )
}

function Ayrac() {
  return <span className="text-accent-line/60">·</span>
}

/** Ürün sayfası: güven şeridinin altında, hediye satırının üstünde. */
export function SaticiPuaniKarti({ veri, className = '' }: { veri: SaticiPuani; className?: string }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-[4px] border border-accent-line/25 bg-gradient-to-r from-accent-soft via-surface to-surface px-4 py-3.5 ${className}`}
    >
      <span className="sr-only">{saticiPuaniCumlesi(veri)}</span>
      <Muhur veri={veri} kimlik="sp-altin-kart" boyut="h-16 w-16" yazi="text-[21px]" />
      <div aria-hidden="true" className="min-w-0">
        <p className="font-heading text-[16px] font-semibold leading-snug text-ink">Trendyol satıcı puanımız</p>
        <p className="mt-1 font-body text-[12px] text-ink-soft">
          10 üzerinden
          {veri.takipci && (
            <>
              {' '}
              <Ayrac /> {veri.takipci} takipçi
            </>
          )}
        </p>
        <p className="mt-0.5 font-body text-[10.5px] text-muted">{veri.tarih} itibarıyla</p>
      </div>
    </div>
  )
}

/** Ana sayfa: fayda şeridinin (AvantajSeridi) içinde, ince çizginin altında. */
export function SaticiPuaniBandi({ veri }: { veri: SaticiPuani }) {
  return (
    <div className="border-t border-line/80">
      <div className="mx-auto flex max-w-[1400px] items-center justify-center gap-4 px-4 py-5 lg:gap-5 lg:px-8 lg:py-6">
        <span className="sr-only">{saticiPuaniCumlesi(veri)}</span>
        <Muhur
          veri={veri}
          kimlik="sp-altin-bant"
          boyut="h-[68px] w-[68px] lg:h-[76px] lg:w-[76px]"
          yazi="text-[22px] lg:text-[25px]"
        />
        <div aria-hidden="true" className="min-w-0">
          <p className="font-heading text-[19px] font-semibold leading-snug text-ink lg:text-[22px]">
            Trendyol satıcı puanımız
          </p>
          <p className="mt-1 font-body text-[12px] text-ink-soft lg:text-[13px]">
            10 üzerinden
            {veri.takipci && (
              <>
                {' '}
                <Ayrac /> {veri.takipci} takipçi
              </>
            )}
          </p>
          <p className="mt-0.5 font-body text-[10.5px] text-muted lg:text-[11px]">{veri.tarih} itibarıyla</p>
        </div>
      </div>
    </div>
  )
}

/** Tek satır: sepet, ödeme ve havale bekleyen sipariş ekranı. */
export function SaticiPuaniSatiri({ veri, className = '' }: { veri: SaticiPuani; className?: string }) {
  return (
    <p className={`font-body text-[11px] text-ink-soft ${className}`}>
      <span className="sr-only">{saticiPuaniCumlesi(veri)}</span>
      <span aria-hidden="true" className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
        <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] shrink-0">
          <path
            fill="#B8934E"
            d="M12 2.6l2.87 6.13 6.73.78-4.98 4.6 1.33 6.64L12 17.4l-5.95 3.35 1.33-6.64-4.98-4.6 6.73-.78z"
          />
        </svg>
        <span>Trendyol satıcı puanımız</span>
        <span className="whitespace-nowrap">
          <span className="font-heading text-[14px] font-semibold leading-none text-ink lining-nums">{veri.puan}</span>
          <span className="text-muted">/10</span>
        </span>
        {veri.takipci && (
          <>
            <Ayrac />
            <span className="whitespace-nowrap">{veri.takipci} takipçi</span>
          </>
        )}
      </span>
    </p>
  )
}
