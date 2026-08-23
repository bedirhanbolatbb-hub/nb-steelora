import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { cleanDescription, hasContent } from '@/lib/catalog/description'
import { materialCare, materialLabel } from '@/lib/catalog/material'
import { urunAciklamasiUret } from '@/lib/metin/urunAciklamasi'

/**
 * Toplu açıklama üretimi (Faz 21).
 *
 * İKİ ADIM: önce `onizle` (hiçbir şey yazmaz), BB listeyi görüp onaylayınca
 * `uygula`. Tek adımda yazmak, 200 ürünün açıklamasını görmeden değiştirmek
 * demek olurdu.
 *
 * METİN SUNUCUDA ÜRETİLİR — istemciden metin kabul edilmez. Önizlemede
 * gösterilen ile kaydedilen aynı fonksiyondan çıkar; araya elle içerik
 * sokulamaz.
 *
 * DOLU AÇIKLAMAYA DOKUNULMAZ. "Dolu" ölçütü vitrinle aynı: override_description
 * varsa ya da pazaryeri metni temizlikten sonra içerik bırakıyorsa dolu sayılır
 * (boş HTML iskeleti dolu SAYILMAZ — sitede zaten görünmüyor).
 */

const AZAMI = 200

type Satir = {
  id: string
  trendyol_title: string | null
  override_title: string | null
  trendyol_description: string | null
  override_description: string | null
  trendyol_category: string | null
  material_type: string | null
  variant_label: string | null
}

function acikMi(r: Satir): boolean {
  if ((r.override_description ?? '').trim()) return false
  return !hasContent(cleanDescription(r.trendyol_description))
}

function metinUret(r: Satir): string {
  return urunAciklamasiUret({
    // Renk/taş tespiti için en zengin başlık: pazaryeri adı panel adından
    // çok daha fazla bilgi taşıyor ve o da veridir.
    baslik: `${r.trendyol_title ?? ''} ${r.override_title ?? ''}`.trim(),
    kategori: r.trendyol_category,
    malzeme: materialLabel(r.material_type),
    bakim: r.material_type ? materialCare(r.material_type) : null,
    olcu: r.variant_label,
  })
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const ids: unknown = body?.ids
  const action = body?.action === 'uygula' ? 'uygula' : 'onizle'

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > AZAMI ||
    !ids.every((x) => typeof x === 'string')
  ) {
    return NextResponse.json({ error: 'Geçersiz ürün listesi' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, trendyol_title, override_title, trendyol_description, override_description, trendyol_category, material_type, variant_label'
    )
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const satirlar = (data ?? []) as Satir[]
  const bos = satirlar.filter(acikMi)
  const doluSayisi = satirlar.length - bos.length

  const uretilecek: { id: string; ad: string; metin: string }[] = []
  const veriYok: { id: string; ad: string }[] = []

  for (const r of bos) {
    const ad = r.override_title || r.trendyol_title || '(adsız)'
    const metin = metinUret(r)
    if (metin) uretilecek.push({ id: r.id, ad, metin })
    else veriYok.push({ id: r.id, ad })
  }

  if (action === 'onizle') {
    return NextResponse.json({
      ok: true,
      secili: satirlar.length,
      uretilecek,
      atlanan: doluSayisi,
      veriYok,
    })
  }

  // ── uygula ────────────────────────────────────────────────────────────
  // Metin burada YENİDEN üretiliyor; önizlemeden bu yana açıklaması dolmuş
  // bir ürün varsa `acikMi` süzgeci onu zaten dışarıda bırakır.
  let yazilan = 0
  const simdi = new Date().toISOString()
  for (const kayit of uretilecek) {
    const { error: yazmaHatasi } = await supabase
      .from('products')
      .update({ override_description: kayit.metin, updated_at: simdi })
      .eq('id', kayit.id)
      // Yarış koruması: bu arada elle açıklama girildiyse üzerine yazma.
      .or('override_description.is.null,override_description.eq.')
    if (!yazmaHatasi) yazilan++
  }

  return NextResponse.json({
    ok: true,
    secili: satirlar.length,
    yazilan,
    atlanan: doluSayisi,
    veriYok,
  })
}
