'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Sitenin en üstündeki duyuru satırı (Faz 36).
 *
 * ÖLÇÜLEN KUSUR (375px telefon): "Tüm siparişlerde ücretsiz kargo • İlk
 * siparişinize özel %10 — Kod: HOSGELDIN10" iki satıra sarıyordu; geniş harf
 * aralıklı büyük harf iki satır 46px tutuyor ve ilk ekranda logodan önce okunan
 * ilk şey oluyordu. Masaüstünde tek satıra sığdığı için sorun yalnız mobilde.
 *
 * ÇÖZÜM: metin "•" ile ayrılmış mesajlara bölünür. Mobilde aynı anda TEK mesaj
 * görünür, 5 saniyede bir yumuşakça değişir; dokununca sıradakine geçer.
 * Masaüstü eskisi gibi tam satır.
 *
 *  · Bütün mesajlar aynı ızgara hücresinde üst üste durur — hücrenin boyu en
 *    uzun mesajın boyudur, değişirken satır ZIPLAMAZ (başlık bu yüksekliği
 *    ölçüp kayarken kullanıyor, bkz. Navbar).
 *  · Yalnız opacity ve transform anime edilir.
 *  · Hareketi azalt tercihinde dönme YOK: mobilde de tam metin (eski hâli)
 *    basılır. Ekran okuyucu her durumda tam metni bir kez okur.
 */
const DEGISIM_MS = 5000

export function mesajlaraBol(metin: string): string[] {
  return metin
    .split(/\s+[•·|]\s+/)
    .map((m) => m.trim())
    .filter(Boolean)
}

export default function DuyuruSeridi({ metin, className }: { metin: string; className?: string }) {
  const mesajlar = mesajlaraBol(metin)
  const coklu = mesajlar.length > 1
  const [sira, setSira] = useState(0)

  useEffect(() => {
    if (!coklu) return
    if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return
    const t = window.setTimeout(() => setSira((s) => (s + 1) % mesajlar.length), DEGISIM_MS)
    return () => window.clearTimeout(t)
  }, [coklu, sira, mesajlar.length])

  const yazi = cn('font-body uppercase text-accent-deep', className)

  return (
    <>
      {/* Ekran okuyucu için tam metin, bir kez */}
      <p className="sr-only">{metin}</p>

      {/* Masaüstü (ve tek mesaj): tam satır */}
      <p aria-hidden className={cn(yazi, 'text-[10px] tracking-[0.2em]', coklu && 'hidden lg:block')}>
        {metin}
      </p>

      {coklu && (
        <>
          {/* Mobil · hareketi azalt: eski tam metin */}
          <p aria-hidden className={cn(yazi, 'hidden text-[10px] tracking-[0.2em] max-lg:motion-reduce:block')}>
            {metin}
          </p>

          {/* Mobil: tek mesaj, sırayla */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setSira((s) => (s + 1) % mesajlar.length)}
            className="hidden w-full cursor-default text-center max-lg:motion-safe:grid"
          >
            {mesajlar.map((m, i) => (
              <span
                key={m}
                className={cn(
                  yazi,
                  'col-start-1 row-start-1 text-balance text-[10px] tracking-[0.16em]',
                  'transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
                  i === sira ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                )}
              >
                {m}
              </span>
            ))}
          </button>
        </>
      )}
    </>
  )
}
