'use client'

import { useEffect, useState, type ComponentType } from 'react'

// Tek kaynak src/lib/analytics/consent.ts; burada yalnız iki sabitin kopyası
// duruyor ki o modül (ve rıza metinleri) istemci ilk yük paketine hiç girmesin.
// Sürüm değişirse iki yer birlikte güncellenir.
const CONSENT_COOKIE = 'nb_consent'
const CONSENT_VERSION = '2026-08-1'

/**
 * Rıza bandının yükleme kapısı (Faz 12 cilası).
 *
 * Bandın kodu ilk yük paketinden çıkarıldı: bu kapı yalnız çerezi okur ve
 * gerçekten gösterilecekse bandı ayrı bir parça olarak indirir. Rıza kararını
 * vermiş ziyaretçi bandın kodunu HİÇ indirmez; kararsız ziyaretçide de ilk
 * boyamadan sonra gelir.
 *
 * `next/dynamic` yerine düz `import()` kullanılır — dynamic'in kendi çalışma
 * zamanı, kazandırdığından fazlasını geri ekliyordu (ölçüldü: +3,5 KB).
 */
export default function ConsentGate() {
  const [Banner, setBanner] = useState<ComponentType | null>(null)

  useEffect(() => {
    const yukle = () => {
      import('./ConsentBanner')
        .then((m) => setBanner(() => m.default))
        .catch(() => {})
    }

    // Ham çerez okuması — parseConsent'i (ve metinleri) buraya taşımıyoruz ki
    // kapı olabildiğince küçük kalsın; sürüm eşleşmesi yeterli bir sinyal.
    const ham = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))

    const kararVerilmis = Boolean(
      ham && decodeURIComponent(ham).includes(`"version":"${CONSENT_VERSION}"`)
    )
    // Kararsız ziyaretçide bandı boşta indir: ilk boyamayı bloklamaz.
    if (!kararVerilmis) {
      if ('requestIdleCallback' in window) {
        ;(window as any).requestIdleCallback(yukle, { timeout: 2000 })
      } else {
        setTimeout(yukle, 400)
      }
    }

    // Footer'daki «Çerez tercihleri» bağlantısı bandı sonradan da açabilir.
    window.addEventListener('nb:consent-ac', yukle)
    return () => window.removeEventListener('nb:consent-ac', yukle)
  }, [])

  if (!Banner) return null
  return <Banner />
}
