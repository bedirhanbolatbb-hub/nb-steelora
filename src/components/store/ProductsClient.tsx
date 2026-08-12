'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState, Suspense } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

const SIRALAMA_SECENEKLERI = [
  { value: '', label: 'Önerilen' },
  { value: 'yeni', label: 'En Yeni' },
  { value: 'fiyat-artan', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'fiyat-azalan', label: 'Fiyat: Yüksekten Düşüğe' },
]

const FIYAT_ARALIKLARI = [
  { label: 'Tümü', min: '', max: '' },
  { label: '0 — 200 ₺', min: '0', max: '200' },
  { label: '200 — 500 ₺', min: '200', max: '500' },
  { label: '500 — 1000 ₺', min: '500', max: '1000' },
  { label: '1000 ₺ üzeri', min: '1000', max: '' },
]

interface ProductsClientProps {
  /** Gruplanmış kartlar: kapak ürünü + gruptaki diğer üye sayısı */
  cards: { product: Product; optionCount: number }[]
  total: number
  categories: string[]
  currentPage: number
  perPage: number
  currentParams: Record<string, string>
  title?: string
  /** Liste üstünde gösterilen daraltma çipleri (ör. Bileklik sayfasında Halhal) */
  chips?: { value: string; label: string }[]
}

function ProductsInner({
  cards,
  total,
  categories,
  currentPage,
  perPage,
  currentParams,
  title = 'Tüm Ürünler',
  chips,
}: ProductsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(sp.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      params.delete('sayfa')
      router.push(`${pathname}?${params.toString()}`)
    },
    [sp, pathname, router]
  )

  const totalPages = Math.ceil(total / perPage)
  const hasFilters = currentParams.kategori || currentParams.min_fiyat || currentParams.max_fiyat

  // Aynı filtre bloğu hem masaüstü kenar çubuğunda hem mobil sheet içinde kullanılır.
  const filterPanel = (
    <>
      {/* Active filters */}
      {hasFilters && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted font-body">
              Aktif Filtreler
            </span>
            <button
              onClick={() => router.push(pathname)}
              className="text-[10px] text-accent hover:text-accent-deep font-body transition-colors"
            >
              Temizle
            </button>
          </div>
          {currentParams.kategori && (
            <span className="inline-flex items-center gap-1 bg-surface-muted px-2 py-1 text-[11px] font-body text-ink mr-2 mb-2">
              {currentParams.kategori}
              <button
                onClick={() => updateParams({ kategori: '' })}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Categories */}
      <div className="mb-8">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted font-body mb-4">
          Kategori
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => updateParams({ kategori: '' })}
            className={`block text-[12px] font-body w-full text-left py-1 transition-colors ${
              !currentParams.kategori
                ? 'text-ink font-medium'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Tümü
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParams({ kategori: cat })}
              className={`block text-[12px] font-body w-full text-left py-1 transition-colors ${
                currentParams.kategori === cat
                  ? 'text-accent font-medium'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="mb-8">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted font-body mb-4">
          Fiyat Aralığı
        </h3>
        <div className="space-y-2">
          {FIYAT_ARALIKLARI.map((range) => {
            const isActive =
              (currentParams.min_fiyat || '') === range.min &&
              (currentParams.max_fiyat || '') === range.max
            return (
              <button
                key={range.label}
                onClick={() =>
                  updateParams({
                    min_fiyat: range.min,
                    max_fiyat: range.max,
                  })
                }
                className={`block text-[12px] font-body w-full text-left py-1 transition-colors ${
                  isActive
                    ? 'text-accent font-medium'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stock filter */}
      <div className="mb-8">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted font-body mb-4">
          Stok
        </h3>
        <label className="flex items-center gap-2 text-[12px] font-body text-ink-soft cursor-pointer hover:text-ink">
          <input
            type="checkbox"
            checked={currentParams.stok === '1'}
            onChange={(e) => updateParams({ stok: e.target.checked ? '1' : '' })}
            className="accent-accent"
          />
          Sadece stokta olanlar
        </label>
      </div>
    </>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-heading text-[36px] font-light text-ink">
            {title}
          </h1>
          <p className="text-muted text-[12px] font-body mt-1">
            {total} ürün
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobil filtre girişi — masaüstünde kenar çubuğu zaten görünür */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-line bg-white font-body text-[12px] text-ink hover:border-accent transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filtrele
          </button>

          <select
            aria-label="Sıralama"
            value={currentParams.siralama || ''}
            onChange={(e) => updateParams({ siralama: e.target.value })}
            className="w-full sm:w-auto px-4 py-2 border border-line bg-white font-body text-[12px] text-ink focus:border-accent focus:outline-none transition-colors"
          >
            {SIRALAMA_SECENEKLERI.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daraltma çipleri — kategori içi alt gruplar (ayrı menü maddesi değil) */}
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => updateParams({ tip: '' })}
            className={`px-3 py-1.5 text-[11px] font-body border transition-colors ${
              !currentParams.tip
                ? 'border-accent text-accent'
                : 'border-line text-ink-soft hover:text-ink'
            }`}
          >
            Tümü
          </button>
          {chips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => updateParams({ tip: currentParams.tip === chip.value ? '' : chip.value })}
              className={`px-3 py-1.5 text-[11px] font-body border transition-colors ${
                currentParams.tip === chip.value
                  ? 'border-accent text-accent'
                  : 'border-line text-ink-soft hover:text-ink'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobil filtre sheet — masaüstü kenar çubuğuyla aynı filtreler */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-bg border-t border-line p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.15em] font-body text-ink">
                Filtreler
              </span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-muted hover:text-ink transition-colors"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>
            {filterPanel}
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full py-3 bg-accent text-white text-[11px] uppercase tracking-[0.15em] font-body hover:bg-accent-deep transition-colors"
            >
              {total} ürünü göster
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar (masaüstü) */}
        <aside className="w-52 shrink-0 hidden lg:block">{filterPanel}</aside>

        {/* Product Grid */}
        <div className="flex-1">
          {cards.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted font-body text-[13px] mb-4">
                Bu kriterlere uygun ürün bulunamadı.
              </p>
              <button
                onClick={() => router.push(pathname)}
                className="text-[12px] font-body text-accent hover:text-accent-deep transition-colors"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {cards.map(({ product, optionCount }, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={i < 4}
                    optionCount={optionCount}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => {
                          const params = new URLSearchParams(sp.toString())
                          params.set('sayfa', page.toString())
                          router.push(`${pathname}?${params.toString()}`)
                        }}
                        className={`w-10 h-10 text-[12px] font-body transition-colors ${
                          page === currentPage
                            ? 'bg-ink text-bg'
                            : 'bg-surface-muted text-ink hover:bg-ink hover:text-bg'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsClient(props: ProductsClientProps) {
  return (
    <Suspense>
      <ProductsInner {...props} />
    </Suspense>
  )
}
