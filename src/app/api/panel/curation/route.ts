import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/** Panelden yönetilen kürasyon bölümleri. Kategori görselleri 7C'de. */
const SECTIONS: Record<string, { max: number }> = {
  hero_top: { max: 1 },
  hero_bottom_left: { max: 1 },
  hero_bottom_right: { max: 1 },
  featured: { max: 12 },
  new_arrivals: { max: 12 },
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

  const supabase = createServiceClient()
  // Mevcut admin API deseniyle aynı: satır varsa güncelle, yoksa ekle.
  const { data: mevcut } = await supabase
    .from('homepage_settings')
    .select('id')
    .eq('section', section)
    .maybeSingle()

  const { error } = mevcut
    ? await supabase.from('homepage_settings').update({ product_ids: tekil }).eq('section', section)
    : await supabase.from('homepage_settings').insert({ section, product_ids: tekil })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
