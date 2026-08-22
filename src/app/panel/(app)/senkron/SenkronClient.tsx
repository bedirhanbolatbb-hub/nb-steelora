'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { PBadge, PButton, PCard, type BadgeTone } from '../_components/ui'
import { useToast } from '../_components/overlays'

export type KosuSatiri = {
  id: string
  durum: string
  baslangic: string
  sureSn: number | null
  sayfa: number
  eklenen: number
  guncellenen: number
  hata: string | null
}

const DURUM: Record<string, { label: string; tone: BadgeTone }> = {
  success: { label: 'Başarılı', tone: 'success' },
  partial: { label: 'Kısmi', tone: 'warning' },
  running: { label: 'Çalışıyor', tone: 'accent' },
  failed: { label: 'BAŞARISIZ', tone: 'danger' },
}

export default function SenkronClient({
  kosular,
  aktifUrun,
  pasifUrun,
  trendyolKarti,
  varyantSatiri,
  varyantGrubu,
}: {
  kosular: KosuSatiri[]
  aktifUrun: number
  pasifUrun: number
  trendyolKarti: number
  varyantSatiri: number
  varyantGrubu: number
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [kosuyor, setKosuyor] = useState(false)
  const [sonSonuc, setSonSonuc] = useState<string | null>(null)

  const tetikle = async () => {
    if (kosuyor) return // çift tıklama koruması
    setKosuyor(true)
    setSonSonuc(null)
    try {
      // Mevcut manuel tetik: admin çerezli POST /api/sync — koşunun tamamı
      // tek istekte işlenir (~20 sn), yanıt sonucu döndürür.
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.skipped) {
        toast('Zaten süren bir koşu var; birkaç dakika sonra deneyin.', 'danger')
      } else {
        setSonSonuc(
          `${data.pages_done} sayfa · ${data.products_updated} güncellendi · ${Math.round((data.duration_ms ?? 0) / 1000)} sn · ${data.status}`
        )
        toast('Senkron tamamlandı', 'success')
      }
      router.refresh()
    } catch (e: any) {
      toast(e.message || 'Senkron başarısız', 'danger')
    }
    setKosuyor(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PCard>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--p-ink)]">Trendyol senkronu</p>
            <p className="text-[12px] text-[var(--p-muted)]">
              Aktif ürün: {aktifUrun} · pasif: {pasifUrun} · otomatik koşu her gün 09:00 (cron)
            </p>
          </div>
          <PButton className="ml-auto" onClick={tetikle} disabled={kosuyor}>
            <RefreshCcw size={14} className={kosuyor ? 'animate-spin' : ''} />
            {kosuyor ? 'Senkronize ediliyor… (~20 sn)' : 'Şimdi senkronize et'}
          </PButton>
        </div>
        {varyantSatiri > varyantGrubu && (
          <p className="mt-3 rounded-[4px] border border-[var(--p-line)] px-3 py-2 text-[12px] leading-relaxed text-[var(--p-muted)]">
            Trendyol panelinde <strong>{trendyolKarti}</strong> ürün görünür, bizde{' '}
            <strong>{aktifUrun}</strong> satır var — <strong>eksik ürün yok</strong>. Trendyol
            beden varyantlarını tek kart sayıyor; bizde her barkod ayrı satır. Şu an{' '}
            {varyantSatiri} varyant satırı {varyantGrubu} karta denk geliyor ({aktifUrun} −{' '}
            {varyantSatiri} + {varyantGrubu} = {trendyolKarti}).
          </p>
        )}
        {sonSonuc && (
          <p className="mt-3 rounded-[4px] bg-[var(--p-success-bg)] px-3 py-2 text-[12px] text-[var(--p-success)]">
            {sonSonuc}
          </p>
        )}
      </PCard>

      <div className="overflow-x-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
              <th className="px-3 py-2.5 font-semibold">Tarih</th>
              <th className="px-3 py-2.5 font-semibold">Durum</th>
              <th className="px-3 py-2.5 text-right font-semibold">Sayfa</th>
              <th className="px-3 py-2.5 text-right font-semibold">Güncellenen</th>
              <th className="px-3 py-2.5 text-right font-semibold">Süre</th>
            </tr>
          </thead>
          <tbody>
            {kosular.map((k) => {
              const d = DURUM[k.durum] ?? { label: k.durum, tone: 'neutral' as const }
              return (
                <tr key={k.id} className="border-b border-[var(--p-line)]/60 last:border-0 align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap text-[var(--p-ink-soft)]">
                    {new Date(k.baslangic).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <PBadge tone={d.tone}>{d.label}</PBadge>
                    {k.hata && <p className="mt-1 max-w-[280px] text-[11px] text-[var(--p-warning)]">{k.hata}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{k.sayfa}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {k.guncellenen}
                    {k.eklenen > 0 && <span className="text-[var(--p-success)]"> +{k.eklenen}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[var(--p-muted)]">
                    {k.sureSn != null ? `${k.sureSn} sn` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {kosular.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">Henüz koşu yok.</p>
        )}
      </div>
    </div>
  )
}
