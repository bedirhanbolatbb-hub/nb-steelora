import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/service'
import { formatPrice } from '@/lib/utils'
import { ORDER_STATUS, PBadge, PCard, type BadgeTone } from './_components/ui'
import DataTable from './_components/DataTable'
import Sparkline from './_components/Sparkline'

// Gösterge paneli her ziyarette taze veri okur.
export const dynamic = 'force-dynamic'

const GUN_MS = 86_400_000
/** İstanbul UTC+3 (2016'dan beri sabit) — "bugün" bu saate göre hesaplanır. */
const TZ_OFFSET_MS = 3 * 3_600_000

type OrderRow = {
  id: string
  order_number: string | null
  total: number | null
  status: string | null
  created_at: string
  guest_email: string | null
  shipping_address: { full_name?: string } | null
}

function istanbulDayStart(now: Date): number {
  const yerel = new Date(now.getTime() + TZ_OFFSET_MS)
  yerel.setUTCHours(0, 0, 0, 0)
  return yerel.getTime() - TZ_OFFSET_MS
}

function metricsFor(orders: OrderRow[], fromMs: number) {
  // Ciro ve adet iptaller hariç hesaplanır.
  const kesit = orders.filter(
    (o) => o.status !== 'cancelled' && new Date(o.created_at).getTime() >= fromMs
  )
  const ciro = kesit.reduce((sum, o) => sum + Number(o.total || 0), 0)
  return { ciro, adet: kesit.length, ortalama: kesit.length ? ciro / kesit.length : 0 }
}

