import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { cartTotal, itemCount, itemPrices } = await request.json()
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .in('type', ['cart_discount', 'free_shipping', 'buy_x_get_y'])
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ discounts: [], freeShipping: false })
  }

  const discounts: { id: string; name: string; type: string; amount: number }[] = []
  let freeShipping = false

  for (const c of campaigns) {
    // Cart discount
    if (c.type === 'cart_discount' && cartTotal >= (c.min_cart_amount || 0)) {
      let amount = 0
      if (c.discount_type === 'percent') {
        amount = (cartTotal * c.discount_value) / 100
      } else {
        amount = c.discount_value
      }
      discounts.push({ id: c.id, name: c.name, type: 'cart_discount', amount: Math.min(amount, cartTotal) })
    }

    // Free shipping
    if (c.type === 'free_shipping' && cartTotal >= (c.min_cart_amount || 0)) {
      freeShipping = true
    }

    // Buy X Get Y
    if (c.type === 'buy_x_get_y' && c.metadata) {
      const buyQty = c.metadata.buy_quantity || 4
      const payQty = c.metadata.pay_quantity || 3
      const freeCount = buyQty - payQty

      if (itemCount >= buyQty && freeCount > 0 && itemPrices?.length > 0) {
        // Sort prices ascending, cheapest items are free
        const sorted = [...itemPrices].sort((a: number, b: number) => a - b)
        const freeAmount = sorted.slice(0, freeCount).reduce((sum: number, p: number) => sum + p, 0)
        if (freeAmount > 0) {
          discounts.push({ id: c.id, name: c.name, type: 'buy_x_get_y', amount: freeAmount })
        }
      }
    }
  }

  return NextResponse.json({ discounts, freeShipping })
}
