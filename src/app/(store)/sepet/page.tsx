import type { Metadata } from 'next'
import { getCouponReminder } from '@/lib/campaigns.server'
import CartPageClient from './CartPageClient'

// Kupon bilgisi sunucuda okunur, sepet içeriği istemcide (localStorage) kalır.
/**
 * İşlevsel sayfa — arama sonucunda yeri yok (Faz 11F kapanış denetimi).
 *
 * Kendi başlığı/açıklaması olmadığı için ana sayfanın metnini birebir
 * tekrarlıyordu ve index,follow ile taranıyordu; Search Console bunu
 * "yinelenen içerik, kullanıcı tarafından kurallı etiket seçilmedi" diye
 * eliyor. follow açık kalır: içindeki bağlantılar izlenmeye devam eder.
 */
export const metadata: Metadata = {
  title: 'Sepet',
  robots: { index: false, follow: true },
}

export default async function CartPage() {
  const coupon = await getCouponReminder()
  return <CartPageClient coupon={coupon} />
}
