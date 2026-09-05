import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { getBlurDataURL } from '@/lib/blur'
import { varyantUret } from '@/lib/gorselVaryant'
import { CATEGORIES } from '@/lib/catalog/categories'

const HEDEF_TIPLERI = new Set(['collection', 'category', 'product', 'url'])
const MAX_SLAYT = 4

/**
 * Hero slaytlarını kaydeder (homepage_settings, section='hero_slides',
 * payload.slides). Blur placeholder BURADA — kayıt anında — üretilir ki
 * vitrin isteği yolunda görsel indirme kalmasın (Faz 9A logo gecikmesi).
 * Değişmeyen görselin mevcut blur'u aynen taşınır, yeniden üretilmez.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const gelen = body?.slides
  if (!Array.isArray(gelen) || gelen.length > MAX_SLAYT) {
    return NextResponse.json({ error: `En fazla ${MAX_SLAYT} slayt` }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Mevcut blur'lar (değişmeyen görsel için yeniden üretim yok)
  const { data: mevcutRow } = await supabase
    .from('homepage_settings')
    .select('id, payload')
    .eq('section', 'hero_slides')
    .maybeSingle()
  const eskiBlur = new Map<string, string>(
    (mevcutRow?.payload?.slides || [])
      .filter((s: any) => s.image_url && s.image_blur)
      .map((s: any) => [s.image_url, s.image_blur])
  )
  // Faz 12: duyarlı varyantlar da kayıt anında; değişmeyen görselinki taşınır.
  const eskiVaryant = new Map<string, any[]>(
    (mevcutRow?.payload?.slides || [])
      .filter((s: any) => s.image_url && Array.isArray(s.image_varyant) && s.image_varyant.length)
      .map((s: any) => [s.image_url, s.image_varyant])
  )

  const uyarilar: string[] = []
  const slides: any[] = []

  for (const [i, s] of gelen.entries()) {
    const image_url = typeof s?.image_url === 'string' ? s.image_url.trim() : ''
    const title = typeof s?.title === 'string' ? s.title.trim() : ''
    const target_type = String(s?.target_type || 'url')
    const target_value = typeof s?.target_value === 'string' ? s.target_value.trim() : ''

    if (!image_url || !/^https?:\/\//.test(image_url)) {
      return NextResponse.json({ error: `Slayt ${i + 1}: görsel adresi geçersiz` }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: `Slayt ${i + 1}: başlık zorunlu` }, { status: 400 })
    }
    if (!HEDEF_TIPLERI.has(target_type)) {
      return NextResponse.json({ error: `Slayt ${i + 1}: hedef tipi geçersiz` }, { status: 400 })
    }

    // Hedef doğrulaması — uyarı üretir (kayıt engellenmez; vitrin link basmaz).
    if (target_type === 'product' && target_value) {
      const { data: p } = await supabase
        .from('products')
        .select('is_active')
        .eq('slug', target_value)
        .maybeSingle()
      if (!p) uyarilar.push(`Slayt ${i + 1}: ürün bulunamadı — vitrinde link üretilmez`)
      else if (!p.is_active) uyarilar.push(`Slayt ${i + 1}: hedef ürün pasif — vitrinde link üretilmez`)
    }
    if (target_type === 'collection' && target_value) {
      const { data: k } = await supabase
        .from('collections')
        .select('is_active')
        .eq('slug', target_value)
        .maybeSingle()
      if (!k?.is_active) uyarilar.push(`Slayt ${i + 1}: koleksiyon yok ya da pasif — link üretilmez`)
    }
    if (target_type === 'category' && !CATEGORIES.some((c) => c.slug === target_value)) {
      uyarilar.push(`Slayt ${i + 1}: kategori tanınmadı — link üretilmez`)
    }

    const image_blur = eskiBlur.get(image_url) ?? (await getBlurDataURL(image_url))
    const image_varyant = eskiVaryant.get(image_url) ?? (await varyantUret(image_url))
    // Kadraj odağı (Faz 12): fotoğrafta takının durduğu yer. Ölçülen kusur:
    // "üst" sabitken alt-orta duran ürün dizüstü ekranında kadraj dışıydı.
    const odak = ['ust', 'orta', 'alt'].includes(s?.odak) ? s.odak : 'orta'

    slides.push({
      id: typeof s?.id === 'string' && s.id ? s.id : `sl_${Date.now().toString(36)}_${i}`,
      image_url,
      image_blur,
      image_varyant,
      odak,
      eyebrow: typeof s?.eyebrow === 'string' ? s.eyebrow.trim() : '',
      title,
      subtitle: typeof s?.subtitle === 'string' ? s.subtitle.trim() : '',
      cta_label: typeof s?.cta_label === 'string' ? s.cta_label.trim() : '',
      target_type,
      target_value,
      is_active: s?.is_active !== false,
    })
  }

  const { error } = mevcutRow
    ? await supabase
        .from('homepage_settings')
        .update({ payload: { slides }, updated_at: new Date().toISOString() })
        .eq('id', mevcutRow.id)
    : await supabase
        .from('homepage_settings')
        .insert({ section: 'hero_slides', product_ids: [], payload: { slides }, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, uyarilar })
}
