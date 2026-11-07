'use client'

import { useState } from 'react'
import { PButton, PCard, PInput } from '../_components/ui'
import { useToast } from '../_components/overlays'
import type { HavaleAyari } from '@/lib/odeme/havale'

/** ISO → datetime-local (İstanbul, UTC+3 sabit). */
function yerel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(Date.parse(iso) + 3 * 3_600_000)
  return d.toISOString().slice(0, 16)
}
/** datetime-local (İstanbul) → ISO. */
function isoYap(yerelDeger: string): string | null {
  if (!yerelDeger) return null
  const t = Date.parse(`${yerelDeger}:00+03:00`)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

/**
 * Panel · Havale / EFT (7 Kas 2026).
 *
 * Kart ödemesi kapalıyken sitedeki tek ödeme yolu. Hesap sahibi sitedeki
 * satıcıyla aynı kişi olmalı. Ek indirim dönemi on gün kuralı yüzünden Kasım
 * indirimiyle aynı anda başlar (bkz. lib/odeme/havale.ts).
 */
export default function HavaleAyarKarti({ ayar }: { ayar: HavaleAyari | null }) {
  const { push: toast } = useToast()
  const [banka, setBanka] = useState(ayar?.banka ?? '')
  const [alici, setAlici] = useState(ayar?.alici ?? '')
  const [iban, setIban] = useState(ayar?.iban ?? '')
  const [oran, setOran] = useState(String(ayar?.indirimOrani ?? 0))
  const [bas, setBas] = useState(yerel(ayar?.indirimBaslangic ?? null))
  const [bit, setBit] = useState(yerel(ayar?.indirimBitis ?? null))
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kaydet = async () => {
    setKaydediliyor(true)
    try {
      const res = await fetch('/api/panel/odeme-ayarlari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banka,
          alici,
          iban,
          indirimOrani: Number(oran) || 0,
          indirimBaslangic: isoYap(bas),
          indirimBitis: isoYap(bit),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Kaydedilemedi')
      toast('Havale bilgileri kaydedildi — ödeme ekranı hemen güncellenir', 'success')
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydediliyor(false)
  }

  return (
    <PCard title="Havale / EFT">
      <p className="mb-3 text-[13px] text-[var(--p-ink-soft)]">
        Kartla ödeme kapalıyken müşteri bu hesaba havale/EFT ile öder. Hesap sahibi, sitedeki satıcı
        bilgisiyle aynı kişi olmalı. Para hesaba geçince siparişi açıp &quot;Ödeme geldi, onayla&quot;
        düğmesine basın.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[12px] text-[var(--p-muted)]">
          Banka
          <PInput value={banka} onChange={(e) => setBanka(e.target.value)} placeholder="Örn. Akbank" />
        </label>
        <label className="text-[12px] text-[var(--p-muted)]">
          Hesap sahibi
          <PInput value={alici} onChange={(e) => setAlici(e.target.value)} placeholder="Örn. İsa Bolat" />
        </label>
        <label className="text-[12px] text-[var(--p-muted)] sm:col-span-2">
          IBAN
          <PInput value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR.." inputMode="text" />
        </label>
        <label className="text-[12px] text-[var(--p-muted)]">
          Ek havale indirimi (%)
          <PInput value={oran} onChange={(e) => setOran(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" />
        </label>
        <div />
        <label className="text-[12px] text-[var(--p-muted)]">
          İndirim başlangıcı
          <PInput type="datetime-local" value={bas} onChange={(e) => setBas(e.target.value)} />
        </label>
        <label className="text-[12px] text-[var(--p-muted)]">
          İndirim bitişi
          <PInput type="datetime-local" value={bit} onChange={(e) => setBit(e.target.value)} />
        </label>
      </div>
      <p className="mt-3 rounded-[4px] bg-[var(--p-bg)] px-3 py-2 text-[12px] text-[var(--p-muted)]">
        Ek indirim yalnız sepette ve ödeme adımında görünür, ürün kartında görünmez. Bir indirim
        kampanyasından önceki on gün içinde başlatılırsa o kampanyanın üstü çizili fiyatı yasaya
        aykırı olur; bu yüzden Kasım indirimiyle aynı anda (11 Kasım 00.00) başlar ve onunla biter.
      </p>
      <div className="mt-3 flex justify-end">
        <PButton onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </PButton>
      </div>
    </PCard>
  )
}
