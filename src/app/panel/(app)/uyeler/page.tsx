import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { uyeleriGetir } from '@/lib/uyeler/liste'
import UyelerClient, { type Satir } from './UyelerClient'

export const metadata: Metadata = { title: 'Üyeler' }
export const dynamic = 'force-dynamic'

export default async function PanelUyelerPage() {
  const supabase = createServiceClient()
  const uyeler = await uyeleriGetir()

  // Sipariş sayısı e-posta üzerinden eşleşir: sipariş tablosunda üye kimliği
  // tutulmuyor, misafir çıkış da aynı adresle yapılabiliyor.
  const { data: siparisler } = await supabase.from('orders').select('guest_email, total, status')
  const siparisOzet = new Map<string, { adet: number; ciro: number }>()
  for (const o of siparisler ?? []) {
    const e = (o as any).guest_email?.toLowerCase()
    if (!e) continue
    const m = siparisOzet.get(e) ?? { adet: 0, ciro: 0 }
    m.adet++
    // İptal/iade edilen sipariş üyenin cirosuna yazılmaz (Faz 23-A ile aynı kural).
    if ((o as any).status !== 'cancelled' && (o as any).status !== 'refunded') {
      m.ciro += Number((o as any).total) || 0
    }
    siparisOzet.set(e, m)
  }

  // Hareket sayısı yalnız user_id sütunu varsa okunur (docs/analiz/02-...sql).
  const hareket = new Map<string, number>()
  let baglantiAcik = true
  const { data: olaylar, error } = await supabase
    .from('analytics_events')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(50000)
  if (error) baglantiAcik = false
  for (const e of olaylar ?? []) {
    const u = (e as any).user_id as string
    hareket.set(u, (hareket.get(u) ?? 0) + 1)
  }

  const satirlar: Satir[] = uyeler.map((u) => {
    const s = siparisOzet.get(u.epostaTam.toLowerCase())
    return {
      id: u.id,
      eposta: u.eposta,
      ad: u.ad,
      kayit: u.kayit,
      onayli: u.onayli,
      sonGiris: u.sonGiris,
      bugunKatildi: u.bugunKatildi,
      siparis: s?.adet ?? 0,
      ciro: s?.ciro ?? 0,
      hareket: hareket.get(u.id) ?? 0,
    }
  })

  return <UyelerClient satirlar={satirlar} baglantiAcik={baglantiAcik} />
}
