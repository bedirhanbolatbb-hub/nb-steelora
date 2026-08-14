'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { PBadge, PButton, PCard } from '../_components/ui'
import { useToast } from '../_components/overlays'
import ProductPicker, { type PickerUrun } from '../_components/ProductPicker'

export type KurasyonUrun = {
  id: string
  slug: string
  title: string
  barcode: string | null
  image: string | null
  stock: number
  active: boolean
}

const TEKLI = [
  { key: 'hero_top', label: 'Hero — üst geniş görsel' },
  { key: 'hero_bottom_left', label: 'Hero — alt sol' },
  { key: 'hero_bottom_right', label: 'Hero — alt sağ' },
] as const

/** Kategori kartı görselleri — seçilen ürünün ilk görseli kartta basılır. */
const KATEGORILER = [
  { key: 'category_kolye', label: 'Kategori — Kolye' },
  { key: 'category_kupe', label: 'Kategori — Küpe' },
  { key: 'category_bileklik', label: 'Kategori — Bileklik' },
  { key: 'category_yuzuk', label: 'Kategori — Yüzük' },
  { key: 'category_piercing', label: 'Kategori — Piercing' },
  { key: 'category_erkek', label: 'Kategori — Erkek' },
  { key: 'category_setler', label: 'Kategori — Setler' },
] as const

const COKLU = [
  { key: 'featured', label: 'Öne Çıkanlar' },
  { key: 'new_arrivals', label: 'Yeni Gelenler' },
] as const

function UrunUyari({ u }: { u: KurasyonUrun | undefined }) {
  if (!u) return null
  if (!u.active) return <PBadge tone="warning">pasif — vitrinde görünmez</PBadge>
  if (u.stock === 0) return <PBadge tone="warning">stoksuz</PBadge>
  return null
}

