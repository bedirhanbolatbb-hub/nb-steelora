import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let bannerText: string | null = null
  let bannerColor: string | null = null
  let isLoggedIn = false

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const [bannerResult, userResult] = await Promise.all([
      supabase
        .from('campaigns')
        .select('banner_text, banner_color')
        .eq('type', 'banner')
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .limit(1)
        .single(),
      supabase.auth.getUser(),
    ])

    if (bannerResult.data) {
      bannerText = bannerResult.data.banner_text
      bannerColor = bannerResult.data.banner_color
    }

    isLoggedIn = !!userResult.data?.user
  } catch {
    // Defaults apply
  }

  return (
    <>
      <Navbar
        bannerText={bannerText}
        bannerColor={bannerColor}
        isLoggedIn={isLoggedIn}
      />
      <main className="flex-1">{children}</main>
      <Footer isLoggedIn={isLoggedIn} />
    </>
  )
}
