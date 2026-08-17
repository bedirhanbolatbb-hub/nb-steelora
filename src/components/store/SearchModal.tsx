'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { izle } from '@/lib/analytics/izle'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setResults([])
    }
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
        izle('search', {
          searchQuery: query,
          meta: { sonuc: Array.isArray(data) ? data.length : 0 },
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-ink/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-bg max-w-2xl mx-auto mt-16 sm:mt-24 rounded-[6px] overflow-hidden border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-4 p-6 border-b border-line">
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ürün ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent font-body text-[16px] tracking-wide text-ink placeholder:text-muted outline-none"
          />
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

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
            <p className="p-6 text-center text-muted text-[13px] font-body">
              &ldquo;{query}&rdquo; için sonuç yok — başka bir kelime deneyin.
            </p>
          )}

          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product.slug)}
              className="w-full flex items-center gap-4 p-4 hover:bg-surface-muted transition-colors text-left border-b border-line/30 last:border-0"
            >
              <div className="w-14 h-14 bg-surface-muted shrink-0 overflow-hidden rounded-[2px]">
                {product.display_images?.[0] ? (
                  // Yüklenene kadar boş kutu görünmesin: zemin dururken görsel
                  // yerine oturunca yumuşak belirir.
                  <img
                    src={product.display_images[0]}
                    alt={product.display_title}
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                    className="search-thumb w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-[9px] font-body">
                    Görsel
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-body text-ink font-medium truncate">
                  {product.display_title}
                </p>
                <p className="text-[11px] font-body text-muted mt-0.5">
                  {product.trendyol_category}
                  {product.option_count > 0 && ` · +${product.option_count} seçenek`}
                </p>
              </div>
              <p className="text-[13px] font-body text-accent font-medium shrink-0">
                {formatPrice(product.display_price)}
              </p>
            </button>
          ))}

          {!loading && query.length < 2 && (
            <div className="p-6 text-center text-muted text-[13px] font-body">
              Aramak istediğiniz ürünü yazın
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
