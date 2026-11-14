'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Sayfa görüntüleme ölçümü — TARAYICIDAN (14 Kas 2026).
 *
 * Önceden layout'ta sunucuda yazılıyordu (lib/analytics/server). Bu yüzden her
 * vitrin sayfası her istekte sunucuda yeniden çiziliyor, ücretsiz plandaki
 * sunucu süresi sınırını (ayda 4 saat) zorluyordu. Vitrin artık önbellekten
 * veriliyor; ölçüm buradan gider.
 *
 * Kurallar aynı kalır:
 *  - Robot ve kendi trafiğimiz (panel oturumu, "beni ölçme") /api/analytics/track
 *    içinde süzülür.
 *  - Önceden yükleme (prefetch) burada zaten sayılmaz: yalnız gerçekten açılan
 *    sayfa ölçülür.
 *  - UTM etiketleri adresten okunur (önceden proxy taşıyordu).
 *  - Yönlendiren: ilk sayfada document.referrer (dış kaynak), site içi
 *    geçişlerde bir önceki sayfa — sunucunun gördüğü Referer ile aynı anlam.
 *  - Instagram seçkisi '/' adresinde açılır ama sayfa /instagram'dır; o sayfa
 *    data-nb-yol işareti basar, yol oradan okunur.
 *
 * Gerçek tarayıcı işareti (TarayiciDogrula) ayrıca ve aynen gönderilmeye devam
 * eder; bu satırlar ondan meta.js taşımadıkları için ayrılır.
 */
export default function SayfaGoruntuleme() {
  const yol = usePathname()
  const onceki = useRef<string | null>(null)

  useEffect(() => {
    if (!yol) return
    const isaret = document.querySelector<HTMLElement>('[data-nb-yol]')?.dataset.nbYol
    const arama = new URLSearchParams(window.location.search)
    const meta: Record<string, string> = { kaynak: 'istemci' }
    for (const ad of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const deger = (arama.get(ad) || '').trim().slice(0, 60)
      if (deger) meta[ad] = deger
    }
    const referrer = onceki.current ? window.location.origin + onceki.current : document.referrer || null
    onceki.current = yol

    const govde = JSON.stringify({ event: 'page_view', path: isaret || yol, referrer, meta })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', new Blob([govde], { type: 'application/json' }))
        return
      }
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: govde,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Ölçüm hiçbir koşulda kullanıcı akışını bozmaz.
    }
  }, [yol])

  return null
}
