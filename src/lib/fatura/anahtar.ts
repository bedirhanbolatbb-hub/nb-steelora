/**
 * Otomatik yüklemenin açma/kapama anahtarı (14 Kas 2026).
 *
 * Veritabanında durur (alert_state, key `fatura_yukle`), ortam değişkeninde
 * değil: kapatmak yeni yayın beklemeden o an etkili olsun diye. Satır yoksa
 * ya da "acik" değilse sabah turu YÜKLEMEZ (kapalı başarısızlık). Panelden
 * elle tetiklenen tur (POST ?yukle=evet) anahtara bakmaz; bilerek yapılır.
 */
import { createServiceClient } from '@/lib/supabase/service'

const ANAHTAR = 'fatura_yukle'

export async function yuklemeAcikMi(): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from('alert_state')
    .select('fingerprint')
    .eq('key', ANAHTAR)
    .maybeSingle()
  return !error && data?.fingerprint === 'acik'
}

export async function yuklemeyiAyarla(acik: boolean): Promise<void> {
  const simdi = new Date().toISOString()
  const { error } = await createServiceClient()
    .from('alert_state')
    .upsert(
      { key: ANAHTAR, fingerprint: acik ? 'acik' : 'kapali', last_sent_at: simdi, count: 0, first_seen_at: simdi, updated_at: simdi },
      { onConflict: 'key' }
    )
  if (error) throw new Error(`yükleme anahtarı yazılamadı: ${error.message}`)
}
