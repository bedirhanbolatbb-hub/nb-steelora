import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import type { CouponReminder } from '@/lib/campaigns'

/**
 * Aktif indirim kodu kampanyasını okur ve hatırlatma metnini ondan üretir —
 * hiçbir oran/kod koda gömülmez. Kampanya yoksa, tarihi geçmişse ya da kullanım
 * limiti dolduysa null döner (satır hiç basılmaz).
 */
export async function getCouponReminder(): Promise<CouponReminder | null> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data } = await supabase
      .from('campaigns')
      .select('name, code, discount_type, discount_value, min_cart_amount, max_uses, used_count')
      .eq('is_active', true)
      .eq('type', 'discount_code')
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data?.code || !data.discount_value) return null
    if (data.max_uses && (data.used_count ?? 0) >= data.max_uses) return null

    const amount =
      data.discount_type === 'percent'
        ? `%${Number(data.discount_value)}`
        : formatPrice(data.discount_value)

    return {
      code: data.code,
      label: `${amount} indirim: ${data.code}`,
      minCartAmount: Number(data.min_cart_amount ?? 0),
    }
  } catch {
    return null
  }
}
