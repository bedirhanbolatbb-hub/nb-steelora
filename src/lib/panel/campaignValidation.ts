/** Kampanya formu doğrulaması — panel create/update uçlarının ortak katmanı. */
export const CAMPAIGN_TYPES = ['discount_code', 'cart_discount', 'free_shipping', 'buy_x_get_y', 'banner']

/** Gövdeyi doğrulayıp yazılacak satıra çevirir; hata metni döner. */
export function validateCampaign(body: any): { row?: Record<string, unknown>; error?: string } {
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

  return {
    row: {
      name,
      type,
      code,
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
  }
}

