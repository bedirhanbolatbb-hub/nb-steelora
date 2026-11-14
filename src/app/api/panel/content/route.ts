import { NextResponse, after } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { SATICI_PUANI_ANAHTARLARI, puanSayisi, puanTarihi } from '@/lib/metin/saticiPuani'
import { vitriniYenile } from '@/lib/cache/vitrin'

/**
 * Panelde alanı olup tabloda satırı henüz bulunmayan anahtarlar. Yalnız bunlar
 * ilk kayıtta oluşturulur; geri kalan her anahtar için kural aynı: anahtar
 * mevcutsa yazar, yeni anahtar üretmez (yazım hatası tabloyu kirletmesin).
 */
const ILK_KAYITTA_OLUSUR = new Set<string>(['tiktok_url', ...Object.values(SATICI_PUANI_ANAHTARLARI)])

/** Site metni güncelleme — anahtar mevcutsa yazar, yeni anahtar üretmez. */
export async function PATCH(request: Request) {
  after(vitriniYenile) // vitrin önbelleğini yanıt sonrası tazeler (lib/cache/vitrin)
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  const value = typeof body?.value === 'string' ? body.value : ''
  if (!key) return NextResponse.json({ error: 'Anahtar zorunlu' }, { status: 400 })

  // Sosyal bağlantılar URL olmalı (boş = basılmaz).
  if (/_url$/.test(key) && value.trim()) {
    try {
      const u = new URL(value.trim())
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
    } catch {
      return NextResponse.json({ error: 'Geçerli bir adres girin (https://…)' }, { status: 400 })
    }
  }

  // Trendyol satıcı puanı (8 Kas 2026): vitrinde iddia olarak basıldığı için
  // biçim burada da denetlenir — yanlış yazım rozetin sessizce kaybolmasına
  // ya da tuhaf bir sayıya dönüşmesine yol açmasın.
  if (key === SATICI_PUANI_ANAHTARLARI.puan && value.trim() && puanSayisi(value) === null) {
    return NextResponse.json({ error: 'Puanı 10 üzerinden sayı olarak yazın (örnek: 9,7)' }, { status: 400 })
  }
  if (key === SATICI_PUANI_ANAHTARLARI.tarih && value.trim() && puanTarihi(value) === null) {
    return NextResponse.json({ error: 'Tarihi gün-ay-yıl seçicisinden seçin' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('site_content')
    .update({ value })
    .eq('key', key)
    .select('key')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    if (!ILK_KAYITTA_OLUSUR.has(key)) {
      return NextResponse.json({ error: 'Anahtar bulunamadı' }, { status: 404 })
    }
    const { error: ekleHata } = await supabase.from('site_content').insert({ key, value })
    if (ekleHata) return NextResponse.json({ error: ekleHata.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
