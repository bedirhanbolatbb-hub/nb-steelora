import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AnaSayfa from '@/components/home/AnaSayfa'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { kampanyaOnizlemesiGetir } from '@/lib/campaigns/vitrinIndirimi'

/**
 * Panel önizlemesi: henüz başlamamış kampanyanın ana sayfa ilk ekranı.
 *
 * 14 Kas 2026'ya kadar ana sayfanın `?kampanya_onizleme=` parametresiyle
 * çalışıyordu; ana sayfa önbellekten verilmeye başlayınca (sunucu süresi)
 * ayrı ve dinamik bu sayfaya taşındı. YALNIZ panel oturumu açıkken işler;
 * oturum yoksa ya da kimlik geçersizse ana sayfaya yönlendirir. Arama
 * motorlarına kapalı. Panel bağlantısı: kampanyalar/KampanyalarClient.
 */
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function KampanyaOnizlemeSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const kimlik =
    typeof sp?.kampanya === 'string' && /^[0-9a-f-]{36}$/i.test(sp.kampanya) ? sp.kampanya : null
  if (!kimlik || !(await isAdminRequest())) redirect('/')
  const onizleme = await kampanyaOnizlemesiGetir(kimlik)
  return <AnaSayfa onizleme={onizleme} />
}
