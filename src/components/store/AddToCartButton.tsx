'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { Check } from 'lucide-react'
import type { Product } from '@/types'

interface AddToCartButtonProps {
  product: Product
  disabled: boolean
}

export default function AddToCartButton({ product, disabled }: AddToCartButtonProps) {
  const addItem = useCart((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleClick = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // "Sepete Eklendi" onayı ink zeminde kalır: eklemeden sonra imleç butonun
  // üstünde durduğu için hover'daki altın zemin onay hâline yapışıyordu.
  // Altın zeminli tek büyük yüzey bilerek sepet çekmecesindeki "Ödemeye Geç".
  // Boştaki hover rengi masaüstündeki hâliyle korunur; değişen yalnız onay hâli.
  const tone = added
    ? 'bg-ink text-white opacity-100'
    : 'bg-ink text-white hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <button
      onClick={handleClick}
      disabled={disabled || added}
      className={`w-full py-[18px] rounded-[4px] font-body font-medium text-[12px] tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-2 ${tone}`}
    >
      {disabled ? (
        'Stok Tükendi'
      ) : added ? (
        <>
          <Check size={16} />
          Sepete Eklendi
        </>
      ) : (
        'Sepete Ekle'
      )}
    </button>
  )
}
