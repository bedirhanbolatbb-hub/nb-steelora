'use client'

import { useState } from 'react'
import { PButton, PCard, PInput } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'

type Sonuc = {
  visitorId: string | null
  email: string | null
  rizalar: { categories: any; version: string; occurred_at: string; source: string }[]
  olaySayisi: number
  siparisSayisi: number
  not: string | null
}

/**
 * KVKK veri talepleri (Faz 12).
 * Ziyaretçi kimliği ya da e-posta ile rıza geçmişi aranır; talep hâlinde
 * analitik izler anonimleştirilir. Sipariş/ödeme kayıtlarına dokunulmaz.
 */
export default function KvkkBlogu() {
  const { push: toast } = useToast()
  const [visitorId, setVisitorId] = useState('')
  const [email, setEmail] = useState('')
  const [sonuc, setSonuc] = useState<Sonuc | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [onayAcik, setOnayAcik] = useState(false)

  const ara = async () => {
    setYukleniyor(true)
    try {
      const qs = new URLSearchParams()
      if (visitorId.trim()) qs.set('visitor_id', visitorId.trim())
      if (email.trim()) qs.set('email', email.trim())
      const res = await fetch(`/api/panel/kvkk?${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Arama başarısız')
      setSonuc(data)
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setYukleniyor(false)
  }

  const sil = async () => {
    setYukleniyor(true)
    try {
      const res = await fetch('/api/panel/kvkk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')
      toast(`${data.anonimlestirilen} kayıt anonimleştirildi`, 'success')
      setOnayAcik(false)
      setSonuc(null)
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setYukleniyor(false)
  }

  return (
    <PCard title="KVKK — veri talepleri">
      <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
        Ziyaretçi kimliği ya da e-posta ile rıza geçmişini arayın. Silme talebinde analitik izler
        anonimleştirilir (satırlar kalır, kimlik bağı kopar); sipariş ve ödeme kayıtları yasal
        saklama gereği korunur.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <PInput
          placeholder="Ziyaretçi kimliği (nb_vid)"
          value={visitorId}
          onChange={(e) => setVisitorId(e.target.value)}
        />
        <PInput placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PButton variant="ghost" onClick={ara} disabled={yukleniyor || (!visitorId.trim() && !email.trim())}>
          Ara
        </PButton>
      </div>

      {sonuc && (
        <div className="mt-4 space-y-2 rounded-[4px] border border-[var(--p-line)] p-3 text-[12px]">
          <p>
            Analitik olay: <strong className="tabular-nums">{sonuc.olaySayisi}</strong>
            {sonuc.email && (
              <> · bu e-postayla sipariş: <strong className="tabular-nums">{sonuc.siparisSayisi}</strong></>
            )}
          </p>
          {sonuc.not && <p className="text-[var(--p-muted)]">{sonuc.not}</p>}

          {sonuc.rizalar.length > 0 ? (
            <ul className="space-y-1">
              {sonuc.rizalar.map((r, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 border-t border-[var(--p-line)] pt-1">
                  <span>
                    {new Date(r.occurred_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} · {r.source}
                  </span>
                  <span className="text-[var(--p-muted)]">
                    analitik-gelişmiş: {r.categories?.analitik_gelismis ? 'evet' : 'hayır'} · sürüm {r.version}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--p-muted)]">Bu kimliğe ait rıza kaydı bulunamadı.</p>
          )}

          {visitorId.trim() && sonuc.olaySayisi > 0 && (
            <PButton variant="danger" onClick={() => setOnayAcik(true)} className="mt-2">
              Bu kimliğin verilerini anonimleştir
            </PButton>
          )}
        </div>
      )}

      <PDialog
        open={onayAcik}
        onClose={() => setOnayAcik(false)}
        title="Veri silme talebi işlensin mi?"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setOnayAcik(false)}>Vazgeç</PButton>
            <PButton variant="danger" onClick={sil} disabled={yukleniyor}>
              {yukleniyor ? 'İşleniyor…' : 'Evet, anonimleştir'}
            </PButton>
          </>
        }
      >
        <p className="text-[13px] text-[var(--p-ink-soft)]">
          <strong>{sonuc?.olaySayisi ?? 0}</strong> analitik kaydın ziyaretçi kimliği kalıcı olarak
          silinecek. Kayıtlar anonim ölçüm olarak kalır; kişiye geri bağlanamaz. Bu işlem geri alınamaz.
        </p>
      </PDialog>
    </PCard>
  )
}
