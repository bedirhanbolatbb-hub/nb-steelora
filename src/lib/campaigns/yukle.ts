import type { SupabaseClient } from '@supabase/supabase-js'
import type { HesapKampanyasi, KampanyaTipi, Kapsam } from './hesap'

/**
 * Kampanyaların veritabanından okunup hesap motorunun anladığı biçime
 * çevrilmesi (Faz 17).
 *
 * Motor (hesap.ts) saf tutulduğu için DB bilgisi buraya toplandı: tek yerden
 * okunur, üç çağıran da (ödeme başlatma, sepet/ödeme ekranı, panel önizleme)
 * aynı listeyi görür.
 *
 * Yeni tablolar (campaign_targets, campaign_tiers) henüz kurulmamışsa sorgu
 * sessizce boş döner ve kampanya "tüm sepet" kapsamıyla çalışır — yani
 * migration inmeden önce de vitrin bozulmaz.
 */

type HamKampanya = {
  id: string
  name: string
  type: string
  code: string | null
  discount_type: string | null
  discount_value: number | null
  min_cart_amount: number | null
  max_uses: number | null
  used_count: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean | null
  metadata: Record<string, unknown> | null
  // v2 alanları — migration inmediyse undefined gelir.
  scope?: string | null
  requires_code?: boolean | null
  min_item_count?: number | null
  per_user_limit?: number | null
  priority?: number | null
  combinable?: boolean | null
  members_only?: boolean | null
  first_order_only?: boolean | null
  max_discount_amount?: number | null
  buy_quantity?: number | null
  pay_quantity?: number | null
}

/** DB tipini motor tipine çevirir. */
function tipCevir(ham: HamKampanya): KampanyaTipi | null {
  const kapsamli = (ham.scope ?? 'cart') !== 'cart'
  const yuzdeMi = (ham.discount_type ?? 'percent') === 'percent'

  switch (ham.type) {
    case 'cart_discount':
    case 'discount_code':
      if (kapsamli) return yuzdeMi ? 'kapsam_yuzde' : 'kapsam_sabit'
      return yuzdeMi ? 'sepet_yuzde' : 'sepet_sabit'
    case 'item_discount':
      return yuzdeMi ? 'kapsam_yuzde' : 'kapsam_sabit'
    case 'tiered_discount':
      return 'kademeli'
    case 'buy_x_get_y':
    case 'buy_x_get_y_scoped':
      return 'x_al_y_ode'
    case 'free_shipping':
      return 'ucretsiz_kargo'
    default:
      // 'banner' ve bilinmeyen tipler indirim üretmez.
      return null
  }
}

function kapsamCevir(ham: HamKampanya): Kapsam {
  // DB'deki İngilizce kapsam değerleri motorun Türkçe adlarına çevrilir.
  switch (ham.scope ?? 'cart') {
    case 'category':
      return 'kategori'
    case 'collection':
      return 'koleksiyon'
    case 'product':
      return 'urun'
    default:
      return 'sepet'
  }
}

/** Kampanya şu anda yürürlükte mi? (aktiflik + tarih + toplam kullanım limiti) */
export function yururlukteHam(ham: HamKampanya, simdi: Date = new Date()): boolean {
  if (!ham.is_active) return false
  if (ham.starts_at && new Date(ham.starts_at) > simdi) return false
  if (ham.ends_at && new Date(ham.ends_at) < simdi) return false
  if (ham.max_uses != null && (ham.used_count ?? 0) >= ham.max_uses) return false
  return true
}

export type YuklemeSonucu = {
  /** Kod gerektirmeyen, otomatik uygulanan kampanyalar. */
  otomatikler: HesapKampanyasi[]
  /** Kod ile uygulananlar — koda göre aranır. */
  kodlular: HesapKampanyasi[]
  /** v2 tabloları kurulu mu? (panelde uyarı için) */
  v2Hazir: boolean
}

