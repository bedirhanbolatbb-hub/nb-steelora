import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { kuponDogrula } from '@/lib/campaigns/pricing'

/**
 * Müşterinin girdiği kupon kodunu doğrular (Faz 11: hesap tek motordan).
 * Buradan dönen tutar yalnız GÖSTERİM içindir; ödeme anında kod sunucuda
 * yeniden doğrulanır (bkz. /api/payment/initialize).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const kod = String(body?.code ?? '')
  const sepetTutari = Number(body?.cartTotal)

  if (!Number.isFinite(sepetTutari) || sepetTutari < 0) {
    return NextResponse.json({ error: 'Sepet tutarı okunamadı' }, { status: 400 })
  }

  const supabase = await createClient()
  const sonuc = await kuponDogrula(supabase, kod, sepetTutari)

  if (!sonuc.gecerli) {
    return NextResponse.json({ error: sonuc.hata }, { status: 400 })
  }

  return NextResponse.json({
    discount: {
      code: sonuc.kampanya.code,
      amount: sonuc.indirim,
      description: sonuc.kampanya.name,
    },
  })
}
