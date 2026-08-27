'use client'

import Link from 'next/link'
import { useUyelikTesviki } from './UyelikTesvikContext'
import { uyelikTesvikCumlesi } from '@/lib/campaigns/uyelikTesviki'

/**
 * "Üye olursanız %X indirim" satırı (Faz 11E).
 *
 * Yalnız aktif, kod GEREKTİRMEYEN, "yalnız üyelere" bir kampanya varsa basılır
 * — yoksa hiç render edilmez (olmayan indirim vaat edilmez, gizli kampanya
 * sızdırılmaz). Ödeme bağlamında akışı kesmez: uyarı değil, tek satırlık
 * nazik bir hatırlatma; kapatma/onaylama gerektirmez.
 */
export default function UyelikTesvikSatiri({
  baglam,
  gizliyseGosterme = false,
}: {
  baglam: 'kayit' | 'sepet' | 'odeme'
  /** Üye zaten giriş yaptıysa satır anlamsız — çağıran taraf bunu bildirir. */
  gizliyseGosterme?: boolean
}) {
  const tesvik = useUyelikTesviki()
  if (!tesvik || gizliyseGosterme) return null

  const cumle = uyelikTesvikCumlesi(tesvik, baglam)

  return (
    <p className="rounded-[4px] border border-accent-line/40 bg-accent/5 px-3.5 py-2.5 font-body text-[12px] leading-relaxed text-ink-soft">
      {cumle}
      {baglam !== 'kayit' && (
        <>
          {' '}
          <Link href="/kayit" className="text-accent-deep underline underline-offset-2 hover:text-ink">
            Üye ol
          </Link>
          {' · '}
          <Link href="/giris" className="text-accent-deep underline underline-offset-2 hover:text-ink">
            Giriş yap
          </Link>
        </>
      )}
    </p>
  )
}
