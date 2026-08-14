import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import SiteMetinleriClient from './SiteMetinleriClient'

export const metadata: Metadata = { title: 'Site Metinleri' }
export const dynamic = 'force-dynamic'

export default async function PanelSiteMetinleriPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('site_content').select('key, value').order('key')

  return (
    <SiteMetinleriClient
      metinler={(data || []).map((r: any) => ({ key: r.key, value: r.value ?? '' }))}
    />
  )
}
