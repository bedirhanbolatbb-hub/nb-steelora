import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { SHIPPING_COST } from '@/lib/shipping'
import { formatPrice } from '@/lib/utils'
import { PCard } from '../_components/ui'
import KopyalanabilirAlan from './KopyalanabilirAlan'
import KvkkBlogu from './KvkkBlogu'

export const metadata: Metadata = { title: 'Ayarlar' }
export const dynamic = 'force-dynamic'

export default async function PanelAyarlarPage() {
  const supabase = createServiceClient()

  const [{ count: aktif }, { count: siparis }] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
  ])

  const satirlar = [
    { ad: 'Aktif ürün', deger: String(aktif ?? 0) },
    { ad: 'Toplam sipariş', deger: String(siparis ?? 0) },
    { ad: 'Panel sürümü', deger: 'Faz 7D' },
    { ad: 'Dağıtım', deger: 'Vitrin ve panel aynı dağıtımda (Vercel, main dalı)' },
  ]

  const sabitler = [
    { ad: 'Kargo politikası', deger: 'Tüm siparişlerde ücretsiz' },
    { ad: 'Müşteriden alınan kargo bedeli', deger: formatPrice(SHIPPING_COST) },
    { ad: 'İade süresi', deger: '14 gün (koşulsuz)' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PCard title="Sistem özeti">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {satirlar.map((s) => (
            <div key={s.ad} className="flex items-baseline justify-between gap-3 border-b border-[var(--p-line)]/50 pb-1.5">
              <dt className="text-[var(--p-muted)]">{s.ad}</dt>
              <dd className="text-right font-medium text-[var(--p-ink)]">{s.deger}</dd>
            </div>
          ))}
        </dl>
      </PCard>

      <PCard title="Kargo ve iade sabitleri">
        <dl className="space-y-2 text-[13px]">
          {sabitler.map((s) => (
            <div key={s.ad} className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--p-muted)]">{s.ad}</dt>
              <dd className="font-medium tabular-nums text-[var(--p-ink)]">{s.deger}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-[4px] bg-[var(--p-bg)] px-3 py-2 text-[12px] text-[var(--p-muted)]">
          Bu değerler kod sabitidir (src/lib/shipping.ts) — panelden değişmez; vitrin, sepet ve
          ödeme aynı sabitten okur.
        </p>
      </PCard>

      <KvkkBlogu />

      <PCard title="Search Console">
        <p className="mb-2 text-[13px] text-[var(--p-ink-soft)]">
          Site haritasını Google Search Console&apos;a bir kez ekleyin; ürün/koleksiyon sayfaları
          otomatik güncellenir.
        </p>
        <KopyalanabilirAlan deger="https://www.nbsteelora.com/sitemap.xml" />
      </PCard>
    </div>
  )
}
