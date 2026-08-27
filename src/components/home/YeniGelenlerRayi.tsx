'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Yeni Gelenler kaydırma rayı (Faz 11B-ek).
 *
 * ÖLÇÜLEN KUSUR: bölüm düz bir overflow-x-auto şeritti. Mobilde parmakla
 * kayıyordu ama MASAÜSTÜNDE ne ok vardı ne gösterge — 1400px kapta ~4,6 kart
 * görünüyor, kalanına ulaşmanın görünür bir yolu yoktu. BB panelden 8 ürün
 * seçti, sitede "4 var" sandı; fazlası fiziksel olarak oradaydı ama
 * erişilmez görünüyordu.
 *
 * Kartlar sunucuda basılır (children); bu sarmalayıcı yalnız kaydırma
 * davranışını ekler:
 *  · masaüstünde 44×44 ok düğmeleri (klavyeyle odaklanabilir, uçlarda pasif)
 *  · mobilde parmakla kaydırma aynen (yerli scroll + snap)
 *  · nokta göstergesi — kaç sayfa olduğunu ve nerede olunduğunu söyler
 *  · prefers-reduced-motion'da kaydırma animasyonsuz atlar
 */
export default function YeniGelenlerRayi({ children }: { children: React.ReactNode }) {
  const rayRef = useRef<HTMLDivElement>(null)
  const [sayfaSayisi, setSayfaSayisi] = useState(1)
  const [aktifSayfa, setAktifSayfa] = useState(0)
  const [bas, setBas] = useState(true)
  const [son, setSon] = useState(true)

  const olc = useCallback(() => {
    const ray = rayRef.current
    if (!ray) return
    const sayfa = Math.max(1, Math.ceil((ray.scrollWidth - 4) / ray.clientWidth))
    setSayfaSayisi(sayfa)
    setAktifSayfa(Math.min(sayfa - 1, Math.round(ray.scrollLeft / ray.clientWidth)))
    setBas(ray.scrollLeft <= 4)
    setSon(ray.scrollLeft + ray.clientWidth >= ray.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const ray = rayRef.current
    if (!ray) return
    olc()
    const go = new ResizeObserver(olc)
    go.observe(ray)
    ray.addEventListener('scroll', olc, { passive: true })
    return () => {
      go.disconnect()
      ray.removeEventListener('scroll', olc)
    }
  }, [olc])

  const kaydir = (yon: -1 | 1) => {
    const ray = rayRef.current
    if (!ray) return
    // scrollBy(±0.9×genişlik) DEĞİL: hedef iki snap noktası arasına düşüyor
    // ve kap `snap-mandatory` olduğu için WebKit programatik kaydırmayı en
    // yakın snap noktasına GERİ yaylandırabiliyor — Safari'de ok tıklaması
    // hiç kaydırmıyor görünüyordu (Chromium ileri noktaya oturttuğu için
    // orada fark edilmedi). Hedef artık bir KARTIN kendi başlangıcı: snap
    // noktasına birebir oturur, geri yaylanacak ara konum kalmaz.
    const kartlar = [...(ray.firstElementChild?.children ?? [])] as HTMLElement[]
    if (!kartlar.length) return
    const rayKutu = ray.getBoundingClientRect()
    // kartın scroll koordinatındaki sol kenarı
    const konum = (k: HTMLElement) => k.getBoundingClientRect().left - rayKutu.left + ray.scrollLeft
    const istenen = ray.scrollLeft + yon * ray.clientWidth * 0.9
    const adaylar = kartlar
      .map(konum)
      .filter((x) => (yon === 1 ? x > ray.scrollLeft + 8 : x < ray.scrollLeft - 8))
    const maks = ray.scrollWidth - ray.clientWidth
    const hedef = adaylar.length
      ? adaylar.reduce((a, b) => (Math.abs(b - istenen) < Math.abs(a - istenen) ? b : a))
      : yon === 1
        ? maks
        : 0
    const nihai = Math.max(0, Math.min(maks, hedef))
    const azaltilmis = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const baslangic = ray.scrollLeft
    ray.scrollTo({ left: nihai, behavior: azaltilmis ? 'auto' : 'smooth' })
    // Sigorta: BB canlıda "tık kaydırmıyor (0→0)" ölçtü; Chromium ve Playwright
    // WebKit'te yeniden üretilemedi ama gerçek Safari'nin snap-mandatory kapta
    // programatik yumuşak kaydırmayı iptal ettiği biliniyor. Hangi motor olursa
    // olsun: yarım saniyede kıpırdama yoksa animasyonsuz zorla — düğme HER
    // tarayıcıda kaydırır.
    if (!azaltilmis) {
      window.setTimeout(() => {
        if (rayRef.current === ray && Math.abs(ray.scrollLeft - baslangic) < 2 && baslangic !== nihai) {
          ray.scrollTo({ left: nihai, behavior: 'auto' })
        }
      }, 450)
    }
  }

  const coklu = sayfaSayisi > 1

  return (
    <div className="relative">
      <div
        ref={rayRef}
        className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex gap-4 lg:gap-5 snap-x snap-mandatory">{children}</div>
      </div>

      {coklu && (
        <>
          {/* Oklar — yalnız masaüstü; mobil zaten parmakla kayıyor */}
          <button
            onClick={() => kaydir(-1)}
            disabled={bas}
            aria-label="Önceki ürünler"
            className="absolute -left-3 top-[38%] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/95 text-ink shadow-sm transition-colors hover:border-ink disabled:opacity-25 disabled:hover:border-line sm:flex"
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => kaydir(1)}
            disabled={son}
            aria-label="Sonraki ürünler"
            className="absolute -right-3 top-[38%] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/95 text-ink shadow-sm transition-colors hover:border-ink disabled:opacity-25 disabled:hover:border-line sm:flex"
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>

          {/* Nokta göstergesi — kaç sayfa var, neredeyiz */}
          <div className="mt-1 flex items-center justify-center gap-1.5" aria-hidden>
            {Array.from({ length: sayfaSayisi }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-300 ${
                  i === aktifSayfa ? 'w-5 bg-ink' : 'w-1.5 bg-ink/20'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
