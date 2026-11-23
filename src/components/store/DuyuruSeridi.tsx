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

  // 24 Kas 2026 tasarım denetimi: 10 px büyük harf + geniş harf aralığı yerine
  // 13 px cümle düzeni — şerit bir etiket değil, okunan bir cümle.
  const yazi = cn('font-body font-medium text-accent-deep', className)

  return (
    <>
      {/* Ekran okuyucu için tam metin, bir kez */}
      <p className="sr-only">{metin}</p>

      {/* Masaüstü (ve tek mesaj): tam satır */}
      <p aria-hidden className={cn(yazi, 'text-[13px] leading-snug', coklu && 'hidden lg:block')}>
        {metin}
      </p>

      {coklu && (
        <>
          {/* Mobil · hareketi azalt: eski tam metin */}
          <p aria-hidden className={cn(yazi, 'hidden text-[13px] leading-snug max-lg:motion-reduce:block')}>
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
                  'col-start-1 row-start-1 text-balance text-[13px] leading-snug',
                  // Giden mesaj ÖNCE söner (200 ms), gelen ONDAN SONRA belirir
                  // (200 ms gecikme): eskiden iki yazı yarım saniye üst üste
                  // biniyor, okunmaz bir leke oluşuyordu.
                  'transition-opacity ease-out',
                  i === sira ? 'opacity-100 delay-200 duration-300' : 'pointer-events-none opacity-0 duration-200'
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
