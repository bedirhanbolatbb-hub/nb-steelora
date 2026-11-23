'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import ProductCardV2 from './ProductCardV2'
import { CATEGORIES } from '@/lib/catalog/categories'
import { BOS_DURUM } from '@/lib/metin/bosDurum'
import { WHATSAPP_URL } from '@/lib/contact'
import type { Product } from '@/types'

type Sonuc = Product & { option_count?: number; yakin?: boolean }

/** Arama kutusu — adres değişince `key` ile sıfırlanır (efekt gerekmez). */
function AramaFormu({ ilk }: { ilk: string }) {
  const router = useRouter()
  const [metin, setMetin] = useState(ilk)

  const gonder = (e: React.FormEvent) => {
    e.preventDefault()
    const yeni = metin.trim()
    if (yeni.length < 2) return
    router.push(`/arama?q=${encodeURIComponent(yeni)}`)
  }

  return (
    <form onSubmit={gonder} role="search" className="mt-4 flex max-w-xl gap-2">
      <label className="relative block flex-1">
        <span className="sr-only">Ürün ara</span>
        <Search size={18} strokeWidth={1.6} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          type="search"
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          placeholder="Ürün adı ya da türü yazın"
          enterKeyHint="search"
          className="h-[52px] w-full rounded-[4px] border border-line-strong bg-white pl-11 pr-3 font-body text-[16px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="basis h-[52px] shrink-0 rounded-[4px] bg-ink px-6 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep"
      >
        Ara
      </button>
    </form>
  )
}

/** Arama sonuç sayfasının gövdesi — bkz. app/(store)/arama/page.tsx. */
function Icerik() {
  const sp = useSearchParams()
  const q = (sp.get('q') ?? '').trim()
  // Yanıt, ait olduğu sorguyla birlikte tutulur: adres değiştiğinde eski liste
  // yeni sorgunun sonucu gibi görünmez, bekleme hâli de ayrıca saklanmaz.
  const [yanit, setYanit] = useState<{ q: string; liste: Sonuc[] }>({ q: '', liste: [] })

  useEffect(() => {
    if (q.length < 2) return
    let iptal = false
    fetch(`/api/search?q=${encodeURIComponent(q)}&tum=1`)
      .then((r) => r.json())
      .then((d) => {
        if (!iptal) setYanit({ q, liste: Array.isArray(d) ? d : [] })
      })
      .catch(() => {
        if (!iptal) setYanit({ q, liste: [] })
      })
    return () => {
      iptal = true
    }
  }, [q])

  // null = bekleniyor
  const sonuclar: Sonuc[] | null = q.length < 2 ? [] : yanit.q === q ? yanit.liste : null
  const yakin = Boolean(sonuclar && sonuclar.length > 0 && sonuclar[0].yakin)

  return (
    <div className="mx-auto min-h-[520px] max-w-[1400px] px-4 pb-12 pt-5 sm:pt-10 lg:px-8 lg:py-14">
      <h1 className="font-heading text-[28px] font-medium leading-tight text-ink sm:text-[36px]">
        {q ? <>&ldquo;{q}&rdquo; için sonuçlar</> : 'Arama'}
      </h1>

      <AramaFormu key={q} ilk={q} />

      <div className="mt-6" aria-live="polite">
        {sonuclar === null ? (
          <div className="grid animate-pulse grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                <div className="aspect-[4/5] rounded-[4px] bg-line/40" />
                <div className="mt-3.5 h-3 w-3/4 rounded bg-line/40" />
                <div className="mt-2 h-3 w-1/3 rounded bg-line/30" />
              </div>
            ))}
          </div>
        ) : q.length < 2 ? (
          <p className="font-body text-[15px] text-ink-soft">Aramak istediğiniz ürünü yazın; en az iki harf yeterli.</p>
        ) : sonuclar.length === 0 ? (
          <div className="max-w-xl">
            <p className="font-body text-[15px] leading-relaxed text-ink-soft">
              {BOS_DURUM.arama.baslik}. {BOS_DURUM.arama.metin}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {CATEGORIES.map((k) => (
                <Link
                  prefetch={false}
                  key={k.slug}
                  href={`/kategori/${k.slug}`}
                  className="inline-flex min-h-[44px] items-center rounded-[4px] border border-line-strong px-4 font-body text-[14px] text-ink transition-colors hover:border-ink"
                >
                  {k.title}
                </Link>
              ))}
            </div>
            <p className="mt-6 font-body text-[14px] text-ink-soft">
              Belirli bir ürünü arıyorsanız adını{' '}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-accent underline-offset-4"
              >
                WhatsApp&apos;tan yazın
              </a>
              ; birlikte bulalım.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 font-body text-[13px] text-muted">
              {yakin
                ? 'Tam eşleşme yok; en yakın ürünler gösteriliyor.'
                : `${sonuclar.length} ürün`}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
              {sonuclar.map((urun, i) => (
                <ProductCardV2
                  key={urun.id}
                  product={urun}
                  priority={i < 4}
                  optionCount={Number(urun.option_count) || 0}
                  morph={false}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AramaSonuclari() {
  return (
    <Suspense fallback={<div className="min-h-[520px]" aria-hidden />}>
      <Icerik />
    </Suspense>
  )
}
