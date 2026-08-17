import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { otomatikKampanyalar } from '@/lib/campaigns/pricing'

/**
 * Kod gerektirmeyen kampanyalar (Faz 11: hesap tek motordan).
 * Tarih/limit penceresi ve eksik metadata kontrolü pricing.ts'te — süresi
 * dolmuş kampanya buradan asla indirim üretmez.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const sepetTutari = Number(body?.cartTotal) || 0
  const urunSayisi = Number(body?.itemCount) || 0
  const urunFiyatlari: number[] = Array.isArray(body?.itemPrices)
    ? body.itemPrices.map((p: unknown) => Number(p) || 0)
    : []

  const supabase = await createClient()
  const sonuc = await otomatikKampanyalar(supabase, sepetTutari, urunSayisi, urunFiyatlari)

  return NextResponse.json({
    discounts: sonuc.indirimler,
    freeShipping: sonuc.ucretsizKargo,
  })
}
