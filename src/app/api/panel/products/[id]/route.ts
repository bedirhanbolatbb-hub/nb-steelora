import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { adAnahtari } from '@/lib/catalog/adAnahtari'
import { getGroupKey } from '@/lib/catalog/variants'

/**
 * Panelden ürün düzenleme.
 *
 * Beyaz liste SUNUCUDA uygulanır: yalnız aşağıdaki alanlar yazılabilir.
 * trendyol_* alanları hiçbir koşulda yazılamaz — tek kaynak sync'tir.
 * Gövdede beyaz liste dışı bir anahtar gelirse istek tümden reddedilir ki
 * istemcideki bir hata sessizce alan kaybına yol açmasın.
 */
const WRITABLE = new Set([
  'override_title',
  'override_price',
  'override_description',
  'override_images',
  'badge',
  'is_featured',
  'material_type',
  'gender',
  'note',
])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Geçersiz gövde' }, { status: 400 })
  }

  const keys = Object.keys(body)
  if (keys.length === 0) {
    return NextResponse.json({ error: 'Değişen alan yok' }, { status: 400 })
  }
  const disallowed = keys.filter((k) => !WRITABLE.has(k))
  if (disallowed.length > 0) {
    return NextResponse.json(
      { error: `Bu alanlar panelden yazılamaz: ${disallowed.join(', ')}` },
      { status: 400 }
    )
  }

  // Normalizasyon: boş string'ler null olur (vitrindeki coalesce boş string'i
  // "dolu" sayardı ve görünen adı boşaltırdı).
  const patch: Record<string, unknown> = {}
  for (const key of keys) {
    let value = body[key]
    if (typeof value === 'string') value = value.trim() || null
    if (key === 'override_images') {
      if (value !== null && !Array.isArray(value)) {
        return NextResponse.json({ error: 'override_images dizi olmalı' }, { status: 400 })
      }
      if (Array.isArray(value)) {
        const urls = value.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
        if (urls.length !== value.length) {
          return NextResponse.json({ error: 'Geçersiz görsel adresi' }, { status: 400 })
        }
        value = urls.length > 0 ? urls : null
      }
    }
    if (key === 'is_featured') value = Boolean(value)
    if (key === 'override_price') {
      if (value !== null) {
        const n = Number(value)
        if (!isFinite(n) || n <= 0) {
          return NextResponse.json({ error: 'Geçersiz kampanya fiyatı' }, { status: 400 })
        }
        value = n
      }
    }
    patch[key] = value
  }
  patch.updated_at = new Date().toISOString()

  const supabase = createServiceClient()

  /**
   * Ad benzersizlik bekçisi (Faz 11A-FIX · F3).
   *
   * İki kart aynı ada düştüğünde müşteri listede ayırt edemiyor — NBB094 ile
   * NBB121 ikisi de "Yıldız Charm Bileklik" olmuştu. Artık çakışan ad
   * KAYDEDİLEMEZ.
   *
   * Aynı varyant grubunun üyeleri BİLEREK aynı adı taşır (ad grubu birarada
   * tutan anahtarın parçası); bu yüzden kontrol yalnız BAŞKA gruplara bakar.
   */
  if (typeof patch.override_title === 'string' && patch.override_title) {
    const yeniAd = patch.override_title as string
    const anahtar = adAnahtari(yeniAd)

    const { data: bu } = await supabase
      .from('products_display')
      .select('id, display_title, display_price, trendyol_category, gender')
      .eq('id', id)
      .maybeSingle()

    // Kaydettikten SONRAKİ grup anahtarı: ad değişince ürün grup da değiştirir.
    // Eski anahtara bakmak, bir ürünü var olan bir gruba KATMAYI da engellerdi
    // (renk varyantı eklemek gibi meşru bir iş).
    const yeniGrup = bu ? getGroupKey({ ...(bu as any), display_title: yeniAd }) : null

    const { data: adaylar } = await supabase
      .from('products_display')
      .select('id, slug, display_title, display_price, trendyol_category, gender, trendyol_barcode, is_active')
      .eq('is_active', true)
      .ilike('display_title', yeniAd)
      .limit(50)

    const carpisan = (adaylar || []).find(
      (a: any) =>
        a.id !== id &&
        adAnahtari(a.display_title) === anahtar &&
        (!yeniGrup || getGroupKey(a) !== yeniGrup)
    )

    if (carpisan) {
      return NextResponse.json(
        {
          error: `Bu ad zaten kullanılıyor: ${(carpisan as any).trendyol_barcode ?? (carpisan as any).slug}. İki kart aynı adla listelenemez.`,
        },
        { status: 409 }
      )
    }
  }
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
