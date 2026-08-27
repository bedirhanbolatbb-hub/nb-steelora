import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/** Panelden yönetilen kürasyon bölümleri. */
const SECTIONS: Record<string, { max: number }> = {
  hero_top: { max: 1 },
  hero_bottom_left: { max: 1 },
  hero_bottom_right: { max: 1 },
  // Faz 11B-ek: vitrin bölüm tavanı 8 — panel ile site aynı sayıyı konuşur
  // (lib/home/sections.ts MAX_SECTION_ITEMS ile eş).
  featured: { max: 8 },
  new_arrivals: { max: 8 },
  // Kategori kartı görselleri (eski HomepageEditor paritesi)
  category_kolye: { max: 1 },
  category_kupe: { max: 1 },
  category_bileklik: { max: 1 },
  category_yuzuk: { max: 1 },
  category_piercing: { max: 1 },
  category_erkek: { max: 1 },
  category_setler: { max: 1 },
  // Faz 11D: Instagram duvarı — ürün değil, payload.items taşır (görsel+bağlantı).
  instagram: { max: 0 },
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const section: unknown = body?.section
  const ids: unknown = body?.product_ids

  if (typeof section !== 'string' || !(section in SECTIONS)) {
    return NextResponse.json({ error: 'Geçersiz bölüm' }, { status: 400 })
  }

  // ── Instagram duvarı (Faz 11D): görsel+bağlantı listesi, en çok 9 ──
  if (section === 'instagram') {
    const ham = Array.isArray(body?.items) ? body.items : null
    if (!ham) return NextResponse.json({ error: 'Geçersiz kare listesi' }, { status: 400 })
    if (ham.length > 9) return NextResponse.json({ error: 'En fazla 9 kare eklenebilir' }, { status: 400 })
    const items: { image_url: string; link: string }[] = []
    for (const x of ham) {
      const img = String(x?.image_url ?? '').trim()
      const link = String(x?.link ?? '').trim()
      if (!/^https:\/\//.test(img) || !/^https:\/\//.test(link)) {
        return NextResponse.json({ error: 'Kare görseli ve bağlantısı https olmalı' }, { status: 400 })
      }
      items.push({ image_url: img, link })
    }
    const supabase = createServiceClient()
    const { data: mevcut } = await supabase
      .from('homepage_settings')
      .select('id')
      .eq('section', 'instagram')
      .maybeSingle()
    const kayit = { product_ids: [], payload: { items }, updated_at: new Date().toISOString() }
    const { error } = mevcut
      ? await supabase.from('homepage_settings').update(kayit).eq('section', 'instagram')
      : await supabase.from('homepage_settings').insert({ section: 'instagram', ...kayit })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'Geçersiz ürün listesi' }, { status: 400 })
  }
  const tekil = [...new Set(ids)]
  if (tekil.length > SECTIONS[section].max) {
    return NextResponse.json(
      { error: `Bu bölüm en fazla ${SECTIONS[section].max} ürün alır` },
      { status: 400 }
    )
  }

  // Kategori kapağı için panelden yüklenen görsel (Faz 9A) — payload'da durur;
  // null gönderilirse temizlenir, alan hiç yoksa mevcut payload korunur.
  let payloadGuncelle: { payload: any } | {} = {}
  if ('image_url' in (body ?? {})) {
    const img = body.image_url
    if (img !== null && (typeof img !== 'string' || !/^https:\/\//.test(img))) {
      return NextResponse.json({ error: 'Geçersiz görsel adresi' }, { status: 400 })
    }
    payloadGuncelle = { payload: img ? { image_url: img } : null }
  }

  const supabase = createServiceClient()
  // Mevcut admin API deseniyle aynı: satır varsa güncelle, yoksa ekle.
  const { data: mevcut } = await supabase
    .from('homepage_settings')
    .select('id')
    .eq('section', section)
    .maybeSingle()

  // updated_at elle damgalanır (tabloda tetikleyici yok — ölçüldü: BB'nin
  // güncellediği satır eski tarihte kalıyordu). Vitrin önbelleği bu damgayı
  // sürüm olarak okuyup kaydetmeden sonra kendini tazeliyor (homeData).
  const { error } = mevcut
    ? await supabase
        .from('homepage_settings')
        .update({ product_ids: tekil, updated_at: new Date().toISOString(), ...payloadGuncelle })
        .eq('section', section)
    : await supabase
        .from('homepage_settings')
        .insert({ section, product_ids: tekil, updated_at: new Date().toISOString(), ...payloadGuncelle })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
