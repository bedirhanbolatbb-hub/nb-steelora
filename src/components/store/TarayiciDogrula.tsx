'use client'

import { useEffect } from 'react'

/**
 * Gerçek tarayıcı işareti (Faz 32).
 *
 * ── Neden ──
 * Sayfa görüntüleme SUNUCUDA yazılıyor: reklam engelleyiciler etkilemiyor ama
 * JavaScript çalıştırmayan tarama robotları da ziyaretçi gibi kaydediliyor.
 * Davranışa bakan süzgeç (makine.ts) yalnız çok gezen robotları yakalar; tek
 * sayfa açıp giden robotu yakalayamaz.
 *
 * ── Kanıt ──
 * 13 Eylül ölçümü: tek hareketlik 1.120 oturumun saat dağılımı DÜMDÜZ —
 * gece 02:00–07:00 arası payı %17,7, yani 24 saate eşit yayılmış. Gerçek
 * müşteri trafiğinde (dört ve üzeri hareket yapan oturumlar) aynı pay %1,3.
 * Türkiye'de gece üçte alışveriş sitesi gezen insan sayısı sıfıra yakındır;
 * o tek hareketlik oturumların büyük kısmı insan değil.
 *
 * ── Nasıl ──
 * Gerçek tarayıcı JavaScript çalıştırır. Oturum başına BİR kez, "bu bir
 * tarayıcı" işareti gönderiyoruz. Kayıt ayrı bir satır olarak düşer ve sayfa
 * görüntüleme sayısına KATILMAZ (rapor `meta.js` taşıyan satırları ayırır);
 * yalnız "bu oturum gerçek bir tarayıcıydı" bilgisini taşır.
 *
 * Kişisel veri toplanmaz, çerez yazılmaz: yalnız sekme ömrü boyunca yaşayan
 * bir "gönderildi" işareti tutulur.
 */

const ISARET = 'nb_tarayici_dogrulandi'

export default function TarayiciDogrula() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(ISARET)) return
      sessionStorage.setItem(ISARET, '1')
    } catch {
      // Gizli sekmede depolama kapalı olabilir; işaret yine de gönderilir,
      // en fazla sayfa başına bir fazla satır düşer.
    }
    const govde = JSON.stringify({
      event: 'page_view',
      path: window.location.pathname,
      meta: { js: 1 },
    })
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
  }, [])

  return null
}
