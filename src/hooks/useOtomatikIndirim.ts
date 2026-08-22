'use client'

import { useEffect, useState } from 'react'

export type OtomatikIndirim = {
  id: string
  name: string
  type: string
  amount: number
}

/**
 * Kod gerektirmeyen kampanyaların sepet karşılığı (Faz 15).
 *
 * Bu hesap yalnız ödeme adımında yapılıyordu; müşteri sepette indirimi hiç
 * görmüyor, tutarın neden düştüğünü ancak son ekranda anlıyordu. Artık sepet
 * çekmecesi ve /sepet de aynı ucu kullanıyor — hesap tek kaynaktan
 * (lib/campaigns/pricing) gelmeye devam ediyor, istemci hiçbir tutar
 * uydurmuyor.
 */
export function useOtomatikIndirim(
  sepetTutari: number,
  urunSayisi: number,
  urunFiyatlari: number[]
) {
  const [indirim, setIndirim] = useState<OtomatikIndirim | null>(null)
  const [ucretsizKargo, setUcretsizKargo] = useState(false)

  const fiyatAnahtari = urunFiyatlari.join(',')

  useEffect(() => {
    if (sepetTutari <= 0) {
      setIndirim(null)
      setUcretsizKargo(false)
      return
    }
    let iptal = false
    const zamanlayici = setTimeout(() => {
      fetch('/api/discount/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartTotal: sepetTutari,
          itemCount: urunSayisi,
          itemPrices: fiyatAnahtari ? fiyatAnahtari.split(',').map(Number) : [],
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (iptal) return
          // Sunucu en yüksek tek kampanyayı döndürür (indirimler toplanmaz).
          const ilk = Array.isArray(d?.discounts) && d.discounts.length > 0 ? d.discounts[0] : null
          setIndirim(ilk && Number(ilk.amount) > 0 ? ilk : null)
          setUcretsizKargo(Boolean(d?.freeShipping))
        })
        .catch(() => {
          if (!iptal) setIndirim(null)
        })
    }, 200)

    return () => {
      iptal = true
      clearTimeout(zamanlayici)
    }
  }, [sepetTutari, urunSayisi, fiyatAnahtari])

  return { indirim, ucretsizKargo }
}
