'use client'

import { useState, useEffect, useRef } from 'react'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { kaydirmaKilidi } from '@/lib/ui/kaydirmaKilidi'
import { useKatmanKlavyesi } from '@/hooks/useKatmanKlavyesi'
import { markaKategorisi } from '@/lib/catalog/categories'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { BOS_DURUM } from '@/lib/metin/bosDurum'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { izle } from '@/lib/analytics/izle'
import { kucukResim } from '@/lib/gorsel/kadraj'
import { useKadrajSorgu } from '@/components/store/KadrajContext'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  // Faz 11A: fiyat gösterimi vitrin kampanyasından türer (tek kaynak).
  const kadrajMi = useKadrajSorgu()
  const kampanyaIndirimi = useVitrinIndirimi()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const kapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
    // Faz 11B: kilit yalnız body'ye konuyordu ve hiç işlemiyordu
    // (bkz. lib/ui/kaydirmaKilidi.ts — html{overflow-x:clip} yayılımı kesiyor).
    return kaydirmaKilidi(isOpen)
  }, [isOpen])

  // 300 ms debounce korunur (harf başına istek atmaz); ek olarak önceki istek
  // iptal edilir — yavaş dönen eski yanıt yenisinin üstüne yazamaz.
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        setResults(data)
        setLoading(false)
        // Ölçüm (Faz 12): sorgu ve sonuç sayısı — sonuçsuz aramalar raporlanır.
        // Yalnız "yakın sonuç" dönen arama da sonuçsuz sayılır (eksik ürün sinyali).
        const adet = Array.isArray(data) ? data.length : 0
        const yakinMi = adet > 0 && Boolean(data[0]?.yakin)
        izle('search', {
          searchQuery: query,
          meta: yakinMi ? { sonuc: 0, yakin: adet } : { sonuc: adet },
        })
      } catch (error: any) {
        // İptal edilen istek yeni bir aramanın başladığı anlamına gelir:
        // bekleme göstergesi açık kalmalı, sonuçlar boşaltılmamalı.
        if (error?.name === 'AbortError') return
        setResults([])
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const handleProductClick = (slug: string) => {
    router.push(`/urun/${slug}`)
    onClose()
  }

  // 24 Kas 2026 tasarım denetimi: Enter'a basınca hiçbir şey olmuyordu ve
  // sekiz satırdan fazlasını görmenin yolu yoktu. Artık sonuç sayfasına gider.
  const tumSonuclar = (e?: React.FormEvent) => {
    e?.preventDefault()
    const metin = query.trim()
    if (metin.length < 2) return
    router.push(`/arama?q=${encodeURIComponent(metin)}`)
    onClose()
  }

  // Faz 11B denetimi: Escape hiç çalışmıyordu, Tab perdenin arkasına
  // kaçıyordu — klavye kullanıcısının katmanı kapatma yolu yoktu (KRİTİK).
  // Kancanın kendi ilk-odak taşıması kapalı: giriş kutusuna odak zaten
  // yukarıdaki efektte veriliyor.
  useKatmanKlavyesi(isOpen, onClose, kapRef, { ilkOdak: false })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-ink/80 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={kapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ürün arama"
        className="bg-bg max-w-2xl mx-3 sm:mx-auto mt-3 sm:mt-24 rounded-[6px] overflow-hidden border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <form onSubmit={tumSonuclar} role="search" className="flex items-center gap-3 px-5 py-4 border-b border-line">
          <Search size={20} strokeWidth={1.6} className="text-ink-soft shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            aria-label="Ürün ara"
            placeholder="Ürün adı ya da türü yazın"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-body text-[16px] text-ink placeholder:text-muted outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Aramayı kapat"
            className="-m-3 flex h-11 w-11 items-center justify-center text-ink-soft hover:text-ink transition-colors"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </form>

        {/* Results */}
        <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto">
          {/* Bekleme: çıplak "Aranıyor..." yerine sonuç satırının iskeleti —
              yanıt gelince satırlar yerinde belirir, liste zıplamaz. */}
          {loading && results.length === 0 && (
            <div aria-live="polite" aria-label="Aranıyor">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-line/30 last:border-0">
                  <div className="skeleton w-14 h-14 shrink-0 rounded-[2px]" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="skeleton h-3 w-3/5 rounded-[2px]" />
                    <div className="skeleton h-2.5 w-2/5 rounded-[2px]" />
                  </div>
                  <div className="skeleton h-3 w-14 shrink-0 rounded-[2px]" />
                </div>
              ))}
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="p-6 text-center text-ink-soft text-[14px] font-body">
              &ldquo;{query}&rdquo; — {BOS_DURUM.arama.baslik.toLocaleLowerCase('tr-TR')}.{' '}
              {BOS_DURUM.arama.metin}
            </p>
          )}

          {!loading && results.length > 0 && (results[0] as any).yakin && (
            <p className="px-5 pt-4 pb-2 text-[13px] font-body text-ink-soft">
              &ldquo;{query}&rdquo; için tam eşleşme yok. Yakın sonuçlar:
            </p>
          )}

          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product.slug)}
              className="w-full flex items-center gap-3.5 px-5 py-3 hover:bg-surface-muted transition-colors text-left border-b border-line/40"
            >
              <div className="w-14 h-14 bg-surface-muted shrink-0 overflow-hidden rounded-[2px]">
                {product.display_images?.[0] ? (
                  // Yüklenene kadar boş kutu görünmesin: zemin dururken görsel
                  // yerine oturunca yumuşak belirir.
                  <img
                    src={kucukResim(product.display_images[0], 256, kadrajMi(product.id)).src}
                    alt={product.display_title}
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                    className="search-thumb w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-[11px] font-body">
                    Görsel
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-body text-ink font-medium line-clamp-2 leading-snug">
                  {product.display_title}
                </p>
                <p className="text-[12px] font-body text-muted mt-0.5">
                  {markaKategorisi(product.trendyol_category)}
                  {product.option_count > 0 && ` · ${product.option_count + 1} seçenek`}
                </p>
              </div>
              {/* Faz 11A: arama sonucu liste fiyatı gösteriyordu. */}
              <p className="text-[14px] font-body shrink-0 text-right">
                {(() => {
                  const f = vitrinFiyati((product as any).display_price, kampanyaIndirimi)
                  return (
                    <>
                      <span className="block font-semibold text-ink">
                        {formatPrice(f.gosterilen)}
                      </span>
                      {f.ustuCizili != null && (
                        <span className="text-muted line-through text-[12px]">
                          {formatPrice(f.ustuCizili)}
                        </span>
                      )}
                    </>
                  )
                })()}
              </p>
            </button>
          ))}

          {!loading && results.length > 0 && (
            <button
              type="button"
              onClick={() => tumSonuclar()}
              className="flex min-h-[52px] w-full items-center justify-center font-body text-[14px] font-medium text-ink underline decoration-accent underline-offset-4 transition-colors hover:text-accent-deep"
            >
              Tüm sonuçları görün
            </button>
          )}

          {!loading && query.length < 2 && (
            <div className="p-6 text-center text-ink-soft text-[14px] font-body">
              Aramak istediğiniz ürünü yazın
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
