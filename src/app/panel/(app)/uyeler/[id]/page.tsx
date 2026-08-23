import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { uyeGetir } from '@/lib/uyeler/liste'
import UyeDetayClient, { type Hareket, type SiparisOzet } from './UyeDetayClient'

export const metadata: Metadata = { title: 'Üye' }
export const dynamic = 'force-dynamic'

export default async function PanelUyeDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const uye = await uyeGetir(id)
  if (!uye) notFound()

  const supabase = createServiceClient()

  // Hareketler yalnız user_id sütunu varsa okunabilir.
  let baglantiAcik = true
  const { data: olaylar, error } = await supabase
    .from('analytics_events')
    .select('event, occurred_at, path, product_id, search_query, value')
    .eq('user_id', id)
    .order('occurred_at', { ascending: false })
    .limit(200)
  if (error) baglantiAcik = false

  // Ürün adları tek sorguda — satır başına sorgu atmak listeyi yavaşlatırdı.
  const urunKimlikleri = [
    ...new Set((olaylar ?? []).map((o: any) => o.product_id).filter(Boolean)),
  ] as string[]
  const adlar = new Map<string, { ad: string; slug: string }>()
  if (urunKimlikleri.length) {
    const { data: urunler } = await supabase
      .from('products')
      .select('id, slug, override_title, trendyol_title')
      .in('id', urunKimlikleri)
    for (const u of urunler ?? []) {
      adlar.set((u as any).id, {
        ad: (u as any).override_title || (u as any).trendyol_title,
        slug: (u as any).slug,
      })
    }
  }

  const hareketler: Hareket[] = (olaylar ?? []).map((o: any) => ({
    event: o.event,
    zaman: o.occurred_at,
    path: o.path,
    urunAdi: o.product_id ? (adlar.get(o.product_id)?.ad ?? null) : null,
    urunSlug: o.product_id ? (adlar.get(o.product_id)?.slug ?? null) : null,
    sorgu: o.search_query,
    tutar: o.value != null ? Number(o.value) : null,
  }))

  const { data: siparisler } = await supabase
    .from('orders')
    .select('id, order_number, total, status, created_at')
    .ilike('guest_email', uye.epostaTam)
    .order('created_at', { ascending: false })

  const siparisOzet: SiparisOzet[] = (siparisler ?? []).map((o: any) => ({
    id: o.id,
    no: o.order_number ?? '—',
    tutar: Number(o.total) || 0,
    durum: o.status,
    zaman: o.created_at,
  }))

  return (
    <UyeDetayClient
      uye={{
        id: uye.id,
        eposta: uye.eposta,
        ad: uye.ad,
        kayit: uye.kayit,
        onayli: uye.onayli,
        sonGiris: uye.sonGiris,
      }}
      hareketler={hareketler}
      siparisler={siparisOzet}
      baglantiAcik={baglantiAcik}
    />
  )
}
