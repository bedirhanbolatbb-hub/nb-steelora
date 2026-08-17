import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import FloatingWhatsApp from '@/components/store/FloatingWhatsApp'
import RevealController from '@/components/motion/RevealController'
import ConsentBanner from '@/components/store/ConsentBanner'
import { getLayoutData } from '@/lib/layoutData'
import { sunucuOlayi } from '@/lib/analytics/server'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ortak vitrin verisi (banner + kupon + footer koleksiyon/sosyal) süreç içi
  // önbellekten gelir (Faz 9A) — istek yolunda kişiye özel tek iş auth kalır.
  const veri = await getLayoutData()

  // Sayfa görüntüleme sunucuda ölçülür (Faz 12): engelleyicilerden etkilenmez,
  // istemciye JS eklemez ve after() sayesinde yanıtı geciktirmez.
  await sunucuOlayi('page_view')

  // Salt görsel karar (hesap ikonunun hedefi): oturumu çerezden okumak yeterli,
  // ağ doğrulaması (getUser) TTFB'ye yüzlerce ms ekliyordu. Yazma yapan her uç
  // kendi doğrulamasını zaten yapıyor.
  let isLoggedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getSession()
    isLoggedIn = !!data.session
  } catch {
    // Defaults apply
  }

  return (
    <>
      <Navbar
        bannerText={veri.bannerText}
        bannerColor={veri.bannerColor}
        isLoggedIn={isLoggedIn}
        coupon={veri.coupon}
      />
      <main className="flex-1">{children}</main>
      <Footer isLoggedIn={isLoggedIn} collections={veri.collections} content={veri.content} />
      <FloatingWhatsApp />
      <RevealController />
      <ConsentBanner />
    </>
  )
}
