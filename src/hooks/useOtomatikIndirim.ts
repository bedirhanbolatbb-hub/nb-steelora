'use client'

import { useEffect, useState } from 'react'

export type SepetOzeti = {
  araToplam: number
  uygulananlar: { kampanyaId: string; ad: string; tutar: number }[]
  indirimToplami: number
  tavanUygulandi: boolean
  tavanTutari: number
  ucretsizKargo: boolean
  yaklasanlar: { kampanyaId: string; ad: string; kalanTutar: number; oran: number | null }[]
  toplam: number
}

const BOS: SepetOzeti = {
  araToplam: 0,
  uygulananlar: [],
  indirimToplami: 0,
  tavanUygulandi: false,
  tavanTutari: 0,
  ucretsizKargo: false,
  yaklasanlar: [],
  toplam: 0,
}

/**
 * Sepet özetini SUNUCUDAN alır (Faz 17'de yeniden yazıldı).
 *
 * Önceden istemci sepet tutarını ve fiyat listesini kendisi gönderiyordu;
 * ödeme ekranı `quantity` bilgisini taşımadığı için X al Y öde gibi
 * kampanyalarda ekran ile tahsilat ayrışabiliyordu. Artık yalnız "hangi
 * üründen kaç adet" gönderilir, indirim/tavan/toplam sunucuda hesaplanır —
 * ödeme başlatma ucuyla birebir aynı fonksiyondan.
 */
export function useOtomatikIndirim(
  kalemler: { productId: string; adet: number }[],
  kod?: string | null,
  /** Kişiye özel kuponların sahiplik kontrolü için. */
  eposta?: string | null
) {
  const [ozet, setOzet] = useState<SepetOzeti>(BOS)
  const [kodHatasi, setKodHatasi] = useState<string | null>(null)
  /** Kupon kutusu altındaki hatırlatma — sunucu karar verir, istemci basar. */
  const [ilkSiparisMetni, setIlkSiparisMetni] = useState<string | null>(null)
  const anahtar =
    kalemler.map((k) => `${k.productId}x${k.adet}`).join('|') + `|${kod ?? ''}|${eposta ?? ''}`

  useEffect(() => {
    if (kalemler.length === 0) {
      setOzet(BOS)
      setKodHatasi(null)
      return
    }
    let iptal = false
    const zamanlayici = setTimeout(() => {
      fetch('/api/discount/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: kalemler.map((k) => ({ productId: k.productId, quantity: k.adet })),
          kod: kod ?? null,
          eposta: eposta ?? null,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (iptal) return
          setOzet(d?.ozet ?? BOS)
          setKodHatasi(d?.kodHatasi ?? null)
          setIlkSiparisMetni(d?.ilkSiparisMetni ?? null)
        })
        .catch(() => {
          if (!iptal) setOzet(BOS)
        })
    }, 180)

    return () => {
      iptal = true
      clearTimeout(zamanlayici)
    }
    // anahtar, kalemlerin ve kodun içeriğini temsil eder.
  }, [anahtar])

  const indirim = ozet.uygulananlar[0] ?? null
  return { ozet, indirim, kodHatasi, ilkSiparisMetni }
}