export default function KurasyonClient({
  bolumler,
  urunler,
}: {
  bolumler: Record<string, string[]>
  urunler: Record<string, KurasyonUrun>
}) {
  const router = useRouter()
  const { push: toast } = useToast()

  // Yerel durum: bölüm → id listesi; seçici hangi bölüm için açık.
  const [state, setState] = useState<Record<string, string[]>>(bolumler)
  const [cache, setCache] = useState<Record<string, KurasyonUrun>>(urunler)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [kaydedilen, setKaydedilen] = useState<string | null>(null)

  const degisti = (key: string) => JSON.stringify(state[key]) !== JSON.stringify(bolumler[key])

  const kaydet = async (key: string) => {
    setKaydedilen(key)
    try {
      const res = await fetch('/api/panel/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: key, product_ids: state[key] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Kaydedildi — vitrin birkaç dakika içinde güncellenir (önbellek).', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydedilen(null)
  }

  const sec = (u: PickerUrun) => {
    const key = pickerFor
    if (!key) return
    setCache((c) => ({ ...c, [u.id]: u }))
    setState((s) => {
      const tekli = TEKLI.some((t) => t.key === key) || KATEGORILER.some((t) => t.key === key)
      const mevcut = s[key] || []
      if (tekli) return { ...s, [key]: [u.id] }
      if (mevcut.includes(u.id)) return s
      return { ...s, [key]: [...mevcut, u.id] }
    })
    setPickerFor(null)
  }

  const tasi = (key: string, i: number, yon: -1 | 1) => {
    const list = state[key]
    const j = i + yon
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setState({ ...state, [key]: next })
  }

  const KaydetSatiri = ({ bolum }: { bolum: string }) =>
    degisti(bolum) ? (
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--p-line)] pt-3">
        <PButton variant="ghost" onClick={() => setState((s) => ({ ...s, [bolum]: bolumler[bolum] }))}>
          Geri al
        </PButton>
        <PButton onClick={() => kaydet(bolum)} disabled={kaydedilen === bolum}>
          {kaydedilen === bolum ? 'Kaydediliyor…' : 'Kaydet'}
        </PButton>
      </div>
    ) : null

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <p className="text-[13px] text-[var(--p-muted)]">
        Anasayfa küratörlü alanları. Kayıt sonrası vitrin birkaç dakika içinde güncellenir (önbellek).
      </p>

      {/* ── Hero (tekli seçim, görsel önizlemeli) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {TEKLI.map((t) => {
          const id = state[t.key]?.[0]
          const u = id ? cache[id] : undefined
          return (
            <PCard key={t.key} title={t.label}>
              <div className="space-y-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                  {u?.image ? (
                    <Image src={u.image} alt="" fill sizes="320px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--p-muted)]">
                      Ürün seçilmedi
                    </span>
                  )}
                </div>
                {u && (
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--p-ink)]">{u.title}</p>
                    <UrunUyari u={u} />
                  </div>
                )}
                <PButton variant="ghost" onClick={() => setPickerFor(t.key)} className="w-full">
                  <RefreshCcw size={13} /> {u ? 'Değiştir' : 'Ürün seç'}
                </PButton>
                <KaydetSatiri bolum={t.key} />
              </div>
            </PCard>
          )
        })}
      </div>

      {/* ── Sıralı çoklu listeler ── */}
      {COKLU.map((c) => (
        <PCard
          key={c.key}
          title={`${c.label} (${state[c.key]?.length ?? 0})`}
          action={
            <PButton variant="ghost" onClick={() => setPickerFor(c.key)}>
              <Plus size={14} /> Ekle
            </PButton>
          }
        >
          {(state[c.key] || []).length === 0 ? (
            <p className="rounded-[4px] border border-dashed border-[var(--p-line)] px-3 py-6 text-center text-[12px] text-[var(--p-muted)]">
              Ürün seçilmedi — vitrin bu bölümü otomatik doldurur.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {(state[c.key] || []).map((id, i) => {
                const u = cache[id]
                return (
                  <li key={id} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--p-line)] p-2 sm:flex-nowrap sm:gap-3">
                    <span className="w-5 text-center text-[11px] tabular-nums text-[var(--p-muted)]">{i + 1}</span>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                      {u?.image && <Image src={u.image} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--p-ink)]">{u?.title ?? id}</span>
                      <span className="text-[11px] text-[var(--p-muted)]">{u?.barcode ?? ''}</span>
                    </span>
                    <UrunUyari u={u} />
                    <span className="flex shrink-0 items-center gap-1">
                      <button onClick={() => tasi(c.key, i, -1)} disabled={i === 0} aria-label="Yukarı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowUp size={14} /></button>
                      <button onClick={() => tasi(c.key, i, 1)} disabled={i === (state[c.key]?.length ?? 0) - 1} aria-label="Aşağı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowDown size={14} /></button>
                      <button onClick={() => setState((s) => ({ ...s, [c.key]: s[c.key].filter((x) => x !== id) }))} aria-label="Çıkar" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)]"><Trash2 size={14} /></button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <KaydetSatiri bolum={c.key} />
        </PCard>
      ))}

      {/* ── Kategori kartı görselleri ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KATEGORILER.map((t) => {
          const id = state[t.key]?.[0]
          const u = id ? cache[id] : undefined
          return (
            <PCard key={t.key} title={t.label}>
              <div className="space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                  {u?.image ? (
                    <Image src={u.image} alt="" fill sizes="200px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--p-muted)]">
                      Otomatik
                    </span>
                  )}
                </div>
                <PButton variant="ghost" onClick={() => setPickerFor(t.key)} className="w-full">
                  {u ? 'Değiştir' : 'Seç'}
                </PButton>
                <KaydetSatiri bolum={t.key} />
              </div>
            </PCard>
          )
        })}
      </div>

      <ProductPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={sec}
        disabledIds={pickerFor ? state[pickerFor] ?? [] : []}
      />
    </div>
  )
}
