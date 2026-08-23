import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const SAYFA = 40

export type SeciciUrun = {
  id: string
  barkod: string | null
  ad: string
  fiyat: number
  stok: number
  kategori: string | null
  gorsel: string | null
}

const satirCevir = (p: any): SeciciUrun => ({
  id: p.id,
  barkod: p.trendyol_barcode ?? null,
  ad: p.display_title ?? p.trendyol_title ?? '—',
  fiyat: Number(p.display_price ?? p.trendyol_price ?? 0),
  stok: Number(p.trendyol_stock ?? 0),
  kategori: p.trendyol_category ?? null,
  gorsel:
    (p.display_images as string[] | null)?.[0] ??
    (p.trendyol_images as string[] | null)?.[0] ??
    null,
})

const KOLONLAR =
  'id, trendyol_barcode, display_title, trendyol_title, display_price, trendyol_price, trendyol_stock, trendyol_category, display_images, trendyol_images, collection_id'

/**
 * Kampanya ürün seçicisinin veri ucu (Faz 24).
 *
 * İki kip:
 *  - `mod: 'ara'`   → filtreli arama, sayfalı
 *  - `mod: 'coz'`   → kaydedilmiş hedefleri (kimlik VEYA barkod) satıra çevirir
 *
 * "Çöz" kipi şart: kampanyalar barkodla da kaydedilebiliyordu, seçilenler
 * sekmesi ve kampanya listesindeki "12 ürün" bağlantısı ikisini de
 * gösterebilmeli. Bulunamayan hedefler ayrıca döner — sessizce kaybolmasınlar.
 *
 * Arama YALNIZ AKTİF üründe: pasif ürün zaten satılmıyor, kampanyaya
 * eklenmesi yanıltıcı olurdu.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const supabase = createServiceClient()

  if (body?.mod === 'coz') {
    const hedefler: string[] = (Array.isArray(body?.hedefler) ? body.hedefler : [])
      .map((h: unknown) => String(h).trim())
      .filter(Boolean)
    if (hedefler.length === 0) return NextResponse.json({ ok: true, urunler: [], bulunamayan: [] })

    // Kimlik (uuid) ve barkod ayrı sorgulanır; PostgREST `in` karışık tipte
    // çalışmaz ve uuid sütununa barkod göndermek 22P02 hatası verir.
    const uuidler = hedefler.filter((h) => /^[0-9a-f-]{36}$/i.test(h))
    const barkodlar = hedefler.filter((h) => !/^[0-9a-f-]{36}$/i.test(h))

    const [aRes, bRes] = await Promise.all([
      uuidler.length
        ? supabase.from('products_display').select(KOLONLAR).in('id', uuidler)
        : Promise.resolve({ data: [] as any[] }),
      barkodlar.length
        ? supabase.from('products_display').select(KOLONLAR).in('trendyol_barcode', barkodlar)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const urunler = [...(aRes.data ?? []), ...(bRes.data ?? [])].map(satirCevir)
    const bulunanlar = new Set<string>()
    for (const u of urunler) {
      bulunanlar.add(u.id.toLowerCase())
      if (u.barkod) bulunanlar.add(u.barkod.toLowerCase())
    }
    const bulunamayan = hedefler.filter((h) => !bulunanlar.has(h.toLowerCase()))

    return NextResponse.json({ ok: true, urunler, bulunamayan })
  }

  const q = String(body?.q ?? '').trim()
  const kategori = String(body?.kategori ?? '').trim()
  const koleksiyon = String(body?.koleksiyon ?? '').trim()
  const sayfa = Math.max(1, Number(body?.sayfa) || 1)
  // Filtrelenmiş sonucun TAMAMINI seçebilmek için (Tümünü seç), sayfa
  // sınırından bağımsız kimlik listesi de istenebiliyor.
  const yalnizKimlik = Boolean(body?.yalnizKimlik)

  let sorgu = supabase
    .from('products_display')
    .select(yalnizKimlik ? 'id' : KOLONLAR, { count: 'exact' })
    .eq('is_active', true)

  if (q.length >= 2) {
    const like = `%${q.replace(/[%_,()]/g, '')}%`
    sorgu = sorgu.or(
      `display_title.ilike.${like},trendyol_title.ilike.${like},trendyol_barcode.ilike.${like}`
    )
  }
  if (kategori) sorgu = sorgu.ilike('trendyol_category', `%${kategori}%`)
  if (koleksiyon) sorgu = sorgu.eq('collection_id', koleksiyon)

  sorgu = sorgu.order('display_title', { ascending: true, nullsFirst: false })

  if (yalnizKimlik) {
    // 2000 satır tavanı: katalog 432 aktif ürün, fazlasıyla yeter ve kazara
    // devasa bir seçim üretilmesini engeller.
    const { data, error } = await sorgu.limit(2000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, kimlikler: (data ?? []).map((r: any) => r.id) })
  }

  const bas = (sayfa - 1) * SAYFA
  const { data, count, error } = await sorgu.range(bas, bas + SAYFA - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    urunler: (data ?? []).map(satirCevir),
    toplam: count ?? 0,
    sayfa,
    sayfaBoyu: SAYFA,
  })
}
