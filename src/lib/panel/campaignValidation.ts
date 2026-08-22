/** Kampanya formu doğrulaması — panel create/update uçlarının ortak katmanı. */
export const CAMPAIGN_TYPES = [
  'discount_code',
  'cart_discount',
  'free_shipping',
  'buy_x_get_y',
  'banner',
  // Faz 17 — kapsamlı ve koşullu tipler
  'item_discount',
  'tiered_discount',
  'buy_x_get_y_scoped',
]

export const CAMPAIGN_SCOPES = ['cart', 'category', 'collection', 'product']

/** Gövdeyi doğrulayıp yazılacak satıra çevirir; hata metni döner. */
export function validateCampaign(body: any): {
  row?: Record<string, unknown>
  hedefler?: string[]
  kademeler?: { min_cart_amount: number; discount_value: number }[]
  error?: string
} {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const type = typeof body?.type === 'string' ? body.type : ''
  if (!name) return { error: 'Ad zorunlu' }
  if (!CAMPAIGN_TYPES.includes(type)) return { error: 'Geçersiz kampanya tipi' }

  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() || null : null
  if (type === 'discount_code' && !code) return { error: 'İndirim kodu kampanyasında kod zorunlu' }

  const starts = body?.starts_at ? new Date(body.starts_at) : null
  const ends = body?.ends_at ? new Date(body.ends_at) : null
  if (starts && isNaN(starts.getTime())) return { error: 'Geçersiz başlangıç tarihi' }
  if (ends && isNaN(ends.getTime())) return { error: 'Geçersiz bitiş tarihi' }
  if (starts && ends && ends <= starts) return { error: 'Bitiş, başlangıçtan sonra olmalı' }

  const discountValue = body?.discount_value === '' || body?.discount_value == null ? null : Number(body.discount_value)
  if (discountValue !== null && (!isFinite(discountValue) || discountValue < 0)) {
    return { error: 'Geçersiz indirim değeri' }
  }

  const scope = CAMPAIGN_SCOPES.includes(body?.scope) ? body.scope : 'cart'
  const hedefler: string[] = Array.isArray(body?.targets)
    ? body.targets.map((t: unknown) => String(t).trim()).filter(Boolean)
    : []
  if (scope !== 'cart' && hedefler.length === 0) {
    return { error: 'Kapsam seçtiğiniz kampanyada en az bir hedef seçmelisiniz' }
  }
  const kademeler = Array.isArray(body?.tiers)
    ? body.tiers
        .map((t: any) => ({ min_cart_amount: Number(t?.minTutar), discount_value: Number(t?.oran) }))
        .filter((t: any) => Number.isFinite(t.min_cart_amount) && t.discount_value > 0)
    : []
  if (type === 'tiered_discount' && kademeler.length === 0) {
    return { error: 'Kademeli kampanyada en az bir eşik tanımlayın' }
  }

  const alAdet = body?.buy_quantity ? Number(body.buy_quantity) : null
  const odeAdet = body?.pay_quantity ? Number(body.pay_quantity) : null
  if ((type === 'buy_x_get_y' || type === 'buy_x_get_y_scoped')) {
    if (!alAdet || !odeAdet || alAdet <= odeAdet) {
      return { error: 'X al Y öde: "al" adedi "öde" adedinden büyük olmalı' }
    }
  }

  return {
    row: {
      name,
      type,
      code,
      scope,
      requires_code: type === 'discount_code' ? true : Boolean(body?.requires_code),
      min_item_count: body?.min_item_count ? Number(body.min_item_count) : null,
      per_user_limit: body?.per_user_limit ? Number(body.per_user_limit) : null,
      priority: body?.priority ? Number(body.priority) : 100,
      combinable: Boolean(body?.combinable),
      members_only: Boolean(body?.members_only),
      first_order_only: Boolean(body?.first_order_only),
      max_discount_amount: body?.max_discount_amount ? Number(body.max_discount_amount) : null,
      buy_quantity: alAdet,
      pay_quantity: odeAdet,
      discount_type: body?.discount_type === 'fixed' ? 'fixed' : 'percent',
      discount_value: discountValue,
      min_cart_amount: Number(body?.min_cart_amount || 0),
      max_uses: body?.max_uses ? Number(body.max_uses) : null,
      banner_text: typeof body?.banner_text === 'string' ? body.banner_text.trim() || null : null,
      banner_color: typeof body?.banner_color === 'string' ? body.banner_color.trim() || null : null,
      starts_at: starts ? starts.toISOString() : new Date().toISOString(),
      ends_at: ends ? ends.toISOString() : null,
      is_active: Boolean(body?.is_active),
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : null,
    },
    hedefler,
    kademeler,
  }
}

