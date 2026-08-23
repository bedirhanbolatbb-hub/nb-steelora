'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * "Otomatik öner" düğmesi ve üç alternatif (Faz 21).
 *
 * BB kampanya/duyuru kurarken metin yazmakla uğraşmak istemiyor. Yapay zekâ
 * çağrısı YOK: öneriler kurallı metin kütüphanesinden (src/lib/metin/) geliyor,
 * ölçüt docs/marka-sesi.md. Öneri tıklanınca alana düşer, BB dilediğince
 * düzenler. Alan boş bırakılırsa yayında otomatik metin kullanılır.
 *
 * Bileşen metni ÜRETMEZ — üreteci çağıran taraf verir. Böylece kampanya,
 * koleksiyon ve ürün formları aynı arayüzü paylaşır.
 */
export default function MetinOner({
  uret,
  onSec,
  etiket = 'Otomatik öner',
  bosMesaj = 'Bu alanlarla metin üretilemedi — önce tür ve değer alanlarını doldurun.',
}: {
  /** Çağrıldığında güncel alternatifleri döndürür. */
  uret: () => string[]
  onSec: (metin: string) => void
  etiket?: string
  bosMesaj?: string
}) {
  const [oneriler, setOneriler] = useState<string[] | null>(null)

  const yenile = () => setOneriler(uret())

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
                className="w-full rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface-muted)] px-3 py-2 text-left text-[12px] leading-relaxed text-[var(--p-ink)] transition-colors hover:border-[var(--p-accent)] hover:bg-[var(--p-surface)]"
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
