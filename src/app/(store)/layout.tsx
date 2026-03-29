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

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('campaigns')
      .select('banner_text, banner_color')
      .eq('type', 'banner')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(1)
      .single()

    if (data) {
      bannerText = data.banner_text
      bannerColor = data.banner_color
    }
  } catch {
    // No active banner campaign
  }

  return (
    <>
      <Navbar bannerText={bannerText} bannerColor={bannerColor} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
