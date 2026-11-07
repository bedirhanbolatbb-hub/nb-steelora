import { createServiceClient } from '@/lib/supabase/service'
import type { HavaleAyari } from './havale'

/**
 * Havale/EFT ayarının deposu.
 *
 * Yeni tablo ya da sütun açılmadı: panelin zaten kullandığı genel ayar
 * tablosu `homepage_settings` (section + payload) — kürasyon, hero ve
 * Instagram duvarı da orada. Satır: section='odeme_havale'.
 * Panel karşılığı: Ayarlar → "Havale / EFT".
 */
export const HAVALE_BOLUMU = 'odeme_havale'

export async function havaleAyariOku(): Promise<HavaleAyari | null> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('homepage_settings')
      .select('payload')
      .eq('section', HAVALE_BOLUMU)
      .maybeSingle()
    const p = (data?.payload ?? null) as Record<string, unknown> | null
    if (!p || typeof p !== 'object') return null
    return {
      banka: String(p.banka ?? ''),
      alici: String(p.alici ?? ''),
      iban: String(p.iban ?? ''),
      indirimOrani: Number(p.indirimOrani ?? 0) || 0,
      indirimBaslangic: typeof p.indirimBaslangic === 'string' ? p.indirimBaslangic : null,
      indirimBitis: typeof p.indirimBitis === 'string' ? p.indirimBitis : null,
    }
  } catch {
    return null
  }
}

export async function havaleAyariYaz(ayar: HavaleAyari): Promise<{ ok: true } | { hata: string }> {
  const supabase = createServiceClient()
  const { data: mevcut } = await supabase
    .from('homepage_settings')
    .select('id')
    .eq('section', HAVALE_BOLUMU)
    .maybeSingle()
  const kayit = { product_ids: [], payload: ayar, updated_at: new Date().toISOString() }
  const { error } = mevcut
    ? await supabase.from('homepage_settings').update(kayit).eq('section', HAVALE_BOLUMU)
    : await supabase.from('homepage_settings').insert({ section: HAVALE_BOLUMU, ...kayit })
  return error ? { hata: error.message } : { ok: true }
}
