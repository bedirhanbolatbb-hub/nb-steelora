'use client'

import { useEffect, useState } from 'react'
import { PButton, PCard, PInput } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'

type Sonuc = {
  visitorId: string | null
  email: string | null
  hesap: { id: string; eposta: string } | null
  rizalar: { categories: any; version: string; occurred_at: string; source: string }[]
  olaySayisi: number
  siparisSayisi: number
  not: string | null
}

type Silme = { kimlik: string; zaman: string; surum: string }

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
  const [hesapOnayAcik, setHesapOnayAcik] = useState(false)
  const [silmeler, setSilmeler] = useState<Silme[]>([])

  const silmeleriYukle = async () => {
    try {
      const res = await fetch('/api/panel/kvkk?silmeler=1')
      const data = await res.json()
      if (res.ok) setSilmeler(data.silmeler ?? [])
    } catch {
      // Liste ikincil bilgi; hata durumunda blok yine de çalışır.
    }
  }

  useEffect(() => {
    silmeleriYukle()
  }, [])

  // E-postayla gelen silme talebi — müşterinin kendi sildiği akışla aynı
  // işleyiciyi çağırır (/api/account/delete ile ortak: lib/account/hesapSilme).
  const hesabiSil = async () => {
    setYukleniyor(true)
    try {
      const res = await fetch('/api/panel/kvkk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eposta: sonuc?.hesap?.eposta, visitor_id: visitorId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')
      toast(
        `Hesap silindi · ${data.ozet.anonimlestirilenSiparis} sipariş anonimleştirildi`,
        'success'
      )
      setHesapOnayAcik(false)
      setSonuc(null)
      silmeleriYukle()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setYukleniyor(false)
  }

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

          {sonuc.hesap && (
            <p className="border-t border-[var(--p-line)] pt-1">
              Bu e-postaya bağlı bir <strong>üyelik</strong> var. Silme talebini burada
              işleyebilirsiniz: kişisel kayıtlar silinir, sipariş satırları anonimleştirilir.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            {visitorId.trim() && sonuc.olaySayisi > 0 && (
              <PButton variant="danger" onClick={() => setOnayAcik(true)}>
                Bu kimliğin verilerini anonimleştir
              </PButton>
            )}
            {sonuc.hesap && (
              <PButton variant="danger" onClick={() => setHesapOnayAcik(true)}>
                Hesabı sil ve verileri anonimleştir
              </PButton>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-[var(--p-line)] pt-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--p-muted)]">
          Son hesap silmeleri
        </p>
        {silmeler.length === 0 ? (
          <p className="text-[12px] text-[var(--p-muted)]">Kayıtlı hesap silme talebi yok.</p>
        ) : (
          <ul className="space-y-1 text-[12px]">
            {silmeler.map((s, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-t border-[var(--p-line)] pt-1">
                <span className="tabular-nums">
                  {new Date(s.zaman).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                </span>
                <span className="text-[var(--p-muted)]">kimlik {s.kimlik}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--p-muted)]">
          Kayıtlarda ad, e-posta ya da sipariş bilgisi tutulmaz; yalnız geri döndürülemez kimlik
          özeti ve zaman saklanır.
        </p>
      </div>

      <PDialog
        open={hesapOnayAcik}
        onClose={() => setHesapOnayAcik(false)}
        title="Hesap silinsin mi?"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setHesapOnayAcik(false)}>Vazgeç</PButton>
            <PButton variant="danger" onClick={hesabiSil} disabled={yukleniyor}>
              {yukleniyor ? 'İşleniyor…' : 'Evet, sil'}
            </PButton>
          </>
        }
      >
        <p className="text-[13px] text-[var(--p-ink-soft)]">
          <strong>{sonuc?.hesap?.eposta}</strong> hesabı silinecek: profil, adres, fatura, favori
          kayıtları kaldırılır; sipariş satırları kişisel alanları maskelenerek korunur (mali
          saklama yükümlülüğü). Teslim edilmemiş siparişi varsa işlem reddedilir. Geri alınamaz.
        </p>
      </PDialog>

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
