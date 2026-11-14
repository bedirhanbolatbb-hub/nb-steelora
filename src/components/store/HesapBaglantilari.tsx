'use client'

import Link from 'next/link'
import { useOturumVar } from '@/hooks/useOturumVar'

type Baglanti = { href: string; label: string }

/**
 * Altbilgideki hesap bağlantıları — oturuma göre (14 Kas 2026).
 * Altbilgi sunucu bileşeni ve sayfa önbellekten geliyor; oturum kararı
 * tarayıcıda verilir (hooks/useOturumVar).
 */
export default function HesapBaglantilari({
  girisli,
  girissiz,
  className,
}: {
  girisli: readonly Baglanti[]
  girissiz: readonly Baglanti[]
  className: string
}) {
  const oturum = useOturumVar()
  return (
    <>
      {(oturum ? girisli : girissiz).map((link) => (
        <li key={link.href}>
          <Link href={link.href} prefetch={false} className={className}>
            {link.label}
          </Link>
        </li>
      ))}
    </>
  )
}