export default async function PanelDashboard() {
  const supabase = createServiceClient()
  const now = new Date()
  const bugunBasi = istanbulDayStart(now)
  const otuzGunOnce = bugunBasi - 29 * GUN_MS

  const [ordersRes, sonBesRes, yorumRes, stokRes, stokListRes, syncRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total, status, created_at, guest_email, shipping_address')
      .gte('created_at', new Date(otuzGunOnce).toISOString()),
    supabase
      .from('orders')
      .select('id, order_number, total, status, created_at, guest_email, shipping_address')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('trendyol_stock', 1),
    supabase
      .from('products_display')
      .select('id, slug, display_title, display_images, trendyol_stock, sales_count')
      .eq('trendyol_stock', 1)
      .order('sales_count', { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from('sync_log')
      .select('status, synced_at, finished_at, pages_done, products_updated, error_message')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const orders = (ordersRes.data || []) as OrderRow[]
  const sonBes = (sonBesRes.data || []) as OrderRow[]
  const bekleyenSiparis = orders.filter((o) => o.status === 'pending').length
  const onayBekleyenYorum = yorumRes.count ?? 0
  const sonAdet = stokRes.count ?? 0

  const bugun = metricsFor(orders, bugunBasi)
  const yediGun = metricsFor(orders, bugunBasi - 6 * GUN_MS)
  const otuzGun = metricsFor(orders, otuzGunOnce)

  // 30 günlük günlük ciro serisi (iptaller hariç), eski→yeni.
  const seri = Array.from({ length: 30 }, (_, i) => {
    const gunBasi = otuzGunOnce + i * GUN_MS
    return orders
      .filter((o) => {
        if (o.status === 'cancelled') return false
        const t = new Date(o.created_at).getTime()
        return t >= gunBasi && t < gunBasi + GUN_MS
      })
      .reduce((sum, o) => sum + Number(o.total || 0), 0)
  })

  // Senkron sağlığı
  const sync = syncRes.data
  const syncYasDk = sync ? Math.round((now.getTime() - new Date(sync.synced_at).getTime()) / 60000) : null
  const syncTone: BadgeTone =
    sync?.status === 'success' ? 'success' : sync?.status === 'running' ? 'accent' : sync?.status === 'partial' ? 'warning' : 'danger'
  const syncYas =
    syncYasDk == null ? '' : syncYasDk < 60 ? `${syncYasDk} dk önce` : syncYasDk < 2880 ? `${Math.round(syncYasDk / 60)} sa önce` : `${Math.round(syncYasDk / 1440)} gün önce`

  const metrikler = [
    { ad: 'Bugün', ...bugun },
    { ad: 'Son 7 gün', ...yediGun },
    { ad: 'Son 30 gün', ...otuzGun },
  ]

  const dikkat = [
    { href: '/panel/yorumlar', etiket: 'Onay bekleyen yorum', deger: onayBekleyenYorum },
    { href: '/panel/siparisler', etiket: 'Bekleyen sipariş', deger: bekleyenSiparis },
    { href: '/panel/urunler', etiket: 'Son 1 adet ürün', deger: sonAdet },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Metrik kartları ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrikler.map((m) => (
          <PCard key={m.ad}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--p-muted)]">
              {m.ad}
            </p>
            <p className="mt-1.5 text-[22px] font-semibold tabular-nums text-[var(--p-ink)]">
              {formatPrice(m.ciro)}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--p-muted)]">
              {m.adet} sipariş · ort. sepet {m.adet ? formatPrice(m.ortalama) : '—'}
            </p>
          </PCard>
        ))}
      </div>

      {/* ── 30 günlük ciro eğrisi ── */}
      <PCard title="Son 30 gün — günlük ciro">
        <Sparkline values={seri} />
        {otuzGun.ciro === 0 && (
          <p className="mt-2 text-center text-[12px] text-[var(--p-muted)]">
            Son 30 günde ciro kaydı yok.
          </p>
        )}
      </PCard>

      {/* ── Dikkat isteyenler ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {dikkat.map((d) => (
          <Link key={d.href} href={d.href} className="group">
            <PCard className="transition-colors group-hover:border-[var(--p-ink)]">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] text-[var(--p-ink-soft)]">{d.etiket}</p>
                <p
                  className={
                    d.deger > 0
                      ? 'text-[22px] font-semibold tabular-nums text-[var(--p-warning)]'
                      : 'text-[22px] font-semibold tabular-nums text-[var(--p-success)]'
                  }
                >
                  {d.deger}
                </p>
              </div>
            </PCard>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Stok riski ── */}
        <PCard
          title="Stok riski — son 1 adet"
          action={
            <Link href="/panel/urunler" className="text-[12px] text-[var(--p-accent-deep)] hover:underline">
              Tümü ({sonAdet})
            </Link>
          }
        >
          {stokListRes.data?.length ? (
            <ul className="divide-y divide-[var(--p-line)]/60">
              {stokListRes.data.map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                    {p.display_images?.[0] && (
                      // Küçük varyant (w=96) + eager: liste ilk ekranda, geç
                      // yüklenmesin (7A bulgusu).
                      <Image
                        src={p.display_images[0]}
                        alt=""
                        width={48}
                        height={48}
                        sizes="48px"
                        loading="eager"
                        className="h-10 w-10 object-cover"
                      />
                    )}
                  </div>
                  <a
                    href={`/urun/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-[13px] text-[var(--p-ink)] hover:text-[var(--p-accent-deep)]"
                  >
                    {p.display_title}
                  </a>
                  <PBadge tone="warning">stok 1</PBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-[13px] text-[var(--p-muted)]">Stok riski yok.</p>
          )}
        </PCard>

        {/* ── Senkron sağlığı ── */}
        <PCard
          title="Senkron sağlığı"
          action={
            <Link href="/panel/senkron" className="text-[12px] text-[var(--p-accent-deep)] hover:underline">
              Ayrıntı
            </Link>
          }
        >
          {sync ? (
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2">
                <PBadge tone={syncTone}>
                  {sync.status === 'success' ? 'Başarılı' : sync.status === 'running' ? 'Çalışıyor' : sync.status === 'partial' ? 'Kısmi' : 'BAŞARISIZ'}
                </PBadge>
                <span className="text-[var(--p-muted)]">{syncYas}</span>
              </div>
              <p className="text-[var(--p-ink-soft)]">
                {sync.pages_done} sayfa · {sync.products_updated} ürün güncellendi
              </p>
              {sync.error_message && (
                <p className="rounded-[4px] bg-[var(--p-warning-bg)] px-2.5 py-1.5 text-[12px] text-[var(--p-warning)]">
                  {sync.error_message}
                </p>
              )}
            </div>
          ) : (
            <p className="py-4 text-center text-[13px] text-[var(--p-muted)]">Henüz koşu yok.</p>
          )}
        </PCard>
      </div>

      {/* ── Son 5 sipariş ── */}
      <PCard
        title="Son siparişler"
        action={
          <Link href="/panel/siparisler" className="text-[12px] text-[var(--p-accent-deep)] hover:underline">
            Tümü
          </Link>
        }
        className="[&>div]:p-0"
      >
        <DataTable
          columns={[
            { key: 'no', label: 'No' },
            { key: 'musteri', label: 'Müşteri', hideOnMobile: true },
            { key: 'tutar', label: 'Tutar', sortable: true, align: 'right' },
            { key: 'durum', label: 'Durum' },
            { key: 'tarih', label: 'Tarih', sortable: true },
          ]}
          rows={sonBes.map((o) => {
            const durum = ORDER_STATUS[o.status ?? ''] ?? { label: o.status ?? '—', tone: 'neutral' as const }
            return {
              id: o.id,
              sort: { tutar: Number(o.total || 0), tarih: o.created_at },
              cells: {
                no: <span className="font-medium">{o.order_number ?? '—'}</span>,
                musteri: (
                  <span className="text-[var(--p-ink-soft)]">
                    {o.shipping_address?.full_name || o.guest_email || '—'}
                  </span>
                ),
                tutar: <span className="tabular-nums">{formatPrice(Number(o.total || 0))}</span>,
                durum: <PBadge tone={durum.tone}>{durum.label}</PBadge>,
                tarih: (
                  <span className="text-[var(--p-muted)]">
                    {new Date(o.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'Europe/Istanbul',
                    })}
                  </span>
                ),
              },
            }
          })}
          emptyText="Henüz sipariş yok."
        />
      </PCard>
    </div>
  )
}
