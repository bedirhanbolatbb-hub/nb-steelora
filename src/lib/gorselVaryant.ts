import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Panel medyası için duyarlı varyantlar (Faz 12 · vitrin cilası).
 *
 * ÖLÇÜLEN KUSUR (5 Eyl, Lighthouse mobil): hero fotoğrafı her telefona
 * 1800×2400 · 135 KB olarak iniyordu; kutu 390 piksel. LCP 7,2 sn.
 * Trendyol görsellerinde CDN'in kendi küçültmesi var; panel medyası Supabase
 * Storage'da duruyor ve oradaki görsel dönüşümü ücretli plan istiyor.
 *
 * Çözüm ÜCRETSİZ: görsel KAYIT ANINDA (istek yolunda değil) sharp ile üç
 * genişliğe küçültülür, aynı bucket'a `varyant/` altına yazılır ve slaytta
 * `{ w, url }[]` olarak durur. Vitrin `sizes`'a göre uygun olanı seçer.
 * Orijinal dosya en büyük aday olarak listede kalır.
 *
 * Hata durumunda boş liste döner — vitrin orijinali kullanmaya devam eder,
 * kayıt asla bloklanmaz.
 */
import type { GorselVaryanti } from '@/lib/images'

const GENISLIKLER = [640, 960, 1280]
const BUCKET = 'media'

export async function varyantUret(url: string): Promise<GorselVaryanti[]> {
  if (!/^https?:\/\//.test(url)) return []
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const kaynak = Buffer.from(await res.arrayBuffer())

    const sharp = (await import('sharp')).default
    const meta = await sharp(kaynak).metadata()
    const kaynakEn = meta.width ?? 0
    if (!kaynakEn) return []

    const supabase = createServiceClient()
    const anahtar = createHash('sha1').update(url).digest('hex').slice(0, 16)
    const sonuc: GorselVaryanti[] = []

    for (const w of GENISLIKLER) {
      if (w >= kaynakEn) continue // büyütme yok
      const veri = await sharp(kaynak).resize(w, undefined, { withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
      const yol = `varyant/${anahtar}-${w}.webp`
      const { error } = await supabase.storage.from(BUCKET).upload(yol, veri, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      })
      if (error) continue
      sonuc.push({ w, url: supabase.storage.from(BUCKET).getPublicUrl(yol).data.publicUrl })
    }

    // Orijinal her zaman en büyük aday.
    sonuc.push({ w: kaynakEn, url })
    return sonuc.sort((a, b) => a.w - b.w)
  } catch {
    return []
  }
}
