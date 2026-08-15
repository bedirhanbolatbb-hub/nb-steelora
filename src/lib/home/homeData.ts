import { createServiceClient } from '@/lib/supabase/service'
import { ShownProducts, MAX_SECTION_ITEMS, TARGET_SECTION_ITEMS } from './sections'
import { LISTING_COLUMNS } from '@/lib/catalog/listing'
import { CATEGORIES } from '@/lib/catalog/categories'
import { firstSentence, type CollectionCard } from '@/lib/collections'

/**
 * Anasayfanın TEK veri katmanı (Faz 9A — logo gecikmesi düzeltmesi).
 *
 * Eski yol istek başına ~15 ardışık Supabase sorgusuydu (CategoryRail'de
 * kategori başına döngü dahil) + soğukta hero blur'u için görsel indirme;
 * canlıda 4-8 sn TTFB ölçüldü. Yeni yol:
 *   - TÜM sorgular tek Promise.all'da (soğukta ~tek gidiş-dönüş süresi),
 *   - sonuç süreç içi TTL önbelleğinde (5 dk — panel "birkaç dakikada
 *     güncellenir" sözleşmesiyle aynı),
 *   - blur istek yolunda ÜRETİLMEZ: slayt kaydında hesaplanıp veride durur.
 * Anasayfa çerez okuyan layout yüzünden dinamik kalır; veri katmanı çereze
 * bakmadığı için bu önbellek isteğe değil sürece bağlıdır.
 */

export type HeroSlide = {
  id: string
  image_url: string
  image_blur: string | null
  eyebrow: string
  title: string
  subtitle: string
  cta_label: string
  target_type: 'collection' | 'category' | 'product' | 'url'
  target_value: string
  is_active: boolean
}

export type HomeData = {
  content: Record<string, string>
  slides: (HeroSlide & { href: string | null })[]
  featured: any[]
  newArrivals: any[]
  collections: CollectionCard[]
  campaign: any | null
  categoryImages: Record<string, string | null>
  blogPosts: any[]
}

const TTL_MS = 5 * 60_000

type CacheBox = { at: number; veri: HomeData } | null
const g = globalThis as unknown as { __nbHomeCache?: CacheBox }

/** Kategori tanımını üründe yerelde uygular (tek sorguluk kapak çözümü için). */
function kategoriyeUyuyor(def: (typeof CATEGORIES)[number], p: any): boolean {
  if (def.gender) return p.gender === def.gender
  if (def.titlePatterns) {
    const ad = String(p.display_title || '').toLocaleLowerCase('tr')
    return def.titlePatterns.some((t) => ad.includes(t.toLocaleLowerCase('tr')))
  }
  const kat = String(p.trendyol_category || '')
  return (def.patterns || []).some((pt) => kat.includes(pt))
}

/** Slayt hedefini vitrin adresine çevirir; geçersiz hedef null (link üretilmez). */
function hedefHref(
  slide: HeroSlide,
  aktifKoleksiyonlar: Set<string>,
  aktifUrunSluglari: Set<string>
): string | null {
  const v = (slide.target_value || '').trim()
  if (!v) return null
  switch (slide.target_type) {
    case 'collection':
      return aktifKoleksiyonlar.has(v) ? `/koleksiyon/${v}` : null
    case 'category':
      return CATEGORIES.some((c) => c.slug === v) ? `/kategori/${v}` : null
    case 'product':
      return aktifUrunSluglari.has(v) ? `/urun/${v}` : null
    case 'url':
      return v.startsWith('/') || v.startsWith('https://') ? v : null
  }
}

