import { getCouponReminder } from '@/lib/campaigns.server'
import CartPageClient from './CartPageClient'

// Kupon bilgisi sunucuda okunur, sepet içeriği istemcide (localStorage) kalır.
export default async function CartPage() {
  const coupon = await getCouponReminder()
  return <CartPageClient coupon={coupon} />
}
