'use client'

import { useEffect } from 'react'
import { useCart } from '@/hooks/useCart'

/**
 * Kartla ödeme onaylandıktan sonra sepeti boşaltır (12 Kasım 2026).
 *
 * Kart akışında sepet ödeme ekranında BOŞALTILMAZ: ödeme yarıda kalırsa
 * (banka onayı reddedildi, müşteri vazgeçti) müşteri aynı sepetle yeniden
 * dener. Bu bileşen yalnız sunucunun ödendiğini doğruladığı siparişin
 * teşekkür sayfasında çizilir (bkz. siparis-tamamlandi).
 */
export default function SepetiBosalt() {
  const clearCart = useCart((d) => d.clearCart)
  useEffect(() => {
    clearCart()
  }, [clearCart])
  return null
}
