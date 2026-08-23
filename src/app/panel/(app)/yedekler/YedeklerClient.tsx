'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Download, DatabaseBackup } from 'lucide-react'
import { PBadge, PButton, PCard, PSayfaNotu } from '../_components/ui'
import { useToast } from '../_components/overlays'

export type YedekSatiri = {
  ad: string
  boyut: number
  tarih: string | null
  indirmeUrl: string | null
}

function boyutYaz(bayt: number): string {
  if (bayt <= 0) return '—'
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`
  return `${(bayt / 1024 / 1024).toFixed(2)} MB`
}

export default function YedeklerClient({
  satirlar,
  hata,
  imzaDakika,
}: {
  satirlar: YedekSatiri[]
  hata: string | null
  imzaDakika: number
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [kosuyor, setKosuyor] = useState(false)
  const [sonSonuc, setSonSonuc] = useState<string | null>(null)

  const yedekAl = async () => {
    if (kosuyor) return
    setKosuyor(true)
    setSonSonuc(null)
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSonSonuc(
        `${data.tablolar} tablo · ${data.toplam_satir} satır · ${boyutYaz(data.sikistirilmis_bayt)} · ${Math.round((data.sure_ms ?? 0) / 1000)} sn`
      )
      toast('Yedek alındı', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message || 'Yedek alınamadı', 'danger')
    }
    setKosuyor(false)
  }

  const sonYedek = satirlar[0]
  const gunFarki = sonYedek?.tarih
    ? Math.floor((Date.now() - new Date(sonYedek.tarih).getTime()) / 86_400_000)
    : null

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PSayfaNotu>
        Mağaza verisinin haftalık yedekleri burada tutulur; dilediğiniz an yeni yedek alır, eski bir yedeği indirirsiniz.
      </PSayfaNotu>
      <PCard>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--p-ink)]">Veritabanı yedekleri</p>
            <p className="text-[12px] text-[var(--p-muted)]">
              {satirlar.length} yedek saklanıyor · otomatik koşu her pazar 04:00 · son 8 hafta tutulur
            </p>
          </div>
          <PButton className="ml-auto" onClick={yedekAl} disabled={kosuyor}>
            <DatabaseBackup size={14} className={kosuyor ? 'animate-pulse' : ''} />
            {kosuyor ? 'Yedekleniyor… (~30 sn)' : 'Şimdi yedek al'}
          </PButton>
        </div>

        {sonSonuc && (
          <p className="mt-3 rounded-[4px] bg-[var(--p-success-bg)] px-3 py-2 text-[12px] text-[var(--p-success)]">
            {sonSonuc}
          </p>
        )}

        {gunFarki != null && gunFarki > 8 && (
          <p className="mt-3 rounded-[4px] bg-[var(--p-warning-bg)] px-3 py-2 text-[12px] text-[var(--p-warning)]">
            Son yedek {gunFarki} gün önce alınmış — haftalık koşu çalışmıyor olabilir.
          </p>
        )}

        {satirlar.length === 0 && !hata && (
          <p className="mt-3 rounded-[4px] bg-[var(--p-warning-bg)] px-3 py-2 text-[12px] text-[var(--p-warning)]">
            Henüz hiç yedek yok. &quot;Şimdi yedek al&quot; ile ilkini oluşturabilirsiniz.
          </p>
        )}

        {hata && (
          <p className="mt-3 rounded-[4px] bg-[var(--p-danger-bg)] px-3 py-2 text-[12px] text-[var(--p-danger)]">
            Yedek listesi okunamadı: {hata}
          </p>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--p-muted)]">
          Yedek dosyaları müşteri e-postası, açık adres ve kimlik bilgisi içerir; bu yüzden
          depolama alanı gizlidir ve indirme bağlantıları {imzaDakika} dakika sonra geçersiz olur.
          Geri yükleme yordamı: <code>docs/yedekleme.md</code>
        </p>
      </PCard>

      <div className="overflow-x-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
              <th className="px-3 py-2.5 font-semibold">Tarih</th>
              <th className="px-3 py-2.5 font-semibold">Dosya</th>
              <th className="px-3 py-2.5 text-right font-semibold">Boyut</th>
              <th className="px-3 py-2.5 text-right font-semibold">İndir</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((y, i) => (
              <tr key={y.ad} className="border-b border-[var(--p-line)]/60 last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--p-ink-soft)]">
                  {y.tarih
                    ? new Date(y.tarih).toLocaleString('tr-TR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Europe/Istanbul',
                      })
                    : '—'}
                  {i === 0 && (
                    <span className="ml-2 inline-block align-middle">
                      <PBadge tone="success">en yeni</PBadge>
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--p-muted)]">{y.ad}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{boyutYaz(y.boyut)}</td>
                <td className="px-3 py-2.5 text-right">
                  {y.indirmeUrl ? (
                    <a
                      href={y.indirmeUrl}
                      className="inline-flex items-center gap-1 text-[var(--p-accent-deep)] hover:underline"
                    >
                      <Download size={13} /> indir
                    </a>
                  ) : (
                    <span className="text-[var(--p-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {satirlar.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">Henüz yedek yok.</p>
        )}
      </div>
    </div>
  )
}