export async function kampanyalariYukle(
  supabase: SupabaseClient,
  simdi: Date = new Date()
): Promise<YuklemeSonucu> {
  const { data: hamlar } = await supabase.from('campaigns').select('*').eq('is_active', true)

  const yururlukte = ((hamlar ?? []) as HamKampanya[]).filter((h) => yururlukteHam(h, simdi))
  if (yururlukte.length === 0) return { otomatikler: [], kodlular: [], v2Hazir: false }

  const kimlikler = yururlukte.map((h) => h.id)

  // Hedefler (kategori/koleksiyon/ürün) ve kademeler ayrı tablolarda.
  const [hedefRes, kademeRes] = await Promise.all([
    supabase
      .from('campaign_targets')
      .select('campaign_id, target_type, category_value, collection_id, product_id')
      .in('campaign_id', kimlikler),
    supabase
      .from('campaign_tiers')
      .select('campaign_id, min_cart_amount, discount_type, discount_value')
      .in('campaign_id', kimlikler),
  ])

  const v2Hazir = !hedefRes.error && !kademeRes.error

  // Koleksiyon kimliği → slug (motor slug ile eşleştirir).
  const koleksiyonKimlikleri = (hedefRes.data ?? [])
    .map((h: { collection_id: string | null }) => h.collection_id)
    .filter(Boolean) as string[]
  const koleksiyonSlug = new Map<string, string>()
  if (koleksiyonKimlikleri.length > 0) {
    const { data: kols } = await supabase
      .from('collections')
      .select('id, slug')
      .in('id', koleksiyonKimlikleri)
    for (const k of kols ?? []) koleksiyonSlug.set(k.id, k.slug)
  }

  const hedefHaritasi = new Map<string, string[]>()
  for (const h of hedefRes.data ?? []) {
    const liste = hedefHaritasi.get(h.campaign_id) ?? []
    if (h.target_type === 'category' && h.category_value) liste.push(String(h.category_value))
    else if (h.target_type === 'collection' && h.collection_id) {
      const slug = koleksiyonSlug.get(h.collection_id)
      if (slug) liste.push(slug)
    } else if (h.target_type === 'product' && h.product_id) liste.push(String(h.product_id))
    hedefHaritasi.set(h.campaign_id, liste)
  }

  const kademeHaritasi = new Map<string, { minTutar: number; oran: number }[]>()
  for (const t of kademeRes.data ?? []) {
    const liste = kademeHaritasi.get(t.campaign_id) ?? []
    // Kademelerde yalnız yüzde desteklenir; sabit tutarlı kademe sepet
    // toplamına göre anlam kaymasına yol açıyordu.
    if ((t.discount_type ?? 'percent') === 'percent') {
      liste.push({ minTutar: Number(t.min_cart_amount) || 0, oran: Number(t.discount_value) || 0 })
    }
    kademeHaritasi.set(t.campaign_id, liste)
  }

  const otomatikler: HesapKampanyasi[] = []
  const kodlular: HesapKampanyasi[] = []

  for (const ham of yururlukte) {
    const tip = tipCevir(ham)
    if (!tip) continue

    const kampanya: HesapKampanyasi = {
      id: ham.id,
      ad: ham.name,
      tip,
      kapsam: kapsamCevir(ham),
      hedefler: hedefHaritasi.get(ham.id) ?? [],
      deger: ham.discount_value == null ? null : Number(ham.discount_value),
      minSepet: Number(ham.min_cart_amount ?? 0),
      minAdet: Number(ham.min_item_count ?? 0),
      alAdet: ham.buy_quantity ?? Number((ham.metadata as any)?.buy_quantity) ?? null,
      odeAdet: ham.pay_quantity ?? Number((ham.metadata as any)?.pay_quantity) ?? null,
      kademeler: kademeHaritasi.get(ham.id) ?? null,
      birlesebilir: Boolean(ham.combinable),
      oncelik: Number(ham.priority ?? 100),
      ilkAlisverisMi: Boolean(ham.first_order_only),
      sadeceUyelere: Boolean(ham.members_only),
      koduVar: Boolean(ham.requires_code) || ham.type === 'discount_code',
    }

    // Kapsamlı kampanyanın hedefi yoksa uygulanamaz: sessizce tüm sepete
    // yayılması, panelde "kolyelerde %20" yazarken herkese %20 vermek olurdu.
    if (kampanya.kapsam !== 'sepet' && kampanya.hedefler.length === 0) continue

    if (kampanya.koduVar) kodlular.push(kampanya)
    else otomatikler.push(kampanya)
  }

  return { otomatikler, kodlular, v2Hazir }
}

/** Koda göre kampanya bulur (kupon uygulama yolu). */
export function kodaGoreBul(kodlular: HesapKampanyasi[], kod: string, hamKodlar: Map<string, string>) {
  const temiz = (kod || '').trim().toLocaleUpperCase('tr-TR')
  if (!temiz) return null
  for (const k of kodlular) {
    const kampanyaKodu = (hamKodlar.get(k.id) ?? '').trim().toLocaleUpperCase('tr-TR')
    if (kampanyaKodu && kampanyaKodu === temiz) return k
  }
  return null
}
