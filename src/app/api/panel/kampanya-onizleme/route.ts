import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { sepetHesabi, type HesapKampanyasi } from '@/lib/campaigns/hesap'
import { sepetiDogrula } from '@/lib/campaigns/sepetDogrula'

export const dynamic = 'force-dynamic'

/**
 * Panel canlı önizlemesi (Faz 17): kampanya KAYDEDİLMEDEN etkisi görülür.
 * Formdaki taslak kampanya, gerçek ürünlerden kurulan örnek sepete vitrindeki
 * motorla uygulanır — panelde görünen sayı ile müşterinin göreceği sayı aynı
 * fonksiyondan gelir.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const taslak = body?.kampanya as HesapKampanyasi | undefined
  if (!taslak?.tip) return NextResponse.json({ error: 'Kampanya taslağı gerekli' }, { status: 400 })

  const supabase = createServiceClient()

  // Örnek sepet: panel isterse kendi ürünlerini verir, vermezse kapsama uyan
  // gerçek ürünlerden iki kalem seçilir.
  let items = Array.isArray(body?.items) ? body.items : []
  if (items.length === 0) {
    let sorgu = supabase
      .from('products_display')
      .select('id, trendyol_category')
      .gt('trendyol_stock', 0)
      .limit(2)
    if (taslak.kapsam === 'kategori' && taslak.hedefler?.[0]) {
      sorgu = sorgu.ilike('trendyol_category', `%${taslak.hedefler[0]}%`)
    }
    const { data } = await sorgu
    items = (data ?? []).map((u: { id: string }, i: number) => ({ productId: u.id, quantity: i === 0 ? 2 : 1 }))
  }

  const dogrulanmis = await sepetiDogrula(supabase, items)
  const ozet = sepetHesabi({
    kalemler: dogrulanmis.kalemler,
    kampanyalar: [{ ...taslak, id: taslak.id || 'taslak' }],
    musteri: { uyeMi: true, oncekiTeslimatVar: false },
  })

  return NextResponse.json({
    ozet,
    ornekSepet: dogrulanmis.kalemler.map((k) => ({ ad: k.ad, fiyat: k.fiyat, adet: k.adet })),
  })
}
