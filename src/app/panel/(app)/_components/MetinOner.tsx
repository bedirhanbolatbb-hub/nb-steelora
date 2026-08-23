'use client'

import { useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * "Otomatik öner" düğmesi ve üç alternatif (Faz 21, Faz 25'te düzeltildi).
 *
 * BB kampanya/duyuru kurarken metin yazmakla uğraşmak istemiyor. Yapay zekâ
 * çağrısı YOK: öneriler kurallı metin kütüphanesinden (src/lib/metin/) geliyor,
 * ölçüt docs/marka-sesi.md. Öneri tıklanınca alana düşer, BB dilediğince
 * düzenler. Alan boş bırakılırsa yayında otomatik metin kullanılır.
 *
 * ── Faz 25 kusuru ve düzeltmesi ────────────────────────────────────────
 * "Başka öner" hiçbir şey değiştirmiyordu. Bileşen her tıklamada `uret()`
 * çağırıyordu — orası doğruydu; kusur ÜRETEÇLERDEYDİ: dördü de sabit bir
 * liste döndürüyordu, yani "başka" diye bir şey yoktu.
 *
 * Sözleşme değişti: `uret()` artık ÜÇ değil, elindeki TÜM adayları döndürür;
 * pencereyi bu bileşen kaydırır. Böylece düzeltme dört çağrı yerinde birden
 * geçerli olur ve her üreteç kendi döndürme mantığını ayrı ayrı tekrarlamaz.
 */

const PENCERE = 3

/** En büyük ortak bölen — adım seçimi için. */
function obeb(a: number, b: number): number {
  return b === 0 ? a : obeb(b, a % b)
}

/**
 * İmlecin kaçar kaçar ilerleyeceği.
 *
 * Doğrudan PENCERE kadar ilerlemek havuz boyu 3'ün katı olduğunda döngüye
 * sokuyordu: 9 adaylı kolye kütüphanesi yalnız ÜÇ farklı üçlü üretiyor, dördüncü
 * tıklamada başa dönüyordu. Adım havuz boyuyla aralarında asal seçilirse
 * pencere havuzun TAMAMINI dolaşır ve ancak havuz bitince başa döner.
 */
function adimSec(havuzBoyu: number): number {
  for (let adim = PENCERE; adim < havuzBoyu + PENCERE; adim++) {
    if (obeb(adim % havuzBoyu || havuzBoyu, havuzBoyu) === 1) return adim
  }
  return 1
}

export default function MetinOner({
  uret,
  onSec,
  etiket = 'Otomatik öner',
  bosMesaj = 'Bu alanlarla metin üretilemedi — önce tür ve değer alanlarını doldurun.',
}: {
  /** Çağrıldığında GÜNCEL adayların TAMAMINI döndürür (üç değil, hepsi). */
  uret: () => string[]
  onSec: (metin: string) => void
  etiket?: string
  bosMesaj?: string
}) {
  const [oneriler, setOneriler] = useState<string[] | null>(null)
  /** Havuzda kaçıncı pencerede olduğumuz — tıklama başına ilerler. */
  const imlec = useRef(0)

  const yenile = () => {
    // Havuz her tıklamada yeniden istenir: form alanları değişmişse öneriler
    // de değişsin. Üreteçler belirlenimci olduğu için sıra kararlıdır.
    const havuz = uret()
    if (havuz.length === 0) {
      setOneriler([])
      return
    }
    if (havuz.length <= PENCERE) {
      // Kütüphane pencere kadar bile değilse döndürmenin anlamı yok.
      setOneriler(havuz)
      return
    }

    const oncekiImza = (oneriler ?? []).join(' ')
    const adim = adimSec(havuz.length)
    // Havuz tükenince başa döner. En fazla havuz boyu kadar ilerleyerek
    // ÜST ÜSTE AYNI üçlüyü vermemeyi garanti ederiz.
    for (let deneme = 0; deneme < havuz.length; deneme++) {
      imlec.current = (imlec.current + adim) % havuz.length
      const pencere = Array.from(
        { length: PENCERE },
        (_, i) => havuz[(imlec.current + i) % havuz.length]
      )
      if (pencere.join(' ') !== oncekiImza) {
        setOneriler(pencere)
        return
      }
    }
    setOneriler(havuz.slice(0, PENCERE))
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={yenile}
        className="inline-flex items-center gap-1.5 text-[11px] text-[var(--p-accent-deep)] hover:underline"
      >
        <Sparkles size={12} />
        {oneriler ? 'Başka öner' : etiket}
      </button>

      {oneriler && oneriler.length === 0 && (
        <p className="mt-1 text-[11px] text-[var(--p-warning)]">{bosMesaj}</p>
      )}

      {oneriler && oneriler.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {oneriler.map((m) => (
            <li key={m}>
              <button
                type="button"
                onClick={() => {
                  onSec(m)
                  setOneriler(null)
                }}
                className="w-full rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface-muted)] px-3 py-2 text-left text-[12px] leading-relaxed text-[var(--p-ink)] transition-colors hover:border-[var(--p-accent-line)] hover:bg-[var(--p-surface)]"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
