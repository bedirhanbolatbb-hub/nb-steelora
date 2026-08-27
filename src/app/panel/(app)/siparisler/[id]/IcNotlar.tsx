'use client'

import { useState } from 'react'
import { StickyNote, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PButton, PCard, PTextarea } from '../../_components/ui'
import { useToast } from '../../_components/overlays'

/**
 * Sipariş iç notları (Faz 11D) — müşteriye görünmez.
 *
 * "Müşteri yazdı, kayıt yok" durumu (NBS-1787569943108 mail şikâyeti)
 * tekrarlanmasın: WhatsApp/mail görüşmeleri buraya zaman damgasıyla işlenir.
 */
export default function IcNotlar({
  siparisId,
  notlar,
}: {
  siparisId: string
  notlar: { t: string; m: string }[]
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [metin, setMetin] = useState('')
  const [mesgul, setMesgul] = useState(false)

  const istek = async (yontem: 'POST' | 'DELETE', govde: Record<string, string>) => {
    setMesgul(true)
    try {
      const res = await fetch('/api/panel/siparis-not', {
        method: yontem,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: siparisId, ...govde }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Kaydedilemedi')
      if (yontem === 'POST') setMetin('')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Kaydedilemedi', 'danger')
    }
    setMesgul(false)
  }

  return (
    <PCard title={`İç notlar (${notlar.length})`}>
      <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
        Müşteri görmez. WhatsApp/mail görüşmelerini ve yapılanları buraya işleyin —
        &quot;müşteri yazdı, kayıt yok&quot; bir daha yaşanmasın.
      </p>
      {notlar.length > 0 && (
        <ul className="mb-4 space-y-2">
          {[...notlar].reverse().map((n) => (
            <li key={n.t} className="flex items-start gap-2 rounded-[4px] border border-[var(--p-line)] p-2.5">
              <StickyNote size={13} className="mt-0.5 shrink-0 text-[var(--p-muted)]" />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--p-ink)]">{n.m}</span>
                <span className="mt-0.5 block text-[11px] tabular-nums text-[var(--p-muted)]">
                  {new Date(n.t).toLocaleString('tr-TR', {
                    timeZone: 'Europe/Istanbul',
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
              <button
                onClick={() => istek('DELETE', { t: n.t })}
                disabled={mesgul}
                aria-label="Notu sil"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)] disabled:opacity-40"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <PTextarea
        rows={2}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Örn: Müşteri WhatsApp'tan yazdı — kargo maili ulaşmamış; Resend'den durum kontrol edildi."
      />
      <div className="mt-2">
        <PButton onClick={() => metin.trim() && istek('POST', { metin: metin.trim() })} disabled={mesgul || !metin.trim()}>
          {mesgul ? 'Kaydediliyor…' : 'Not ekle'}
        </PButton>
      </div>
    </PCard>
  )
}
