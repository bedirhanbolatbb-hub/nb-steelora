'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { PBadge, PButton, PCard } from '../../_components/ui'
import { PDialog, useToast } from '../../_components/overlays'

export type HavaleBilgisi = {
  durum: string
  tutar: number
  banka: string
  alici: string
  iban: string
  sonOdeme: string | null
  onaylandi: string | null
  indirim: { oran: number; tutar: number } | null
}

const ts = (t: string | null) =>
  t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' }) : '—'

/**
 * Panel · havale/EFT siparişi (7 Kas 2026).
 *
 * Para hesaba geçince BB "Ödeme geldi, onayla"ya basar: sipariş ödendi olur,
 * stok düşer, Trendyol stoğu yazılır, müşteriye onay maili gider (kart
 * ödemesiyle aynı zincir). Ödenmiş havale siparişinde para iadesi otomatik
 * DEĞİLDİR — müşterinin ödeme yaptığı hesaba bankadan geri gönderilir.
 */
export default function HavaleBlogu({ siparisId, siparisNo, h }: { siparisId: string; siparisNo: string; h: HavaleBilgisi }) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [acik, setAcik] = useState(false)
  const [isleniyor, setIsleniyor] = useState(false)
  const bekliyor = h.durum === 'pending'
  const gecikti = bekliyor && h.sonOdeme ? Date.now() > Date.parse(h.sonOdeme) : false

  const onayla = async () => {
    setIsleniyor(true)
    try {
      const res = await fetch(`/api/panel/orders/${siparisId}/havale-onay`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) throw new Error(d.error || 'Onaylanamadı')
      toast('Ödeme onaylandı — stok düştü, müşteriye onay maili gidiyor', 'success')
      setAcik(false)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  return (
    <PCard title="Havale / EFT">
      <div className="mb-2 flex items-center gap-2">
        {bekliyor ? (
          <PBadge tone={gecikti ? 'danger' : 'warning'}>{gecikti ? 'Ödeme süresi geçti' : 'Ödeme bekleniyor'}</PBadge>
        ) : h.onaylandi ? (
          <PBadge tone="success">Ödeme onaylandı · {ts(h.onaylandi)}</PBadge>
        ) : (
          <PBadge tone="neutral">{h.durum}</PBadge>
        )}
      </div>
      <dl className="space-y-1 text-[13px]">
        <div className="flex justify-between gap-3"><dt className="text-[var(--p-muted)]">Beklenen tutar</dt><dd className="font-semibold tabular-nums">{formatPrice(h.tutar)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[var(--p-muted)]">Açıklama</dt><dd className="font-medium">{siparisNo}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[var(--p-muted)]">Hesap</dt><dd className="text-right">{h.alici} · {h.banka}</dd></div>
        {h.indirim && (
          <div className="flex justify-between gap-3"><dt className="text-[var(--p-muted)]">Havale indirimi</dt><dd className="tabular-nums">%{h.indirim.oran} · −{formatPrice(h.indirim.tutar)}</dd></div>
        )}
        {bekliyor && (
          <div className="flex justify-between gap-3"><dt className="text-[var(--p-muted)]">Son ödeme</dt><dd>{ts(h.sonOdeme)}</dd></div>
        )}
      </dl>
      {bekliyor ? (
        <>
          <p className="mt-3 text-[12px] text-[var(--p-muted)]">
            Hesabınızda bu tutarı ve açıklamayı görünce onaylayın. Ödeme gelmezse durum akışından siparişi iptal edin.
          </p>
          <div className="mt-3 flex justify-end">
            <PButton onClick={() => setAcik(true)}>Ödeme geldi, onayla</PButton>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-[4px] bg-[var(--p-bg)] px-3 py-2 text-[12px] text-[var(--p-muted)]">
          İade gerekirse para otomatik dönmez: ödemeyi müşterinin para gönderdiği hesaba bankadan geri gönderin.
        </p>
      )}

      <PDialog
        open={acik}
        onClose={() => setAcik(false)}
        title="Havale ödemesini onayla"
        footer={
          <div className="flex justify-end gap-2">
            <PButton variant="ghost" onClick={() => setAcik(false)} disabled={isleniyor}>Vazgeç</PButton>
            <PButton onClick={onayla} disabled={isleniyor}>{isleniyor ? 'Onaylanıyor…' : 'Evet, ödeme geldi'}</PButton>
          </div>
        }
      >
        <p className="text-[13px] text-[var(--p-ink-soft)]">
          {formatPrice(h.tutar)} tutarındaki ödemenin ({siparisNo}) hesabınıza geçtiğini onaylıyorsunuz. Sipariş
          ödendi olur, stok düşer ve müşteriye onay maili gider. Bu adım geri alınamaz.
        </p>
      </PDialog>
    </PCard>
  )
}
