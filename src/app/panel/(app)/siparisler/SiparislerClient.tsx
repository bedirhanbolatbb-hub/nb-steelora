'use client'

import Link from 'next/link'
import { IADE_ADIMLARI, type IadeIzi } from '@/lib/iade/akis'
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
  /** Sipariş notu olan satırlar listede işaretlenir (Faz 15). */
  notVar?: boolean
}

export type TalepSatiri = {
  id: string
  tip: string
  durum: string
  sebep: string | null
  tarih: string
  guncelleme: string | null
  siparisNo: string
  email: string | null
  tutar: number
  kargoFirmasi: string | null
  iadeKodu: string | null
  kodGonderimi: string | null
  iz: IadeIzi
  paraIadeEdildi: boolean
}

const TALEP_TIP: Record<string, string> = { cancel: 'İptal talebi', return: 'İade talebi' }
const TALEP_DURUM: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Talep alındı', tone: 'warning' },
  cargo_sent: { label: 'Kod gönderildi', tone: 'accent' },
  inspecting: { label: 'Ürün teslim alındı', tone: 'accent' },
  approved: { label: 'Para iade edildi', tone: 'success' },
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
  iadeVarsayilanlari,
}: {
  satirlar: SiparisSatiri[]
  talepler: TalepSatiri[]
  yarimKalan: SiparisSatiri[]
  params: { durum: string; q: string; tab: string }
  iadeVarsayilanlari: { firma: string; kod: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { push: toast } = useToast()
  const [arama, setArama] = useState(params.q)
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [talepIslem, setTalepIslem] = useState<{
    talep: TalepSatiri
    action: 'approve' | 'reject' | 'received' | 'refund'
  } | null>(null)
  const [isleniyor, setIsleniyor] = useState(false)
  const [kargoFirmasi, setKargoFirmasi] = useState(iadeVarsayilanlari.firma)
  const [iadeKodu, setIadeKodu] = useState(iadeVarsayilanlari.kod)
  /** İyzico iadesi düşerse satırın altında kırmızı kalır (Faz 20). */
  const [iadeHatalari, setIadeHatalari] = useState<Record<string, string>>({})

  const talepAc = (talep: TalepSatiri, action: 'approve' | 'reject' | 'received' | 'refund') => {
    setKargoFirmasi(talep.kargoFirmasi || iadeVarsayilanlari.firma)
    setIadeKodu(talep.iadeKodu || iadeVarsayilanlari.kod)
    setTalepIslem({ talep, action })
  }

  const talepUygula = async () => {
    if (!talepIslem) return
    setIsleniyor(true)
    const { talep, action } = talepIslem
    try {
      const res = await fetch(`/api/admin/order-requests/${talep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'approve' && talep.tip === 'return'
            ? { action, kargoFirmasi, iadeKodu }
            : { action }
        ),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'İşlem başarısız')

      setIadeHatalari((o) => {
        const y = { ...o }
        delete y[talep.id]
        return y
      })
      toast(
        action === 'approve'
          ? talep.tip === 'return'
            ? 'İade kodu müşteriye gönderildi'
            : 'Talep onaylandı'
          : action === 'received'
            ? 'Ürün teslim alındı olarak işaretlendi'
            : action === 'refund'
              ? 'Para iadesi yapıldı'
              : 'Talep reddedildi',
        'success'
      )
      setTalepIslem(null)
      router.refresh()
    } catch (e: any) {
      if (action === 'refund') setIadeHatalari((o) => ({ ...o, [talep.id]: e.message }))
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
                      <td className="px-3 py-2.5 font-medium">
                        {s.no}
                        {s.notVar && <span title="Sipariş notu var" className="ml-1.5">🎁</span>}
                      </td>
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
                    <p className="text-[13px] font-medium">
                      {s.no}
                      {s.notVar && <span title="Sipariş notu var" className="ml-1.5">🎁</span>}
                    </p>
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

                {/* Durum akışı: her adımın zaman damgası ve müşteriye giden
                    mailin kimliği (Faz 20). İz siparişin metadata'sında. */}
                {t.tip === 'return' && (
                  <ol className="mt-3 space-y-1.5 border-l border-[var(--p-line)] pl-4">
                    {IADE_ADIMLARI.map(({ adim, etiket }) => {
                      const k = t.iz?.[adim]
                      return (
                        <li key={adim} className="relative text-[12px]">
                          <span
                            className={cn(
                              'absolute -left-[21px] top-1.5 h-2 w-2 rounded-full',
                              k ? 'bg-[var(--p-success)]' : 'bg-[var(--p-line)]'
                            )}
                          />
                          <span className={k ? 'text-[var(--p-ink)]' : 'text-[var(--p-muted)]'}>{etiket}</span>
                          {k && (
                            <span className="ml-2 tabular-nums text-[var(--p-muted)]">
                              {new Date(k.at).toLocaleString('tr-TR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                                timeZone: 'Europe/Istanbul',
                              })}
                            </span>
                          )}
                          {k?.mailId && (
                            <span className="ml-2 font-mono text-[10px] text-[var(--p-muted)]">
                              mail {String(k.mailId).slice(0, 8)}…
                            </span>
                          )}
                          {k && !k.mailId && k.mailNotu && (
                            <span className="ml-2 text-[10px] text-[var(--p-warning)]">
                              mail gönderilmedi: {k.mailNotu}
                            </span>
                          )}
                          {k?.not && (
                            <span className="ml-2 text-[10px] text-[var(--p-muted)]">{k.not}</span>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                )}

                {iadeHatalari[t.id] && (
                  <p className="mt-2 rounded-[4px] bg-[var(--p-danger-bg)] px-3 py-2 text-[12px] text-[var(--p-danger)]">
                    İyzico iadesi başarısız: {iadeHatalari[t.id]}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {t.durum === 'pending' && (
                    <>
                      <PButton variant="ghost" disabled={isleniyor} onClick={() => talepAc(t, 'approve')}>
                        {t.tip === 'return' ? 'Onayla ve iade kodu gönder' : 'Onayla'}
                      </PButton>
                      <PButton variant="danger" disabled={isleniyor} onClick={() => talepAc(t, 'reject')}>
                        Reddet
                      </PButton>
                    </>
                  )}
                  {t.durum === 'cargo_sent' && (
                    <PButton variant="ghost" disabled={isleniyor} onClick={() => talepAc(t, 'received')}>
                      Ürün teslim alındı
                    </PButton>
                  )}
                  {t.durum === 'inspecting' && (
                    <PButton variant="primary" disabled={isleniyor} onClick={() => talepAc(t, 'refund')}>
                      Parayı iade et
                    </PButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Talep onay/red onayı */}
      <PDialog
        open={talepIslem !== null}
        onClose={() => setTalepIslem(null)}
        title={
          talepIslem?.action === 'approve'
            ? talepIslem.talep.tip === 'return'
              ? 'İade kodu gönderilecek'
              : 'Talep onaylanacak'
            : talepIslem?.action === 'received'
              ? 'Ürün teslim alındı işaretlenecek'
              : talepIslem?.action === 'refund'
                ? 'Para iade edilecek'
                : 'Talep reddedilecek'
        }
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
            ? 'Onay, iyzico iadesini ve stok geri yüklemesini otomatik çalıştırır.'
            : talepIslem?.action === 'approve'
              ? 'Müşteriye iade kodu ve kargo talimatı e-postayla gönderilir. PARA ŞİMDİ İADE EDİLMEZ — ürün elimize ulaşınca ayrıca iade edeceksiniz.'
              : talepIslem?.action === 'received'
                ? 'Ürünün elinize ulaştığını onaylıyorsunuz. Bu işaret konmadan para iadesi yapılamaz.'
                : talepIslem?.action === 'refund'
                  ? 'İyzico üzerinden tam iade yapılır, stok geri yüklenir ve müşteriye "iadeniz tamamlandı" e-postası gider.'
                  : 'Müşteri talebi reddedilmiş olarak işaretlenir.'}
        </p>

        {talepIslem?.action === 'approve' && talepIslem.talep.tip === 'return' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-ink-soft)]">Kargo firması</label>
              <PInput
                value={kargoFirmasi}
                onChange={(e) => setKargoFirmasi(e.target.value)}
                placeholder="ör. Yurtiçi Kargo"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-ink-soft)]">İade kodu</label>
              <PInput
                value={iadeKodu}
                onChange={(e) => setIadeKodu(e.target.value)}
                placeholder="Kargonomi panelinden aldığınız kod"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--p-muted)]">
              Kargonomi API&apos;sinde iade gönderisi ucu yok; kodu Kargonomi panelinden
              &quot;iade oluştur&quot; ile üretip buraya yapıştırın. Varsayılanlar Site
              Metinleri → &quot;İade ve iletişim&quot; alanlarından gelir.
            </p>
          </div>
        )}
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
