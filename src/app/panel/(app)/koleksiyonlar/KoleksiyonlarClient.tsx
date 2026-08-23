'use client'

import Image from 'next/image'
import MetinOner from '../_components/MetinOner'
import { koleksiyonTanitimi } from '@/lib/metin/kategoriMetni'
import { isRemoteMedia } from '@/lib/images'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from 'lucide-react'
import { PBadge, PButton, PCard, PInput, PTextarea, PSayfaNotu } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'
import ProductPicker, { type PickerUrun } from '../_components/ProductPicker'
import MediaUpload from '../_components/MediaUpload'

export type UyeVeri = {
  id: string
  slug: string
  title: string
  barcode: string | null
  image: string | null
  stock: number
  active: boolean
}

export type KoleksiyonVeri = {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string | null
  productIds: string[]
}

export default function KoleksiyonlarClient({
  koleksiyonlar,
  uyeler,
}: {
  koleksiyonlar: KoleksiyonVeri[]
  uyeler: Record<string, UyeVeri>
}) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [acikId, setAcikId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; description: string; imageUrl: string | null; productIds: string[] } | null>(null)
  const [picker, setPicker] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Yeni koleksiyon
  const [yeniDialog, setYeniDialog] = useState(false)
  const [yeni, setYeni] = useState({ name: '', slug: '', description: '' })

  const acik = koleksiyonlar.find((c) => c.id === acikId) ?? null

  const ac = (c: KoleksiyonVeri) => {
    setAcikId(c.id)
    setForm({ name: c.name, description: c.description, imageUrl: c.imageUrl, productIds: [...c.productIds] })
  }

  const degisti =
    acik && form
      ? form.name !== acik.name ||
        form.description !== acik.description ||
        form.imageUrl !== acik.imageUrl ||
        JSON.stringify(form.productIds) !== JSON.stringify(acik.productIds)
      : false

  const kaydet = async () => {
    if (!acik || !form || !degisti) return
    setKaydediliyor(true)
    try {
      const res = await fetch(`/api/panel/collections/${acik.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          image_url: form.imageUrl,
          product_ids: form.productIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Koleksiyon kaydedildi', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydediliyor(false)
  }

  const olustur = async () => {
    setKaydediliyor(true)
    try {
      const res = await fetch('/api/panel/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeni),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Oluşturulamadı')
      toast('Koleksiyon oluşturuldu', 'success')
      setYeniDialog(false)
      setYeni({ name: '', slug: '', description: '' })
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydediliyor(false)
  }

  const tasi = (i: number, yon: -1 | 1) => {
    if (!form) return
    const j = i + yon
    if (j < 0 || j >= form.productIds.length) return
    const next = [...form.productIds]
    ;[next[i], next[j]] = [next[j], next[i]]
    setForm({ ...form, productIds: next })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PSayfaNotu>
        Ürünleri temalı gruplara ayırırsınız; her koleksiyonun vitrinde kendi adresi, kapak görseli ve sırası olur.
      </PSayfaNotu>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--p-muted)]">
          {koleksiyonlar.length} koleksiyon · vitrin adresi <code className="text-[12px]">/koleksiyon/…</code>
        </p>
        <PButton onClick={() => setYeniDialog(true)}>
          <Plus size={14} /> Yeni koleksiyon
        </PButton>
      </div>

      {/* ── Liste ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {koleksiyonlar.map((c) => {
          const aktif = c.productIds.filter((id) => uyeler[id]?.active).length
          const pasif = c.productIds.length - aktif
          return (
            <button
              key={c.id}
              onClick={() => ac(c)}
              className={`rounded-[6px] border bg-[var(--p-surface)] p-4 text-left transition-colors ${
                acikId === c.id ? 'border-[var(--p-accent)]' : 'border-[var(--p-line)] hover:border-[var(--p-ink)]'
              }`}
            >
              <p className="text-[14px] font-semibold text-[var(--p-ink)]">{c.name}</p>
              <p className="mt-0.5 text-[11px] text-[var(--p-muted)]">/koleksiyon/{c.slug}</p>
              <p className="mt-2 text-[12px] text-[var(--p-ink-soft)]">
                {c.productIds.length} ürün{' '}
                <span className="text-[var(--p-muted)]">
                  ({aktif} aktif{pasif > 0 ? ` · ${pasif} pasif` : ''})
                </span>
              </p>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-[12px] text-[var(--p-muted)]">{c.description}</p>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Düzenleme ── */}
      {acik && form && (
        <PCard
          title={`Düzenle: ${acik.name}`}
          action={
            <span className="flex items-center gap-1 text-[11px] text-[var(--p-muted)]">
              <Lock size={12} /> /koleksiyon/{acik.slug}
            </span>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Ad</label>
                <PInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">
                  Slug <span className="text-[var(--p-muted)]">(kilitli — canlı URL)</span>
                </label>
                <PInput value={acik.slug} disabled className="opacity-60" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">
                Kapak görseli <span className="text-[var(--p-muted)]">(boşsa ilk aktif ürünün görseli)</span>
              </label>
              {form.imageUrl && (
                <div className="mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="Kapak" className="h-16 w-24 rounded-[4px] border border-[var(--p-line)] object-cover" />
                  <button onClick={() => setForm({ ...form, imageUrl: null })} className="text-[11px] text-[var(--p-muted)] underline underline-offset-2 hover:text-[var(--p-ink)]">
                    Kaldır
                  </button>
                </div>
              )}
              <MediaUpload etiket="Kapak yükle" onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Açıklama</label>
              <PTextarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              {/* Faz 21: koleksiyon adı ve ürün sayısından tanıtım cümlesi.
                  Ürün hakkında iddia üretilmez — yalnız seçkinin kendisi
                  anlatılır (docs/marka-sesi.md). */}
              <MetinOner
                uret={() => koleksiyonTanitimi(form.name, form.productIds.length)}
                onSec={(m) => setForm((f) => (f ? { ...f, description: m } : f))}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-medium text-[var(--p-ink-soft)]">
                  Üyeler ({form.productIds.length})
                </p>
                <PButton variant="ghost" onClick={() => setPicker(true)}>
                  <Plus size={14} /> Ürün ekle
                </PButton>
              </div>
              {form.productIds.length === 0 ? (
                <p className="rounded-[4px] border border-dashed border-[var(--p-line)] px-3 py-6 text-center text-[12px] text-[var(--p-muted)]">
                  Henüz ürün yok.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {form.productIds.map((id, i) => {
                    const u = uyeler[id]
                    return (
                      <li key={id} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--p-line)] p-2 sm:flex-nowrap sm:gap-3">
                        <span className="w-5 text-center text-[11px] tabular-nums text-[var(--p-muted)]">{i + 1}</span>
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                          {u?.image && <Image src={u.image} unoptimized={isRemoteMedia(u.image)} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-[var(--p-ink)]">{u?.title ?? id}</span>
                          <span className="text-[11px] text-[var(--p-muted)]">{u?.barcode ?? ''}</span>
                        </span>
                        {u && !u.active && <PBadge tone="warning">pasif</PBadge>}
                        <span className="flex shrink-0 items-center gap-1">
                          <button onClick={() => tasi(i, -1)} disabled={i === 0} aria-label="Yukarı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowUp size={14} /></button>
                          <button onClick={() => tasi(i, 1)} disabled={i === form.productIds.length - 1} aria-label="Aşağı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowDown size={14} /></button>
                          <button onClick={() => setForm({ ...form, productIds: form.productIds.filter((x) => x !== id) })} aria-label="Çıkar" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)]"><Trash2 size={14} /></button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <PButton variant="ghost" onClick={() => ac(acik)} disabled={!degisti || kaydediliyor}>
                Geri al
              </PButton>
              <PButton onClick={kaydet} disabled={!degisti || kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </PButton>
            </div>
          </div>
        </PCard>
      )}

      {/* Ürün ekleme seçicisi */}
      <ProductPicker
        open={picker}
        onClose={() => setPicker(false)}
        disabledIds={form?.productIds ?? []}
        onSelect={(u: PickerUrun) => {
          if (form) setForm({ ...form, productIds: [...form.productIds, u.id] })
          setPicker(false)
        }}
      />

      {/* Yeni koleksiyon */}
      <PDialog
        open={yeniDialog}
        onClose={() => setYeniDialog(false)}
        title="Yeni koleksiyon"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setYeniDialog(false)}>Vazgeç</PButton>
            <PButton onClick={olustur} disabled={kaydediliyor || !yeni.name.trim() || !yeni.slug.trim()}>
              {kaydediliyor ? 'Oluşturuluyor…' : 'Oluştur'}
            </PButton>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Ad</label>
            <PInput value={yeni.name} onChange={(e) => setYeni({ ...yeni, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[var(--p-muted)]">
              Slug — oluşturduktan sonra değiştirilemez
            </label>
            <PInput
              value={yeni.slug}
              onChange={(e) => setYeni({ ...yeni, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="ör. kis-koleksiyonu"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Açıklama</label>
            <PTextarea rows={3} value={yeni.description} onChange={(e) => setYeni({ ...yeni, description: e.target.value })} />
          </div>
        </div>
      </PDialog>
    </div>
  )
}
