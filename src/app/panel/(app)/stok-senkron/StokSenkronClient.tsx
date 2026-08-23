'use client'

import { useState } from 'react'
import { PBadge, PButton, PCard, PSayfaNotu } from '../_components/ui'
import { useToast } from '../_components/overlays'

export type YazimSatiri = {
  id: string
  zaman: string
  barkod: string
  mod: string
  oncekiDeger: number | null
  yazilanDeger: number | null
  delta: number
  batch: string | null
  durum: string | null
  hata: string | null
}

const MOD_ACIKLAMA: Record<string, string> = {
  off: 'Kapalı — Trendyol’a hiç yazılmıyor, yalnız kendi stoğumuz güncelleniyor.',
  shadow: 'Gölge mod — ne yazılacağı hesaplanıp kaydediliyor, Trendyol’a gönderilmiyor.',
  whitelist: 'Beyaz liste — yalnız seçili barkodlara yazılıyor.',
  on: 'Açık — tüm katalog için Trendyol’a yazılıyor.',
}

export default function StokSenkronClient({
  mod,
  tabloYok,
  basarisiz,
  kayitlar,
}: {
  mod: string
  tabloYok: boolean
  basarisiz: number
  kayitlar: YazimSatiri[]
}) {
  const { push: toast } = useToast()
  const [yukleniyor, setYukleniyor] = useState(false)

  const tekrarla = async () => {
    setYukleniyor(true)
    try {
      const res = await fetch('/api/panel/stok-senkron', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'İşlem başarısız')
      toast(`${d.tekrarlanan ?? 0} kayıt yeniden kuyruğa alındı · ${d.sonuc?.islenen ?? 0} işlendi`, 'success')
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setYukleniyor(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PSayfaNotu>
        Sitede satılan ürünün stoğu Trendyol’a geri yazılır; yazılamayan kalem burada görünür ve yeniden denenebilir.
      </PSayfaNotu>
      <PCard title="Trendyol stok yazımı">
        <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
          Kademe: <strong className="text-[var(--p-ink)]">{mod}</strong> — {MOD_ACIKLAMA[mod] ?? ''}
          {' '}Yazılacak değer her seferinde <strong>Trendyol’daki canlı stok</strong> okunup üstüne
          satılan/iade edilen adet uygulanarak bulunur; bizim bayat değerimiz mutlak olarak
          yazılmaz.
        </p>

        {tabloYok && (
          <p className="rounded-[4px] border border-[var(--p-danger)] bg-[#FDECEC] p-3 text-[12px] text-[var(--p-ink)]">
            Kuyruk tabloları henüz kurulmadı (<code>docs/stok-senkronu/01-tablolar.sql</code>).
            Kuyruk çalışmıyor; sipariş akışı etkilenmez.
          </p>
        )}

        {basarisiz > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <PBadge tone="danger">{basarisiz} kayıt yazılamadı</PBadge>
            <PButton variant="danger" onClick={tekrarla} disabled={yukleniyor}>
              {yukleniyor ? 'Deneniyor…' : 'Tekrar dene'}
            </PButton>
          </div>
        )}
      </PCard>

      <PCard title={`Son yazımlar (${kayitlar.length})`}>
        {kayitlar.length === 0 ? (
          <p className="text-[12px] text-[var(--p-muted)]">Henüz kayıt yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12px]">
              <thead className="text-[var(--p-muted)]">
                <tr className="border-b border-[var(--p-line)]">
                  <th className="px-2 py-2 text-left">Zaman</th>
                  <th className="px-2 py-2 text-left">Barkod</th>
                  <th className="px-2 py-2 text-right">Önceki</th>
                  <th className="px-2 py-2 text-right">Delta</th>
                  <th className="px-2 py-2 text-right">Yazılan</th>
                  <th className="px-2 py-2 text-left">Durum</th>
                  <th className="px-2 py-2 text-left">Batch</th>
                </tr>
              </thead>
              <tbody>
                {kayitlar.map((k) => {
                  const hatali = k.durum === 'FAILED' || Boolean(k.hata)
                  return (
                    <tr
                      key={k.id}
                      className={`border-b border-[var(--p-line)] ${hatali ? 'bg-[#FDECEC]' : ''}`}
                    >
                      <td className="px-2 py-2 tabular-nums">
                        {new Date(k.zaman).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </td>
                      <td className="px-2 py-2 font-medium">{k.barkod}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{k.oncekiDeger ?? '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {k.delta > 0 ? `+${k.delta}` : k.delta}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{k.yazilanDeger ?? '—'}</td>
                      <td className="px-2 py-2">
                        <span className={hatali ? 'text-[var(--p-danger)]' : ''}>
                          {k.durum === 'GOLGE' ? 'gölge (yazılmadı)' : (k.durum ?? '—')}
                        </span>
                        {k.hata && <span className="block text-[11px] text-[var(--p-danger)]">{k.hata}</span>}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[var(--p-muted)]">
                        {k.batch ? k.batch.slice(0, 12) + '…' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PCard>
    </div>
  )
}
