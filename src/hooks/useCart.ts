'use client'

import { useState } from 'react'
import type { CartItem, Product } from '@/types'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { product_id: product.id, product, quantity }]
    })
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    )
  }

  const total = items.reduce((sum, item) => sum + item.product.display_price * item.quantity, 0)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, addItem, removeItem, updateQuantity, total, count }
}
