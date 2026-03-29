import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code, cartTotal } = await request.json()
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('type', 'discount_code')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Geçersiz kod' }, { status: 400 })
  }

  const now = new Date()
  if (campaign.starts_at && new Date(campaign.starts_at) > now) {
    return NextResponse.json({ error: 'Kampanya henüz başlamadı' }, { status: 400 })
  }
  if (campaign.ends_at && new Date(campaign.ends_at) < now) {
    return NextResponse.json({ error: 'Kampanya süresi doldu' }, { status: 400 })
  }
  if (cartTotal < campaign.min_cart_amount) {
    return NextResponse.json(
      { error: `Minimum ${campaign.min_cart_amount}₺ sepet tutarı gerekli` },
      { status: 400 }
    )
  }
  if (campaign.max_uses && campaign.used_count >= campaign.max_uses) {
    return NextResponse.json({ error: 'Kampanya kullanım limiti doldu' }, { status: 400 })
  }

  let discountAmount = 0
  if (campaign.discount_type === 'percent') {
    discountAmount = (cartTotal * campaign.discount_value) / 100
  } else {
    discountAmount = campaign.discount_value
  }

  return NextResponse.json({
    discount: {
      code: campaign.code,
      amount: Math.min(discountAmount, cartTotal),
      description: campaign.name,
    },
  })
}
