'use client'

import Image from 'next/image'
import { isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { PBadge, PButton, PInput, PSelect } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'

export type UrunSatiri = {
  id: string
  slug: string
  title: string
  tyTitle: string
  barcode: string | null
  category: string | null
  price: number
  stock: number
  active: boolean
  badge: string | null
  featured: boolean
  hasOverride: boolean
  image: string | null
}

type Params = {
  q: string
  kategori: string
  gender: string
  durum: string
  stok: string
  isaret: string
  sira: string
}

/** Satır rozetleri — liste ve mobil kartta aynı. */
function DurumRozetleri({ p }: { p: UrunSatiri }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {!p.active && <PBadge tone="danger">pasif</PBadge>}
      {p.active && p.stock === 1 && <PBadge tone="warning">stok 1</PBadge>}
      {p.badge && <PBadge tone="accent">{p.badge}</PBadge>}
      {p.featured && <PBadge tone="accent">öne çıkan</PBadge>}
      {p.hasOverride && <PBadge tone="neutral">override</PBadge>}
    </span>
  )
}

export default function UrunlerClient({
  satirlar,
  toplam,
  sayfa,
  sayfaBoyu,
  kategoriler,
  params,
}: {
  satirlar: UrunSatiri[]
  toplam: number
  sayfa: number
  sayfaBoyu: number
  kategoriler: string[]
  params: Params
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { push: toast } = useToast()

  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [filtreSheet, setFiltreSheet] = useState(false)
  const [rozetDialog, setRozetDialog] = useState(false)
  const [rozetMetni, setRozetMetni] = useState('')
  const [isleniyor, setIsleniyor] = useState(false)
  const [arama, setArama] = useState(params.q)
  const aramaZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filtre/sayfa değişince seçim sıfırlanır — görünmeyen satıra işlem yapılmasın.
  useEffect(() => setSecili(new Set()), [satirlar])

  const guncelle = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!('sayfa' in updates)) next.delete('sayfa')
      router.push(`${pathname}?${next.toString()}`)
    },
    [sp, pathname, router]
  )

  const aramaDegisti = (value: string) => {
    setArama(value)
    if (aramaZamanlayici.current) clearTimeout(aramaZamanlayici.current)
    aramaZamanlayici.current = setTimeout(() => guncelle({ q: value.trim() }), 350)
  }

  const hepsiSecili = satirlar.length > 0 && satirlar.every((p) => secili.has(p.id))
  const toggleHepsi = () =>
    setSecili(hepsiSecili ? new Set() : new Set(satirlar.map((p) => p.id)))
  const toggle = (id: string) =>
    setSecili((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const topluIslem = async (action: string, badge?: string) => {
    setIsleniyor(true)
    try {
      const res = await fetch('/api/panel/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...secili], action, badge }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')
      toast(`${data.updated} ürün güncellendi`, 'success')
      setRozetDialog(false)
      setRozetMetni('')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const toplamSayfa = Math.max(1, Math.ceil(toplam / sayfaBoyu))

  const filtreler = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
      <PSelect value={params.kategori} onChange={(e) => guncelle({ kategori: e.target.value })} aria-label="Kategori">
        <option value="">Kategori: tümü</option>
        {kategoriler.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </PSelect>
      <PSelect value={params.gender} onChange={(e) => guncelle({ gender: e.target.value })} aria-label="Gender">
        <option value="">Gender: tümü</option>
        <option value="women">Kadın</option>
        <option value="men">Erkek</option>
        <option value="bos">Boş</option>
      </PSelect>
      <PSelect value={params.durum} onChange={(e) => guncelle({ durum: e.target.value })} aria-label="Durum">
        <option value="">Durum: tümü</option>
        <option value="aktif">Aktif</option>
        <option value="pasif">Pasif</option>
      </PSelect>
      <PSelect value={params.stok} onChange={(e) => guncelle({ stok: e.target.value })} aria-label="Stok">
        <option value="">Stok: tümü</option>
        <option value="1">Stok 1</option>
        <option value="tukenen">Tükenen</option>
      </PSelect>
      <PSelect value={params.isaret} onChange={(e) => guncelle({ isaret: e.target.value })} aria-label="İşaret">
        <option value="">İşaret: tümü</option>
        <option value="rozetli">Rozetli</option>
        <option value="one-cikan">Öne çıkan</option>
        <option value="override">Override&apos;lı</option>
      </PSelect>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {/* Arama + sıralama + mobil filtre girişi */}
      <div className="flex flex-wrap items-center gap-2">
        <PInput
          placeholder="Ara: ad, Trendyol adı, barkod…"
          value={arama}
          onChange={(e) => aramaDegisti(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <PSelect
          value={params.sira}
          onChange={(e) => guncelle({ sira: e.target.value })}
          className="w-auto"
          aria-label="Sıralama"
        >
          <option value="">Güncellenme (yeni)</option>
          <option value="ad">Ada göre</option>
          <option value="fiyat">Fiyat (yüksek)</option>
          <option value="stok">Stok (az)</option>
        </PSelect>
        <button
          onClick={() => setFiltreSheet(true)}
          className="flex min-h-[44px] items-center gap-1.5 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] px-3 text-[13px] sm:hidden"
        >
          <SlidersHorizontal size={14} /> Filtreler
        </button>
        <p className="ml-auto text-[12px] text-[var(--p-muted)]">{toplam} ürün</p>
      </div>

      <div className="hidden sm:block">{filtreler}</div>

      {/* Toplu işlem çubuğu */}
      {secili.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--p-accent)]/40 bg-[#f5efe2] px-3 py-2">
          <p className="text-[13px] font-medium text-[var(--p-ink)]">{secili.size} seçili</p>
          <PButton variant="ghost" onClick={() => setRozetDialog(true)} disabled={isleniyor}>
            Rozet ata
          </PButton>
          <PButton variant="ghost" onClick={() => topluIslem('clear_badge')} disabled={isleniyor}>
            Rozeti kaldır
          </PButton>
          <PButton variant="ghost" onClick={() => topluIslem('set_featured')} disabled={isleniyor}>
            Öne çıkar
          </PButton>
          <PButton variant="ghost" onClick={() => topluIslem('clear_featured')} disabled={isleniyor}>
            Öne çıkarma
          </PButton>
          <button
            onClick={() => setSecili(new Set())}
            className="ml-auto text-[12px] text-[var(--p-muted)] hover:text-[var(--p-ink)]"
          >
            Vazgeç
          </button>
        </div>
      )}

      {/* ── Masaüstü tablo ── */}
      <div className="hidden overflow-x-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] sm:block">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-[var(--p-surface)]">
            <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={hepsiSecili} onChange={toggleHepsi} aria-label="Tümünü seç" className="h-4 w-4 accent-[var(--p-accent)]" />
              </th>
              <th className="px-3 py-2.5 font-semibold">Ürün</th>
              <th className="px-3 py-2.5 font-semibold">Barkod</th>
              <th className="px-3 py-2.5 font-semibold">Kategori</th>
              <th className="px-3 py-2.5 text-right font-semibold">Fiyat</th>
              <th className="px-3 py-2.5 text-right font-semibold">Stok</th>
              <th className="px-3 py-2.5 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((p) => (
              <tr key={p.id} className={cn('border-b border-[var(--p-line)]/60 last:border-0 hover:bg-[var(--p-bg)]/60', secili.has(p.id) && 'bg-[#f5efe2]/50')}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={secili.has(p.id)} onChange={() => toggle(p.id)} aria-label={p.title} className="h-4 w-4 accent-[var(--p-accent)]" />
                </td>
                <td className="px-3 py-2">
                  <Link href={`/panel/urunler/${p.id}`} className="flex items-center gap-3 group">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                      {p.image && <Image src={p.image} unoptimized={isRemoteMedia(p.image)} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--p-ink)] group-hover:text-[var(--p-accent-deep)]">{p.title}</span>
                      <span className="block max-w-[260px] truncate text-[11px] text-[var(--p-muted)]">
                        {p.tyTitle.split(' ').slice(0, 5).join(' ')}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-[12px] text-[var(--p-ink-soft)]">{p.barcode ?? '—'}</td>
                <td className="px-3 py-2 text-[12px] text-[var(--p-ink-soft)]">{p.category ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPrice(p.price)}</td>
                <td className={cn('px-3 py-2 text-right tabular-nums', p.stock === 0 && 'text-[var(--p-danger)]', p.stock === 1 && 'text-[var(--p-warning)]')}>{p.stock}</td>
                <td className="px-3 py-2"><DurumRozetleri p={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {satirlar.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">Bu filtrelerle ürün bulunamadı.</p>
        )}
      </div>

      {/* ── Mobil kartlar ── */}
      <div className="space-y-2 sm:hidden">
        {satirlar.map((p) => (
          <div key={p.id} className={cn('flex items-center gap-3 rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3', secili.has(p.id) && 'border-[var(--p-accent)]')}>
            <input type="checkbox" checked={secili.has(p.id)} onChange={() => toggle(p.id)} aria-label={p.title} className="h-5 w-5 shrink-0 accent-[var(--p-accent)]" />
            <Link href={`/panel/urunler/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                {p.image && <Image src={p.image} unoptimized={isRemoteMedia(p.image)} alt="" width={48} height={48} sizes="48px" className="h-12 w-12 object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[var(--p-ink)]">{p.title}</span>
                <span className="mt-0.5 block text-[12px] tabular-nums text-[var(--p-ink-soft)]">
                  {formatPrice(p.price)} · stok {p.stock}
                </span>
                <span className="mt-1 block"><DurumRozetleri p={p} /></span>
              </span>
            </Link>
          </div>
        ))}
        {satirlar.length === 0 && (
          <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">
            Bu filtrelerle ürün bulunamadı.
          </p>
        )}
      </div>

      {/* Sayfalama */}
      {toplamSayfa > 1 && (
        <div className="flex items-center justify-between">
          <PButton variant="ghost" disabled={sayfa <= 1} onClick={() => guncelle({ sayfa: String(sayfa - 1) })}>
            ← Önceki
          </PButton>
          <p className="text-[12px] text-[var(--p-muted)]">Sayfa {sayfa} / {toplamSayfa}</p>
          <PButton variant="ghost" disabled={sayfa >= toplamSayfa} onClick={() => guncelle({ sayfa: String(sayfa + 1) })}>
            Sonraki →
          </PButton>
        </div>
      )}

      {/* ── Mobil filtre sheet ── */}
      {filtreSheet && (
        <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[var(--p-ink)]/40" onClick={() => setFiltreSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[10px] border-t border-[var(--p-line)] bg-[var(--p-surface)] p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Filtreler</p>
              <button onClick={() => setFiltreSheet(false)} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center text-[var(--p-muted)]">
                <X size={18} />
              </button>
            </div>
            {filtreler}
            <PButton className="mt-4 w-full" onClick={() => setFiltreSheet(false)}>
              {toplam} ürünü göster
            </PButton>
          </div>
        </div>
      )}

      {/* ── Rozet atama dialog'u ── */}
      <PDialog
        open={rozetDialog}
        onClose={() => setRozetDialog(false)}
        title={`${secili.size} ürüne rozet ata`}
        footer={
          <>
            <PButton variant="ghost" onClick={() => setRozetDialog(false)}>Vazgeç</PButton>
            <PButton onClick={() => topluIslem('set_badge', rozetMetni)} disabled={isleniyor || !rozetMetni.trim()}>
              {isleniyor ? 'Yazılıyor…' : 'Ata'}
            </PButton>
          </>
        }
      >
        <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Rozet metni (ör. Yeni, İndirim)</label>
        <PInput value={rozetMetni} onChange={(e) => setRozetMetni(e.target.value)} maxLength={24} autoFocus />
        <p className="mt-2 text-[12px] text-[var(--p-muted)]">
          Vitrindeki öncelik: Son 1 adet &gt; bu rozet &gt; Yeni.
        </p>
      </PDialog>
    </div>
  )
}
