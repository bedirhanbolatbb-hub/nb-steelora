'use client'

import Image from 'next/image'
import { MALZEME_SECENEKLERI, type BeyanEdilenMalzeme } from '@/lib/catalog/material'
import { isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { PBadge, PButton, PCard, PInput, PSelect, PTextarea } from '../../_components/ui'
import { useToast } from '../../_components/overlays'
import MediaUpload from '../../_components/MediaUpload'

export type UrunDetay = {
  id: string
  slug: string
  trendyolTitle: string
  trendyolPrice: number
  trendyolStock: number
  trendyolCategory: string | null
  trendyolBarcode: string | null
  trendyolImages: string[]
  variantLabel: string | null
  lastSyncedAt: string | null
  active: boolean
  overrideTitle: string
  customPrice: string
  overrideDescription: string
  overrideImages: string[] | null
  badge: string
  isFeatured: boolean
  materialType: '' | BeyanEdilenMalzeme
  gender: '' | 'women' | 'men'
  note: string
}

type Form = Pick<
  UrunDetay,
  'overrideTitle' | 'customPrice' | 'overrideDescription' | 'overrideImages' | 'badge' | 'isFeatured' | 'materialType' | 'gender' | 'note'
>

const gecerliUrl = (u: string) => {
  try {
    const p = new URL(u)
    return p.protocol === 'http:' || p.protocol === 'https:'
  } catch {
    return false
  }
}

export default function UrunDetayClient({ urun }: { urun: UrunDetay }) {
  const router = useRouter()
  const { push: toast } = useToast()

  const ilk: Form = useMemo(
    () => ({
      overrideTitle: urun.overrideTitle,
      customPrice: urun.customPrice,
      overrideDescription: urun.overrideDescription,
      overrideImages: urun.overrideImages,
      badge: urun.badge,
      isFeatured: urun.isFeatured,
      materialType: urun.materialType,
      gender: urun.gender,
      note: urun.note,
    }),
    [urun]
  )
  const [form, setForm] = useState<Form>(ilk)
  const [yeniUrl, setYeniUrl] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Yalnız değişen alanlar gönderilir.
  const degisenler = useMemo(() => {
    const patch: Record<string, unknown> = {}
    if (form.overrideTitle !== ilk.overrideTitle) patch.override_title = form.overrideTitle
    if (form.customPrice !== ilk.customPrice) patch.override_price = form.customPrice.trim() || null
    if (form.overrideDescription !== ilk.overrideDescription)
      patch.override_description = form.overrideDescription
    if (JSON.stringify(form.overrideImages) !== JSON.stringify(ilk.overrideImages))
      patch.override_images = form.overrideImages
    if (form.badge !== ilk.badge) patch.badge = form.badge
    if (form.isFeatured !== ilk.isFeatured) patch.is_featured = form.isFeatured
    if (form.materialType !== ilk.materialType) patch.material_type = form.materialType || null
    if (form.gender !== ilk.gender) patch.gender = form.gender || null
    if (form.note !== ilk.note) patch.note = form.note
    return patch
  }, [form, ilk])

  const kaydet = async () => {
    if (Object.keys(degisenler).length === 0) return
    setKaydediliyor(true)
    try {
      const res = await fetch(`/api/panel/products/${urun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(degisenler),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Kaydedildi', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydediliyor(false)
  }

  // ── Görsel sırası yardımcıları (yalnız override_images'e dokunur) ──
  const gorseller = form.overrideImages
  const tasi = (i: number, yon: -1 | 1) => {
    if (!gorseller) return
    const j = i + yon
    if (j < 0 || j >= gorseller.length) return
    const next = [...gorseller]
    ;[next[i], next[j]] = [next[j], next[i]]
    set('overrideImages', next)
  }
  const kaldir = (i: number) => {
    if (!gorseller) return
    const next = gorseller.filter((_, x) => x !== i)
    set('overrideImages', next.length > 0 ? next : null)
  }
  const ekle = () => {
    const url = yeniUrl.trim()
    if (!gecerliUrl(url)) {
      toast('Geçerli bir http(s) adresi girin', 'danger')
      return
    }
    set('overrideImages', [...(gorseller ?? []), url])
    setYeniUrl('')
  }

  const sonSync = urun.lastSyncedAt
    ? new Date(urun.lastSyncedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' })
    : '—'

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Üst şerit */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/panel/urunler" className="flex min-h-[44px] items-center gap-1 text-[13px] text-[var(--p-muted)] hover:text-[var(--p-ink)]">
          <ArrowLeft size={14} /> Ürünler
        </Link>
        <span className="ml-auto flex items-center gap-2">
          {!urun.active && <PBadge tone="danger">pasif</PBadge>}
          <a
            href={`/urun/${urun.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center gap-1.5 text-[13px] text-[var(--p-accent-deep)] hover:underline"
          >
            Vitrinde gör <ExternalLink size={13} />
          </a>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Sol: görseller ── */}
        <div className="space-y-4">
          <PCard title="Görsel sırası">
            {gorseller === null ? (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--p-muted)]">
                  Trendyol görselleri kullanılıyor — vitrin, sync&apos;in getirdiği sırayla basar.
                </p>
                <PButton variant="ghost" onClick={() => set('overrideImages', [...urun.trendyolImages])}>
                  Özel sıra oluştur
                </PButton>
              </div>
            ) : (
              <div className="space-y-2">
                {gorseller.map((url, i) => (
                  <div key={`${url}-${i}`} className="flex items-center gap-3 rounded-[4px] border border-[var(--p-line)] p-2">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                      <Image src={url} unoptimized={isRemoteMedia(url)} alt="" width={56} height={56} sizes="56px" className="h-14 w-14 object-cover" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--p-muted)]">{url}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button onClick={() => tasi(i, -1)} disabled={i === 0} aria-label="Yukarı taşı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] text-[var(--p-ink-soft)] disabled:opacity-30 hover:border-[var(--p-ink)]">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => tasi(i, 1)} disabled={i === gorseller.length - 1} aria-label="Aşağı taşı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] text-[var(--p-ink-soft)] disabled:opacity-30 hover:border-[var(--p-ink)]">
                        <ArrowDown size={14} />
                      </button>
                      <button onClick={() => kaldir(i)} aria-label="Kaldır" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)]">
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <PInput placeholder="https://…  yeni görsel adresi" value={yeniUrl} onChange={(e) => setYeniUrl(e.target.value)} />
                  <PButton variant="ghost" onClick={ekle} disabled={!yeniUrl.trim()}>Ekle</PButton>
                </div>
                <MediaUpload etiket="Bilgisayardan/telefondan görsel yükle" onUploaded={(url) => set('overrideImages', [...(gorseller ?? []), url])} />
                <button
                  onClick={() => set('overrideImages', null)}
                  className="text-[12px] text-[var(--p-muted)] underline underline-offset-2 hover:text-[var(--p-ink)]"
                >
                  Özel sırayı bırak, Trendyol görsellerine dön
                </button>
              </div>
            )}
          </PCard>

          {/* Trendyol görselleri — salt okunur */}
          <PCard title="Trendyol görselleri (salt okunur)">
            {urun.trendyolImages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {urun.trendyolImages.map((url, i) => (
                  <span key={i} className="relative h-16 w-16 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                    <Image src={url} unoptimized={isRemoteMedia(url)} alt="" width={64} height={64} sizes="64px" className="h-16 w-16 object-cover" />
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--p-muted)]">Görsel yok.</p>
            )}
          </PCard>
        </div>

        {/* ── Sağ: düzenlenebilir alanlar ── */}
        <div className="space-y-4">
          <PCard title="Vitrin alanları">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Görünen ad (override_title)</label>
                <PInput value={form.overrideTitle} onChange={(e) => set('overrideTitle', e.target.value)} placeholder={urun.trendyolTitle} />
                <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                  {form.overrideTitle
                    ? '🔒 Doluyken isim kampanyası ve sync bu ada dokunmaz.'
                    : 'Boş bırakılırsa vitrinde Trendyol adı görünür.'}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Açıklama (override_description)</label>
                <PTextarea rows={4} value={form.overrideDescription} onChange={(e) => set('overrideDescription', e.target.value)} />
                {!form.overrideDescription && (
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                    Boş — vitrinde Trendyol açıklaması sanitize edilerek gösteriliyor.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Kampanya fiyatı (₺)</label>
                  <PInput
                    inputMode="decimal"
                    value={form.customPrice}
                    onChange={(e) => set('customPrice', e.target.value)}
                    placeholder={`boş = ${formatPrice(urun.trendyolPrice)}`}
                  />
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                    Doluysa vitrinde bu fiyat basılır, sync fiyatı üstü çizili görünür.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Rozet</label>
                  <PInput value={form.badge} onChange={(e) => set('badge', e.target.value)} maxLength={24} placeholder="boş = rozet yok" />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Öne çıkan</label>
                  <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-[var(--p-accent)]" />
                    Sıralamada öne alınır
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Malzeme</label>
                  <PSelect value={form.materialType} onChange={(e) => set('materialType', e.target.value as Form['materialType'])}>
                    <option value="">Boş</option>
                    {MALZEME_SECENEKLERI.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </PSelect>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Gender</label>
                  <PSelect value={form.gender} onChange={(e) => set('gender', e.target.value as Form['gender'])}>
                    <option value="">Boş</option>
                    <option value="women">Kadın</option>
                    <option value="men">Erkek</option>
                  </PSelect>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">İç not</label>
                <PTextarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Yalnız panelde görünür" />
              </div>
            </div>
          </PCard>

          {/* Salt okunur blok */}
          <PCard title="Trendyol verisi (salt okunur)">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Trendyol adı</dt>
                <dd className="text-[var(--p-ink)]">{urun.trendyolTitle}</dd>
              </div>
              <div><dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Fiyat</dt><dd className="tabular-nums">{formatPrice(urun.trendyolPrice)}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Stok</dt><dd className="tabular-nums">{urun.trendyolStock}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Kategori</dt><dd>{urun.trendyolCategory ?? '—'}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Barkod</dt><dd>{urun.trendyolBarcode ?? '—'}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Varyant etiketi</dt><dd>{urun.variantLabel ?? '—'}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Son sync</dt><dd>{sonSync}</dd></div>
            </dl>
            <p className="mt-3 rounded-[4px] bg-[var(--p-bg)] px-3 py-2 text-[12px] text-[var(--p-muted)]">
              Bu alanlar Trendyol&apos;dan gelir, panelden değişmez.
            </p>
          </PCard>

          {/* Kaydet */}
          <div className="sticky bottom-20 flex items-center gap-3 rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3 sm:bottom-4">
            <p className="text-[12px] text-[var(--p-muted)]">
              {Object.keys(degisenler).length > 0
                ? `${Object.keys(degisenler).length} alan değişti`
                : 'Değişiklik yok'}
            </p>
            <PButton className="ml-auto" onClick={kaydet} disabled={kaydediliyor || Object.keys(degisenler).length === 0}>
              {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </PButton>
          </div>
        </div>
      </div>
    </div>
  )
}
