'use client'

import Image from 'next/image'
import { gorselBoyutu, isRemoteMedia } from '@/lib/images'
import { useEffect, useRef, useState } from 'react'
import { PBadge, PInput } from './ui'
import { PDialog } from './overlays'

export type PickerUrun = {
  id: string
  slug: string
  title: string
  barcode: string | null
  image: string | null
  stock: number
  active: boolean
}

/**
 * Koleksiyon ve kürasyonun ortak ürün seçicisi: ada/barkoda göre arama.
 * Pasif ya da stoksuz ürün seçilebilir ama turuncu uyarı rozetiyle gösterilir —
 * vitrin bunları zaten filtreler, küratörün haberi olsun.
 */
export default function ProductPicker({
  open,
  onClose,
  onSelect,
  disabledIds = [],
}: {
  open: boolean
  onClose: () => void
  onSelect: (urun: PickerUrun) => void
  disabledIds?: string[]
}) {
  const [q, setQ] = useState('')
  const [sonuclar, setSonuclar] = useState<PickerUrun[]>([])
  const [araniyor, setAraniyor] = useState(false)
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setQ('')
      setSonuclar([])
    }
  }, [open])

  useEffect(() => {
    if (q.trim().length < 2) {
      setSonuclar([])
      return
    }
    if (zamanlayici.current) clearTimeout(zamanlayici.current)
    const controller = new AbortController()
    zamanlayici.current = setTimeout(async () => {
      setAraniyor(true)
      try {
        const res = await fetch(`/api/panel/products/search?q=${encodeURIComponent(q.trim())}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        setSonuclar(Array.isArray(data) ? data : [])
      } catch {
        /* iptal ya da ağ hatası — sonuçlar olduğu gibi kalır */
      }
      setAraniyor(false)
    }, 300)
    return () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current)
      controller.abort()
    }
  }, [q])

  return (
    <PDialog open={open} onClose={onClose} title="Ürün seç">
      <PInput
        placeholder="Ad ya da barkod yazın…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {araniyor && <p className="py-3 text-center text-[12px] text-[var(--p-muted)]">Aranıyor…</p>}
        {!araniyor && q.trim().length >= 2 && sonuclar.length === 0 && (
          <p className="py-3 text-center text-[12px] text-[var(--p-muted)]">Sonuç yok.</p>
        )}
        {sonuclar.map((u) => {
          const kapali = disabledIds.includes(u.id)
          return (
            <button
              key={u.id}
              disabled={kapali}
              onClick={() => onSelect(u)}
              className="flex w-full items-center gap-3 rounded-[4px] border border-transparent px-2 py-2 text-left hover:border-[var(--p-line)] hover:bg-[var(--p-bg)] disabled:opacity-40"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                {u.image && (
                  <Image src={gorselBoyutu(u.image, 96)} unoptimized={isRemoteMedia(u.image)} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-[var(--p-ink)]">{u.title}</span>
                <span className="block text-[11px] text-[var(--p-muted)]">{u.barcode ?? '—'}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {kapali && <PBadge tone="neutral">listede</PBadge>}
                {!u.active && <PBadge tone="warning">pasif</PBadge>}
                {u.active && u.stock === 0 && <PBadge tone="warning">stok 0</PBadge>}
              </span>
            </button>
          )
        })}
      </div>
    </PDialog>
  )
}
