/**
 * Sepette gösterilecek kupon hatırlatmasının istemci-güvenli kısmı.
 * Veriyi okuyan sunucu tarafı: lib/campaigns.server.ts
 */
export type CouponReminder = {
  code: string
  label: string
  minCartAmount: number
}

/** Sepet tutarı kampanyanın alt sınırını karşılıyor mu? */
export function couponApplies(
  reminder: CouponReminder | null | undefined,
  subtotal: number
): reminder is CouponReminder {
  if (!reminder) return false
  return subtotal >= reminder.minCartAmount
}
