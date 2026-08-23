'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PBadge, PButton, PCard, PInput, PSayfaNotu } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'

export type AboneSatiri = {
  id: string
  email: string
  tarih: string
  rizali: boolean
  aktif: boolean
  kaynak: string | null
}

export default function BultenClient({ satirlar }: { satirlar: AboneSatiri[] }) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [arama, setArama] = useState('')
  const [silinecek, setSilinecek] = useState<AboneSatiri | null>(null)
  const [isleniyor, setIsleniyor] = useState(false)

  const liste = useMemo(() => {
    const q = arama.trim().toLowerCase()
    if (!q) return satirlar
    return satirlar.filter((a) => a.email.toLowerCase().includes(q))
  }, [satirlar, arama])

  const csvIndir = () => {
    const satirlarCsv = [
      'e-posta;tarih;riza',
      ...satirlar.map(
        (a) =>
          `${a.email};${new Date(a.tarih).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })};${a.rizali ? 'evet' : 'hayir'}`
      ),
    ].join('\n')
    // Excel'in Türkçe karakterleri doğru açması için BOM
    const blob = new Blob([`﻿${satirlarCsv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulten-aboneleri-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sil = async () => {
    if (!silinecek) return
    setIsleniyor(true)
    try {
      const res = await fetch(`/api/panel/newsletter/${silinecek.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast('Abone silindi (KVKK)', 'success')
      setSilinecek(null)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PSayfaNotu>
        Bültene kayıt olan e-posta adresleri; rıza durumunu görür, listeyi dışa aktarır, silme talebi gelen adresi çıkarırsınız.
      </PSayfaNotu>
      <PCard>
        <p className="text-[13px] leading-relaxed text-[var(--p-ink-soft)]">
          📮 Toplu e-posta gönderimi bilinçli olarak panel dışında — İYS kaydı tamamlanınca
          ayrı dalga olarak eklenecek. Bu ekran yalnız abone listesini yönetir.
        </p>
      </PCard>

      <div className="flex flex-wrap items-center gap-2">
        <PInput
          placeholder="E-posta ara…"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <PButton variant="ghost" onClick={csvIndir} disabled={satirlar.length === 0}>
          <Download size={14} /> CSV indir ({satirlar.length})
        </PButton>
        <p className="ml-auto text-[12px] text-[var(--p-muted)]">
          {liste.length} abone{arama ? ' (filtreli)' : ''}
        </p>
      </div>

      {liste.length === 0 ? (
        <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-12 text-center text-[13px] text-[var(--p-muted)]">
          {satirlar.length === 0 ? 'Henüz abone yok.' : 'Aramayla eşleşen abone yok.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
                <th className="px-3 py-2.5 font-semibold">E-posta</th>
                <th className="px-3 py-2.5 font-semibold">Kayıt</th>
                <th className="px-3 py-2.5 font-semibold">Rıza</th>
                <th className="px-3 py-2.5 font-semibold hidden sm:table-cell">Kaynak</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => (
                <tr key={a.id} className="border-b border-[var(--p-line)]/60 last:border-0">
                  <td className="px-3 py-2.5">{a.email}</td>
                  <td className="px-3 py-2.5 text-[var(--p-muted)]">
                    {new Date(a.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <PBadge tone={a.rizali ? 'success' : 'warning'}>{a.rizali ? 'rızalı' : 'rıza yok'}</PBadge>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--p-muted)] hidden sm:table-cell">{a.kaynak ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <PButton variant="danger" onClick={() => setSilinecek(a)}>Sil</PButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PDialog
        open={silinecek !== null}
        onClose={() => setSilinecek(null)}
        title="Abone silinecek (KVKK)"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setSilinecek(null)}>Vazgeç</PButton>
            <PButton variant="danger" onClick={sil} disabled={isleniyor}>
              {isleniyor ? 'Siliniyor…' : 'Evet, sil'}
            </PButton>
          </>
        }
      >
        <p>
          <span className="font-medium">{silinecek?.email}</span> listeden kalıcı olarak
          silinecek. KVKK silme talebi için kullanılır; geri alınamaz.
        </p>
      </PDialog>
    </div>
  )
}
