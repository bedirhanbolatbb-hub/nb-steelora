'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Truck } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { ORDER_STATUS, PBadge, PInput, PSelect, type BadgeTone } from '../_components/ui'
import { PDialog, PTabs, useToast } from '../_components/overlays'
import { PButton } from '../_components/ui'

export type SiparisSatiri = {
  id: string
  no: string
  musteri: string
  email: string | null
  tutar: number
  durum: string
  tarih: string
  takipVar: boolean
}

export type TalepSatiri = {
  id: string
  tip: string
  durum: string
  sebep: string | null
  tarih: string
  siparisNo: string
  email: string | null
  tutar: number
}

const TALEP_TIP: Record<string, string> = { cancel: 'İptal talebi', return: 'İade talebi' }
const TALEP_DURUM: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Bekliyor', tone: 'warning' },
  approved: { label: 'Onaylandı', tone: 'success' },
  rejected: { label: 'Reddedildi', tone: 'danger' },
  completed: { label: 'Tamamlandı', tone: 'success' },
}

const tarihStr = (t: string) =>
  new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' })

export default function SiparislerClient({
  satirlar,
  talepler,
  yarimKalan,
  params,
}: {
  satirlar: SiparisSatiri[]
  talepler: TalepSatiri[]
  yarimKalan: SiparisSatiri[]
  params: { durum: string; q: string; tab: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { push: toast } = useToast()
  const [arama, setArama] = useState(params.q)
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [talepIslem, setTalepIslem] = useState<{ talep: TalepSatiri; action: 'approve' | 'reject' } | null>(null)
  const [isleniyor, setIsleniyor] = useState(false)

  // Mevcut guard'lı uç: onayda iptal talepleri tam iade+stok akışını çalıştırır.
  const talepUygula = async () => {
    if (!talepIslem) return
    setIsleniyor(true)
    try {
      const res = await fetch(`/api/admin/order-requests/${talepIslem.talep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: talepIslem.action }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'İşlem başarısız')
      toast(talepIslem.action === 'approve' ? 'Talep onaylandı' : 'Talep reddedildi', 'success')
      setTalepIslem(null)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const guncelle = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      router.push(`${pathname}?${next.toString()}`)
    },
    [sp, pathname, router]
  )

  const tab = params.tab

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PTabs
        tabs={[
          { id: 'siparisler', label: `Siparişler (${satirlar.length})` },
          { id: 'talepler', label: `Müşteri talepleri (${talepler.length})` },
          { id: 'yarim', label: `Yarım kalan ödemeler (${yarimKalan.length})` },
        ]}
        value={tab}
        onChange={(id) => guncelle({ tab: id === 'siparisler' ? '' : id })}
      />

      {tab === 'siparisler' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PInput
              placeholder="Ara: sipariş no ya da e-posta…"
              value={arama}
              onChange={(e) => {
                setArama(e.target.value)
                if (zamanlayici.current) clearTimeout(zamanlayici.current)
                const v = e.target.value
                zamanlayici.current = setTimeout(() => guncelle({ q: v.trim() }), 350)
              }}
              className="w-full sm:max-w-xs"
            />
            <PSelect
              value={params.durum}
              onChange={(e) => guncelle({ durum: e.target.value })}
              className="w-auto"
              aria-label="Durum filtresi"
            >
              <option value="">Durum: tümü</option>
              {Object.entries(ORDER_STATUS).map(([key, s]) => (
                <option key={key} value={key}>{s.label}</option>
              ))}
            </PSelect>
          </div>

          {/* Masaüstü tablo */}
          <div className="hidden overflow-x-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] sm:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
                  <th className="px-3 py-2.5 font-semibold">No</th>
                  <th className="px-3 py-2.5 font-semibold">Müşteri</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Tutar</th>
                  <th className="px-3 py-2.5 font-semibold">Durum</th>
                  <th className="px-3 py-2.5 font-semibold">Takip</th>
                  <th className="px-3 py-2.5 font-semibold">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => {
                  const d = ORDER_STATUS[s.durum] ?? { label: s.durum, tone: 'neutral' as const }
                  return (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/panel/siparisler/${s.id}`)}
                      className="cursor-pointer border-b border-[var(--p-line)]/60 last:border-0 hover:bg-[var(--p-bg)]/60"
                    >
                      <td className="px-3 py-2.5 font-medium">{s.no}</td>
                      <td className="px-3 py-2.5 text-[var(--p-ink-soft)]">{s.musteri}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(s.tutar)}</td>
                      <td className="px-3 py-2.5"><PBadge tone={d.tone}>{d.label}</PBadge></td>
                      <td className="px-3 py-2.5">
                        {s.takipVar && <Truck size={14} className="text-[var(--p-success)]" aria-label="Takip no girildi" />}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--p-muted)]">{tarihStr(s.tarih)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {satirlar.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">Sipariş bulunamadı.</p>
            )}
          </div>

          {/* Mobil kartlar */}
          <div className="space-y-2 sm:hidden">
            {satirlar.map((s) => {
              const d = ORDER_STATUS[s.durum] ?? { label: s.durum, tone: 'neutral' as const }
              return (
                <Link
                  key={s.id}
                  href={`/panel/siparisler/${s.id}`}
                  className="block rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium">{s.no}</p>
                    <PBadge tone={d.tone}>{d.label}</PBadge>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-[var(--p-ink-soft)]">{s.musteri}</p>
                  <div className="mt-1 flex items-center justify-between text-[12px]">
                    <span className="tabular-nums font-medium">{formatPrice(s.tutar)}</span>
                    <span className="flex items-center gap-1.5 text-[var(--p-muted)]">
                      {s.takipVar && <Truck size={13} className="text-[var(--p-success)]" />}
                      {tarihStr(s.tarih)}
                    </span>
                  </div>
                </Link>
              )
            })}
            {satirlar.length === 0 && (
              <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">
                Sipariş bulunamadı.
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Müşteri talepleri (salt okunur) ── */}
      {tab === 'talepler' && (
        <div className="space-y-2">
          {talepler.length === 0 && (
            <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">
              Bekleyen talep yok.
            </p>
          )}
          {talepler.map((t) => {
            const d = TALEP_DURUM[t.durum] ?? { label: t.durum, tone: 'neutral' as const }
            return (
              <div key={t.id} className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PBadge tone={t.tip === 'cancel' ? 'danger' : 'warning'}>{TALEP_TIP[t.tip] ?? t.tip}</PBadge>
                  <span className="text-[13px] font-medium">{t.siparisNo}</span>
                  <PBadge tone={d.tone}>{d.label}</PBadge>
                  <span className="ml-auto text-[12px] text-[var(--p-muted)]">{tarihStr(t.tarih)}</span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--p-ink-soft)]">
                  {t.email ?? '—'} · {formatPrice(t.tutar)}
                </p>
                {t.sebep && <p className="mt-1 text-[12px] text-[var(--p-muted)]">Sebep: {t.sebep}</p>}
                {t.durum === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <PButton variant="ghost" disabled={isleniyor} onClick={() => setTalepIslem({ talep: t, action: 'approve' })}>
                      Onayla
                    </PButton>
                    <PButton variant="danger" disabled={isleniyor} onClick={() => setTalepIslem({ talep: t, action: 'reject' })}>
                      Reddet
                    </PButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Talep onay/red onayı */}
      <PDialog
        open={talepIslem !== null}
        onClose={() => setTalepIslem(null)}
        title={talepIslem?.action === 'approve' ? 'Talep onaylanacak' : 'Talep reddedilecek'}
        footer={
          <>
            <PButton variant="ghost" onClick={() => setTalepIslem(null)}>Vazgeç</PButton>
            <PButton variant={talepIslem?.action === 'approve' ? 'primary' : 'danger'} onClick={talepUygula} disabled={isleniyor}>
              {isleniyor ? 'Uygulanıyor…' : 'Evet, uygula'}
            </PButton>
          </>
        }
      >
        <p>
          {talepIslem?.talep.siparisNo} — {TALEP_TIP[talepIslem?.talep.tip ?? ''] ?? talepIslem?.talep.tip}.{' '}
          {talepIslem?.action === 'approve' && talepIslem?.talep.tip === 'cancel'
            ? 'Onay, mevcut akışla iyzico iadesini ve stok geri yüklemesini otomatik çalıştırır.'
            : talepIslem?.action === 'approve'
              ? 'Onay sonrası iade süreci mevcut akışla ilerler.'
              : 'Müşteri talebi reddedilmiş olarak işaretlenir.'}
        </p>
      </PDialog>

      {/* ── Yarım kalan ödemeler ── */}
      {tab === 'yarim' && (
        <div className="space-y-2">
          {yarimKalan.length === 0 && (
            <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">
              Yarım kalan ödeme yok — 3DS&apos;te bırakılan siparişler burada görünür.
            </p>
          )}
          {yarimKalan.map((s) => (
            <div key={s.id} className={cn('flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3')}>
              <span className="text-[13px] font-medium">{s.no}</span>
              <span className="text-[12px] text-[var(--p-ink-soft)]">{s.email ?? '—'}</span>
              <span className="tabular-nums text-[13px]">{formatPrice(s.tutar)}</span>
              <PBadge tone="warning">ödeme tamamlanmadı</PBadge>
              <span className="ml-auto text-[12px] text-[var(--p-muted)]">{tarihStr(s.tarih)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
