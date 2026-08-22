import { createServiceClient } from '@/lib/supabase/service'
import { getGroupKey, normalizeTitle, pickCover } from './variants'

/**
 * Kalkmış ürünün halefi (Faz 18).
 *
 * Katalogda 88 pasif ürün var; hepsi bir zamanlar sitemap'te yayınlanmıştı ve
 * bugün 404 dönüyor. Bir kısmının sitede birebir karşılığı duruyor (aynı ürün,
 * yeni barkod). Bu URL'leri 404'te bırakmak hem müşteriyi hem de eski
 * bağlantıların taşıdığı arama değerini çöpe atmak demek.
 *
 * Eşleştirme sırası — hepsi AKTİF ürünler arasından:
 *   1) Aynı grup anahtarı  (normalize başlık | kategori | fiyat | gender)
 *   2) Aynı normalize başlık (fiyat değişmiş olabilir)
 *   3) Aynı kategoride başlık benzerliği ≥ 0,70 (token Jaccard) VE kalkan
 *      ürünün her kelimesi hedefte de geçiyor
 *
 * Hiçbiri tutmazsa null döner ve sayfa 404'te kalır: alakasız bir hedefe
 * yönlendirmek Google tarafında "soft 404" sayılır, hem sinyal aktarmaz hem
 * müşteriyi aradığı şeyden uzağa atar.
 *
 * Halef bulunduğunda grubun KAPAĞINA gidilir (`pickCover`) — böylece
 * yönlendirme, canonical'ı başka sayfaya bakan bir kardeşe düşmez.
 */

const BENZERLIK_ESIGI = 0.7

export function tokenlar(baslik: string | null | undefined): Set<string> {
  return new Set(
    normalizeTitle(baslik)
      .split(/[^0-9a-zçğıöşü]+/i)
      .filter((t) => t.length >= 3)
  )
}

/** İki başlığın ortak token oranı (Jaccard). */
export function baslikBenzerligi(a: string | null | undefined, b: string | null | undefined): number {
  const A = tokenlar(a)
  const B = tokenlar(b)
  if (A.size === 0 || B.size === 0) return 0
  let kesisim = 0
  for (const t of A) if (B.has(t)) kesisim++
  return kesisim / (A.size + B.size - kesisim)
}

type Aday = {
  slug: string
  display_title: string | null
  display_price: number | null
  trendyol_category: string | null
  gender: string | null
  trendyol_stock: number | null
  created_at: string | null
}

export async function halefSlugBul(slug: string): Promise<string | null> {
  try {
    const service = createServiceClient()

    // Slug gerçekten pasif bir ürüne mi ait? (uydurma adresler burada elenir)
    const { data: kalkan } = await service
      .from('products')
      .select('slug, trendyol_title, override_title, trendyol_price, override_price, trendyol_category, gender, is_active')
      .eq('slug', slug)
      .maybeSingle()

    if (!kalkan || kalkan.is_active) return null

    // products_display ile aynı türetme: display_title / display_price.
    const kalkanUrun = {
      id: 'kalkan',
      slug: kalkan.slug,
      display_title: kalkan.override_title ?? kalkan.trendyol_title,
      display_price: kalkan.override_price ?? kalkan.trendyol_price,
      trendyol_category: kalkan.trendyol_category,
      gender: kalkan.gender,
    }

    // Aday havuzu: aynı kategorideki aktif ürünler (en büyük kategori 138 satır).
    let sorgu = service
      .from('products_display')
      .select('slug, display_title, display_price, trendyol_category, gender, trendyol_stock, created_at')
      .limit(500)
    sorgu = kalkan.trendyol_category
      ? sorgu.eq('trendyol_category', kalkan.trendyol_category)
      : sorgu.is('trendyol_category', null)

    const { data } = await sorgu
    const adaylar = (data ?? []) as Aday[]
    if (adaylar.length === 0) return null

    // 1) Aynı grup anahtarı
    const anahtar = getGroupKey(kalkanUrun as any)
    const grupEsi = adaylar.filter((a) => getGroupKey(a as any) === anahtar)
    if (grupEsi.length > 0) return pickCover(grupEsi as any)?.slug ?? null

    // 2) Aynı normalize başlık
    const baslik = normalizeTitle(kalkanUrun.display_title)
    const baslikEsi = adaylar.filter((a) => normalizeTitle(a.display_title) === baslik)
    if (baslikEsi.length > 0) return pickCover(baslikEsi as any)?.slug ?? null

    // 3) Kategori içi en benzer başlık.
    //
    // Salt benzerlik yetmiyor: "Çelik YONCA Kolye Gold" ile "Çelik Kolye Gold"
    // arasındaki Jaccard 0,75 çıkıyor ve yonca motifli kolyeyi düz kolyeye
    // yönlendiriyordu. Kısa başlık uzun başlığın alt kümesi olduğu için
    // benzerlik ölçütü tek başına ayırt edici kelimeyi (motif, renk, uzunluk)
    // sessizce siliyor — bu tam olarak Google'ın "soft 404" saydığı durum.
    // Bu yüzden hedef, kalkan ürünün BÜTÜN kelimelerini taşımak zorunda:
    // halef en az kaynak kadar özgül olacak, daha genel olmayacak.
    const kaynakTokenlar = tokenlar(kalkanUrun.display_title)
    let enIyi: { slug: string; puan: number } | null = null
    for (const a of adaylar) {
      const puan = baslikBenzerligi(kalkanUrun.display_title, a.display_title)
      if (puan < BENZERLIK_ESIGI) continue
      const hedefTokenlar = tokenlar(a.display_title)
      let kapsiyor = true
      for (const t of kaynakTokenlar) {
        if (!hedefTokenlar.has(t)) {
          kapsiyor = false
          break
        }
      }
      if (kapsiyor && (!enIyi || puan > enIyi.puan)) enIyi = { slug: a.slug, puan }
    }
    return enIyi?.slug ?? null
  } catch {
    // Halef aranamazsa sayfa 404'te kalır — yanlış yönlendirmektense 404 iyidir.
    return null
  }
}
