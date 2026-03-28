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

  return (
    <button
      onClick={handleClick}
      disabled={disabled || added}
      className="w-full py-4 bg-dark text-champagne font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
