/**
 * Trendyol'a bağlantıyla verilen fatura görüntülerinin deposu (14 Kas 2026).
 *
 * Trendyol "fatura bağlantısı" kabul ediyor (entegratörlerin yolu); bağlantı
 * müşteriye Trendyol'un e-postasıyla gider ve Trendyol'un kuralı gereği
 * 8 YIL açık kalmalıdır. Görüntü GİB'in kendi HTML'idir, değiştirilmez.
 *
 *  - Supabase Storage, ÖZEL kova `faturalar` (herkese açık değil; sayfa
 *    /fatura/<anahtar> rotası hizmet rolüyle okur).
 *  - Anahtar 128 bit rastgele (32 onaltılık hane): tahmin edilemez, sıralı
 *    değil, sipariş ya da belge numarası içermez.
 *  - goruntu/<anahtar>.html.gz  görüntü (sıkıştırılmış, ~55 KB → ~20 KB)
 *    kayit/<anahtar>.json       sipariş, paket, belge, ETTN, tutar, zaman —
 *                               kişisel veri yok; görüntü kaybolursa GİB'den
 *                               ETTN ile yeniden üretmek ve geri almak için.
 *  - Geri alma: görüntü silinince bağlantı o an 404 olur.
 */
import { gunzipSync, gzipSync } from 'zlib'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

const KOVA = 'faturalar'
export const ANAHTAR = /^[a-f0-9]{32}$/

export interface YuklemeKaydi {
  siparis: string
  siparisZamani: number
  paket: number
  belge: string
  ettn: string
  tutar: number
  zaman: string
}

const goruntuYolu = (a: string) => `goruntu/${a}.html.gz`
const kayitYolu = (a: string) => `kayit/${a}.json`

async function yaz(yol: string, govde: Buffer, tur: string): Promise<void> {
  const depo = createServiceClient().storage
  const dene = () => depo.from(KOVA).upload(yol, govde, { contentType: tur, upsert: false })
  let { error } = await dene()
  if (error && /bucket not found/i.test(error.message)) {
    const { error: acma } = await depo.createBucket(KOVA, { public: false })
    if (acma && !/already exists/i.test(acma.message)) throw new Error(`fatura deposu açılamadı: ${acma.message}`)
    ;({ error } = await dene())
  }
  if (error) throw new Error(`fatura deposuna yazılamadı: ${error.message}`)
}

/** Görüntüyü ve kaydını saklar, yeni anahtarı döndürür. */
export async function goruntuyuSakla(html: string, kayit: YuklemeKaydi): Promise<string> {
  const anahtar = randomBytes(16).toString('hex')
  await yaz(goruntuYolu(anahtar), gzipSync(Buffer.from(html, 'utf8')), 'application/gzip')
  try {
    await yaz(kayitYolu(anahtar), Buffer.from(JSON.stringify(kayit), 'utf8'), 'application/json')
  } catch (e) {
    await goruntuyuSil(anahtar)
    throw e
  }
  return anahtar
}

export async function goruntuyuOku(anahtar: string): Promise<string | null> {
  if (!ANAHTAR.test(anahtar)) return null
  const { data, error } = await createServiceClient().storage.from(KOVA).download(goruntuYolu(anahtar))
  if (error || !data) return null
  return gunzipSync(Buffer.from(await data.arrayBuffer())).toString('utf8')
}

export async function kaydiOku(anahtar: string): Promise<YuklemeKaydi | null> {
  if (!ANAHTAR.test(anahtar)) return null
  const { data, error } = await createServiceClient().storage.from(KOVA).download(kayitYolu(anahtar))
  if (error || !data) return null
  try {
    return JSON.parse(await data.text()) as YuklemeKaydi
  } catch {
    return null
  }
}

/** Bağlantıyı öldürür (kayıt iz olarak kalır). */
export async function goruntuyuSil(anahtar: string): Promise<boolean> {
  if (!ANAHTAR.test(anahtar)) return false
  const { error } = await createServiceClient().storage.from(KOVA).remove([goruntuYolu(anahtar)])
  return !error
}

/**
 * Fatura sayfasının başlıkları — herkese açık rota ve panel önizlemesi aynı.
 * GİB'in görüntüsündeki karekod betiği çalışsın diye satır içi betiğe izin
 * var, AMA sayfa `sandbox` içinde: kökeni opak, sitenin çerezlerine ve
 * deposuna erişemez. Dış kaynak yok, önbellek yok, arama motoru yok.
 */
export function goruntuBasliklari(): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy':
      "sandbox allow-scripts allow-modals; default-src 'none'; script-src 'unsafe-inline'; " +
      "style-src 'unsafe-inline'; img-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  }
}
