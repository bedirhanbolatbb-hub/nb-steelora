'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

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

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
      } catch {
        setResults([])
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleProductClick = (slug: string) => {
    router.push(`/urun/${slug}`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-dark/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-champagne max-w-2xl mx-auto mt-20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-4 p-6 border-b border-champagne-mid">
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ürün ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent font-heading text-[20px] text-text-primary placeholder:text-text-muted outline-none"
          />
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-text-muted text-[13px] font-body">
              Aranıyor...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-6 text-center text-text-muted text-[13px] font-body">
              &ldquo;{query}&rdquo; için sonuç bulunamadı
            </div>
          )}

          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product.slug)}
              className="w-full flex items-center gap-4 p-4 hover:bg-champagne-dark transition-colors text-left border-b border-champagne-mid/30 last:border-0"
            >
              <div className="w-14 h-14 bg-champagne-dark shrink-0 overflow-hidden">
                {product.display_images?.[0] ? (
                  <img
                    src={product.display_images[0]}
                    alt={product.display_title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-[9px] font-body">
                    Görsel
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-body text-text-primary font-medium truncate">
                  {product.display_title}
                </p>
                <p className="text-[11px] font-body text-text-muted mt-0.5">
                  {product.trendyol_category}
                </p>
              </div>
              <p className="text-[13px] font-body text-gold font-medium shrink-0">
                {formatPrice(product.display_price)}
              </p>
            </button>
          ))}

          {!loading && query.length < 2 && (
            <div className="p-6 text-center text-text-muted text-[13px] font-body">
              Aramak istediğiniz ürünü yazın
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
