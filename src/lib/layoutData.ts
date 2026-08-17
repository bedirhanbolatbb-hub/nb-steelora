import { createServiceClient } from '@/lib/supabase/service'
import { formatPrice } from '@/lib/utils'
import type { CouponReminder } from '@/lib/campaigns'
import type { CollectionCard } from '@/lib/collections'

/**
 * Vitrin layout'unun (navbar bandı + kupon + footer) ortak verisi (Faz 9A).
 * Kişiye özel hiçbir şey içermez; süreç içi TTL önbelleğiyle her sayfanın
 * TTFB'sinden ~4 sorgu düşer. Panel değişiklikleri en geç 2 dk'da yansır.
 */
export type LayoutData = {
  bannerText: string | null
  bannerColor: string | null
  coupon: CouponReminder | null
  collections: CollectionCard[]
  content: Record<string, string>
}

/** Footer künyesinde basılan alanlar (site_content'ten; boşlar basılmaz). */
export function kunyeSatirlari(content: Record<string, string>): string[] {
  return [
    content.veri_sorumlusu_unvan,
    content.veri_sorumlusu_adres,
    [content.veri_sorumlusu_vergi_dairesi, content.veri_sorumlusu_vergi].filter(Boolean).join(' — '),
    content.veri_sorumlusu_mersis ? `MERSİS: ${content.veri_sorumlusu_mersis}` : '',
  ]
    .map((s) => (s || '').trim())
    .filter(Boolean)
}

const TTL_MS = 2 * 60_000
const g = globalThis as unknown as { __nbLayoutCache?: { at: number; veri: LayoutData } }

async function yukle(): Promise<LayoutData> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const [bannerRes, couponRes, collectionsRes, contentRes] = await Promise.all([
    supabase
      .from('campaigns')
      .select('banner_text, banner_color')
      .eq('type', 'banner')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('campaigns')
      .select('name, code, discount_type, discount_value, min_cart_amount, max_uses, used_count')
      .eq('is_active', true)
      .eq('type', 'discount_code')
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('collections')
      .select('slug, name, description, image_url, product_ids')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('site_content').select('key, value'),
  ])

  // Kupon hatırlatması — campaigns.server'daki kuralların aynısı.
  let coupon: CouponReminder | null = null
  const k = couponRes.data
  if (k?.code && k.discount_value && !(k.max_uses && (k.used_count ?? 0) >= k.max_uses)) {
    const amount =
      k.discount_type === 'percent' ? `%${Number(k.discount_value)}` : formatPrice(k.discount_value)
    coupon = {
      code: k.code,
      label: `${amount} indirim: ${k.code}`,
      minCartAmount: Number(k.min_cart_amount ?? 0),
    }
  }

  const collections: CollectionCard[] = (collectionsRes.data || []).map((c: any) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    cover: c.image_url ?? null,
    productCount: (c.product_ids || []).length,
  }))

  return {
    bannerText: bannerRes.data?.banner_text ?? null,
    bannerColor: bannerRes.data?.banner_color ?? null,
    coupon,
    collections,
    content: Object.fromEntries((contentRes.data || []).map((r: any) => [r.key, r.value ?? ''])),
  }
}

export async function getLayoutData(): Promise<LayoutData> {
  const cached = g.__nbLayoutCache
  if (cached && Date.now() - cached.at < TTL_MS) return cached.veri
  const veri = await yukle()
  g.__nbLayoutCache = { at: Date.now(), veri }
  return veri
}
