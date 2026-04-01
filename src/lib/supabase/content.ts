import { createServiceClient } from '@/lib/supabase/service'

export async function getSiteContent(): Promise<Record<string, string>> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('site_content').select('key, value')
  return Object.fromEntries(data?.map((r) => [r.key, r.value]) || [])
}
