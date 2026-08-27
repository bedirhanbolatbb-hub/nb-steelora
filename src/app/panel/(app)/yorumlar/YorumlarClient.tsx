'use client'

import Image from 'next/image'
import { isRemoteMedia } from '@/lib/images'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PBadge, PButton, PSayfaNotu } from '../_components/ui'
import { PDialog, PTabs, useToast } from '../_components/overlays'

export type YorumSatiri = {
  id: string
  urunAd: string
  urunSlug: string | null
  urunGorsel: string | null
  puan: number
  baslik: string | null
  metin: string
  gonderen: string
  email: string
  dogrulanmis: boolean
  onayli: boolean
  foto?: string | null
  tarih: string
}

export default function YorumlarClient({ satirlar }: { satirlar: YorumSatiri[] }) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [tab, setTab] = useState('bekleyen')
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [silinecek, setSilinecek] = useState<string[] | null>(null)
  const [isleniyor, setIsleniyor] = useState(false)

  const liste = satirlar.filter((y) => (tab === 'bekleyen' ? !y.onayli : y.onayli))
  const bekleyen = satirlar.filter((y) => !y.onayli).length
  const onayli = satirlar.length - bekleyen

  const toggle = (id: string) =>
    setSecili((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Mevcut moderasyon ucu tekil çalışır; toplu işlem sıralı çağrıdır.
  const onayla = async (ids: string[]) => {
    setIsleniyor(true)
    let ok = 0
    for (const id of ids) {
      const res = await fetch(`/api/admin/campaigns/${id}?type=review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: true }),
      })
      if (res.ok) ok++
    }
    toast(`${ok} yorum onaylandı — ürün sayfalarında görünür`, ok > 0 ? 'success' : 'danger')
    setSecili(new Set())
    router.refresh()
    setIsleniyor(false)
  }

  const sil = async (ids: string[]) => {
    setIsleniyor(true)
    let ok = 0
    for (const id of ids) {
      const res = await fetch(`/api/admin/campaigns/${id}?type=review`, { method: 'DELETE' })
      if (res.ok) ok++
    }
    toast(`${ok} yorum silindi`, ok > 0 ? 'success' : 'danger')
    setSilinecek(null)
    setSecili(new Set())
    router.refresh()
    setIsleniyor(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PSayfaNotu>
        Müşterilerin bıraktığı ürün yorumları önce burada bekler; onayladığınız yorum ürün sayfasında görünür, uygunsuz olanı silersiniz.
      </PSayfaNotu>
      <PTabs
        tabs={[
          { id: 'bekleyen', label: `Bekleyen (${bekleyen})` },
          { id: 'onayli', label: `Onaylı (${onayli})` },
        ]}
        value={tab}
        onChange={(id) => {
          setTab(id)
          setSecili(new Set())
        }}
      />

      {secili.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--p-accent-line)]/40 bg-[#f5efe2] px-3 py-2">
          <p className="text-[13px] font-medium">{secili.size} seçili</p>
          {tab === 'bekleyen' && (
            <PButton variant="ghost" disabled={isleniyor} onClick={() => onayla([...secili])}>
              Toplu onayla
            </PButton>
          )}
          <PButton variant="danger" disabled={isleniyor} onClick={() => setSilinecek([...secili])}>
            Toplu sil
          </PButton>
          <button onClick={() => setSecili(new Set())} className="ml-auto text-[12px] text-[var(--p-muted)]">
            Vazgeç
          </button>
        </div>
      )}

      {liste.length === 0 && (
        <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-12 text-center text-[13px] text-[var(--p-muted)]">
          {tab === 'bekleyen' ? 'Onay bekleyen yorum yok.' : 'Onaylı yorum yok.'}
        </p>
      )}

      <div className="space-y-2">
        {liste.map((y) => (
          <div
            key={y.id}
            className={cn(
              'rounded-[6px] border bg-[var(--p-surface)] p-3',
              secili.has(y.id) ? 'border-[var(--p-accent-line)]' : 'border-[var(--p-line)]'
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={secili.has(y.id)}
                onChange={() => toggle(y.id)}
                aria-label="Seç"
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--p-accent-line)]"
              />
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                {y.urunGorsel && (
                  <Image src={y.urunGorsel} unoptimized={isRemoteMedia(y.urunGorsel)} alt="" width={44} height={44} sizes="44px" className="h-11 w-11 object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {y.urunSlug ? (
                    <a href={`/urun/${y.urunSlug}#yorum`} target="_blank" rel="noopener noreferrer" className="truncate text-[13px] font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-deep)]">
                      {y.urunAd} <ExternalLink size={11} className="mb-0.5 inline" />
                    </a>
                  ) : (
                    <span className="text-[13px] font-medium">{y.urunAd}</span>
                  )}
                  <span className="flex items-center gap-0.5 text-[var(--p-accent-line)]">
                    {Array.from({ length: y.puan }, (_, i) => (
                      <Star key={i} size={12} fill="currentColor" />
                    ))}
                  </span>
                  {y.dogrulanmis && <PBadge tone="success">doğrulanmış alışveriş</PBadge>}
                </div>
                {y.baslik && <p className="mt-1 text-[13px] font-medium">{y.baslik}</p>}
                <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--p-ink-soft)]">{y.metin}</p>
                {/* Müşteri fotoğrafı (Faz 11D): onaylamadan önce panelde görülür;
                    uygunsuzsa "Sil" akışı yorumu ve dosyayı birlikte kaldırır. */}
                {y.foto && (
                  <a href={y.foto} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={y.foto} alt="Müşteri fotoğrafı" className="h-16 w-16 rounded-[4px] border border-[var(--p-line)] object-cover" />
                  </a>
                )}
                <p className="mt-1.5 text-[11px] text-[var(--p-muted)]">
                  {y.gonderen} · {y.email} ·{' '}
                  {new Date(y.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {!y.onayli && (
                  <PButton variant="ghost" disabled={isleniyor} onClick={() => onayla([y.id])}>
                    Onayla
                  </PButton>
                )}
                <PButton variant="danger" disabled={isleniyor} onClick={() => setSilinecek([y.id])}>
                  Sil
                </PButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PDialog
        open={silinecek !== null}
        onClose={() => setSilinecek(null)}
        title={`${silinecek?.length ?? 0} yorum silinecek`}
        footer={
          <>
            <PButton variant="ghost" onClick={() => setSilinecek(null)}>Vazgeç</PButton>
            <PButton variant="danger" onClick={() => silinecek && sil(silinecek)} disabled={isleniyor}>
              {isleniyor ? 'Siliniyor…' : 'Evet, sil'}
            </PButton>
          </>
        }
      >
        <p>Silme geri alınamaz; ürünün puan özeti yeniden hesaplanır.</p>
      </PDialog>
    </div>
  )
}