async function yukle(): Promise<HomeData> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const [
    contentRes,
    settingsRes,
    poolRes,
    collectionsRes,
    campaignRes,
    blogRes,
  ] = await Promise.all([
    supabase.from('site_content').select('key, value'),
    supabase.from('homepage_settings').select('section, product_ids, payload'),
    // Ortak havuz: dolgu + kategori kapak fallback'i + kürasyon çözümü.
    supabase
      .from('products_display')
      .select(`${LISTING_COLUMNS}, trendyol_images`)
      .order('created_at', { ascending: false })
      .limit(600),
    supabase
      .from('collections')
      .select('id, slug, name, description, image_url, product_ids')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('blog_posts')
      .select('id, title, slug, cover_image, read_time, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  const content = Object.fromEntries((contentRes.data || []).map((r: any) => [r.key, r.value ?? '']))
  const pool: any[] = poolRes.data || []
  const poolById = new Map(pool.map((p) => [p.id, p]))

  const settings = new Map<string, { product_ids: string[]; payload: any }>()
  for (const row of settingsRes.data || []) {
    settings.set(row.section, {
      product_ids: (row.product_ids || []) as string[],
      payload: row.payload ?? null,
    })
  }

  // ── Küratörlü bölümler: sıra korunur, grup tekilleştirmesi aynı kurallarla ──
  const shown = new ShownProducts()
  const bolumSec = (section: string): any[] => {
    const curated = (settings.get(section)?.product_ids || []).slice(0, MAX_SECTION_ITEMS)
    const secilen: any[] = []
    const local = new ShownProducts()
    for (const id of curated) {
      const p = poolById.get(id)
      if (!p) continue
      if (shown.has(p) || local.has(p)) continue
      secilen.push(p)
      local.add([p])
    }
    if (secilen.length < TARGET_SECTION_ITEMS) {
      for (const p of pool) {
        if (secilen.length >= TARGET_SECTION_ITEMS) break
        if (shown.has(p) || local.has(p)) continue
        secilen.push(p)
        local.add([p])
      }
    }
    const sonuc = secilen.slice(0, MAX_SECTION_ITEMS)
    shown.add(sonuc)
    return sonuc
  }

  const featured = bolumSec('featured')
  const newArrivals = bolumSec('new_arrivals')

  // ── Koleksiyon kartları (kapak: image_url > ilk aktif üyenin görseli) ──
  const collections: CollectionCard[] = (collectionsRes.data || []).map((c: any) => {
    let cover: string | null = c.image_url || null
    if (!cover) {
      for (const id of c.product_ids || []) {
        const img = poolById.get(id)?.display_images?.[0]
        if (img) {
          cover = img
          break
        }
      }
    }
    return {
      slug: c.slug,
      name: c.name,
      description: c.description,
      cover,
      productCount: (c.product_ids || []).filter((id: string) => poolById.has(id)).length,
    }
  })

  // ── Kategori kapakları: payload.image_url > panel ürün seçimi > havuzdan ilk uygun ──
  const categoryImages: Record<string, string | null> = {}
  for (const def of CATEGORIES) {
    const row = settings.get(`category_${def.slug}`)
    const yuklenen = row?.payload?.image_url
    if (typeof yuklenen === 'string' && yuklenen) {
      categoryImages[def.slug] = yuklenen
      continue
    }
    const secilenId = row?.product_ids?.[0]
    const secilen = secilenId ? poolById.get(secilenId) : null
    if (secilen?.trendyol_images?.[0] || secilen?.display_images?.[0]) {
      categoryImages[def.slug] = secilen.display_images?.[0] ?? secilen.trendyol_images?.[0]
      continue
    }
    categoryImages[def.slug] = pool.find((p) => kategoriyeUyuyor(def, p))?.display_images?.[0] ?? null
  }

  // ── Hero slaytları (payload; blur kayıtta üretilmiş hâliyle gelir) ──
  const hamSlaytlar: HeroSlide[] = Array.isArray(settings.get('hero_slides')?.payload?.slides)
    ? settings.get('hero_slides')!.payload.slides
    : []
  const aktifKoleksiyonlar = new Set(collections.map((c) => c.slug))
  const aktifUrunSluglari = new Set(pool.map((p) => p.slug as string))
  const slides = hamSlaytlar
    .filter((s) => s.is_active && s.image_url)
    .slice(0, 4)
    .map((s) => ({ ...s, href: hedefHref(s, aktifKoleksiyonlar, aktifUrunSluglari) }))

  return {
    content,
    slides,
    featured,
    newArrivals,
    collections,
    campaign: campaignRes.data ?? null,
    categoryImages,
    blogPosts: blogRes.data || [],
  }
}

export async function getHomeData(): Promise<HomeData> {
  const cached = g.__nbHomeCache
  if (cached && Date.now() - cached.at < TTL_MS) return cached.veri
  const veri = await yukle()
  g.__nbHomeCache = { at: Date.now(), veri }
  return veri
}

export function firstSentenceOf(text: string | null): string {
  return firstSentence(text)
}
