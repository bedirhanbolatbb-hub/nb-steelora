'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { FiyatKovasi } from '@/lib/catalog/fiyatKovalari'
import { useCallback, useState, Suspense } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import ProductCardV2 from './ProductCardV2'
import type { Product } from '@/types'

const SIRALAMA_SECENEKLERI = [
  { value: '', label: 'Önerilen' },
  { value: 'yeni', label: 'En Yeni' },
  { value: 'fiyat-artan', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'fiyat-azalan', label: 'Fiyat: Yüksekten Düşüğe' },
]

// Faz 11A: sabit kovalar KALDIRILDI — dördün üçü hiç sonuç vermiyordu.
// Aralıklar artık listedeki gerçek fiyatlardan sunucuda türetilip geliyor.

interface ProductsClientProps {
  /** Gruplanmış kartlar: kapak ürünü + gruptaki diğer üye sayısı */
  cards: { product: Product; optionCount: number }[]
  total: number
  categories: string[]
  /** Sunucuda gerçek fiyatlardan türetilmiş aralıklar (Faz 11A). */
  fiyatAraliklari: FiyatKovasi[]
  currentPage: number
  perPage: number
  currentParams: Record<string, string>
  title?: string
  /** Kategori tanıtım cümlesi (site_content'ten; boşsa basılmaz) */
  tanitim?: string
  /** Liste üstünde gösterilen daraltma çipleri (ör. Bileklik sayfasında Halhal) */
  chips?: { value: string; label: string }[]
  /**
   * Listenin üstüne basılacak sunucu içeriği — kırıntı yolu için.
   * Sunucuda üretilir çünkü JsonLd headers() okuyor; buraya prop olarak gelir.
   */
  ustSerit?: React.ReactNode
}

function ProductsInner({
  cards,
  total,
  categories,
  fiyatAraliklari,
  currentPage,
  perPage,
  currentParams,
  title = 'Tüm Ürünler',
  tanitim,
  chips,
  ustSerit,
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

  // Listenin üstündeki aktif filtre çipleri. Yeni filtre eklemez; yalnız
  // hâlihazırda uygulanmış olanları görünür ve tek tek kaldırılabilir yapar.
  //
  // Kaynak ADRES ÇUBUĞUDUR (currentParams değil): kategori sayfasında kategori
  // yolun parçasıdır, sorgu parametresi değildir — orada kaldırılabilir bir çip
  // olarak göstermek işlemeyen bir düğme demek olurdu.
  const qsKategori = sp.get('kategori') || ''
  const qsTip = sp.get('tip') || ''
  const qsMin = sp.get('min_fiyat') || ''
  const qsMax = sp.get('max_fiyat') || ''
  const qsStok = sp.get('stok') || ''

  const priceLabel = (() => {
    if (qsMin && qsMax) return `${qsMin} — ${qsMax} ₺`
    if (qsMin) return `${qsMin} ₺ üzeri`
    if (qsMax) return `${qsMax} ₺ altı`
    return ''
  })()

  const activeChips: { key: string; label: string; clear: Record<string, string> }[] = [
    ...(qsKategori ? [{ key: 'kategori', label: qsKategori, clear: { kategori: '' } }] : []),
    ...(qsTip
      ? [
          {
            key: 'tip',
            label: chips?.find((c) => c.value === qsTip)?.label ?? qsTip,
            clear: { tip: '' },
          },
        ]
      : []),
    ...(priceLabel
      ? [{ key: 'fiyat', label: priceLabel, clear: { min_fiyat: '', max_fiyat: '' } }]
      : []),
    ...(qsStok === '1'
      ? [{ key: 'stok', label: 'Sadece stokta olanlar', clear: { stok: '' } }]
      : []),
  ]

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
              className="text-[10px] text-accent-deep hover:text-ink font-body transition-colors"
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
                  ? 'text-accent-deep font-medium'
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
          {fiyatAraliklari.map((range) => {
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
                    ? 'text-accent-deep font-medium'
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
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
      {/* Kırıntı yolu sunucuda üretilip buraya geçirilir: JsonLd bir SUNUCU
          bileşeni (headers() ile nonce okuyor), istemci bileşeninin içinde
          çağrılamaz — ama prop olarak taşınabilir (Faz 11F son). */}
      {ustSerit}
      {/* Editorial sayfa başı — Sessiz Atölye */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-line pb-6">
        <div className="max-w-2xl">
          <h1 className="font-heading text-[38px] lg:text-[48px] font-medium text-ink leading-tight">
            {title}
          </h1>
          <p className="text-muted text-[11px] uppercase tracking-[0.16em] font-body mt-2">
            {total} ürün
          </p>
          {tanitim && (
            <p className="text-[13px] font-body text-ink-soft leading-relaxed mt-3">
              {tanitim}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobil filtre girişi — masaüstünde kenar çubuğu zaten görünür */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-line bg-white font-body text-[12px] text-ink hover:border-accent-line transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filtrele
          </button>

          <select
            aria-label="Sıralama"
            value={currentParams.siralama || ''}
            onChange={(e) => updateParams({ siralama: e.target.value })}
            className="w-full sm:w-auto px-4 py-2 border border-line bg-white font-body text-[12px] text-ink focus:border-accent-line focus:outline-none transition-colors"
          >
            {SIRALAMA_SECENEKLERI.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aktif filtreler — listenin üstünde, mobilde de görünür */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted font-body mr-1">
            Filtreler
          </span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => updateParams(chip.clear)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-body text-ink bg-surface border border-line rounded-[4px] hover:border-ink transition-colors"
              aria-label={`${chip.label} filtresini kaldır`}
            >
              {chip.label}
              <X size={12} className="text-muted" />
            </button>
          ))}
          <button
            onClick={() => router.push(pathname)}
            className="text-[11px] font-body text-accent-deep underline underline-offset-4 hover:text-ink transition-colors ml-1"
          >
            Temizle
          </button>
        </div>
      )}

      {/* Daraltma çipleri — kategori içi alt gruplar (ayrı menü maddesi değil) */}
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => updateParams({ tip: '' })}
            className={`px-3 py-1.5 text-[11px] font-body border transition-colors ${
              !currentParams.tip
                ? 'border-accent-line text-accent-deep'
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
                  ? 'border-accent-line text-accent-deep'
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
              className="w-full py-3.5 bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium rounded-[4px] hover:bg-accent-deep transition-colors"
            >
              {total} ürünü göster
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar (masaüstü) */}
        <aside className="w-52 shrink-0 hidden lg:block">{filterPanel}</aside>

        {/* Product Grid.
            min-w-0 şart: flex çocuğunun varsayılan min-width:auto'su, içindeki
            en geniş satırın (sayfa numaraları) altına inmesini engelliyordu ve
            ızgara dar ekranda 568px'te sabitlenip viewport dışına taşıyordu. */}
        <div className="flex-1 min-w-0">
          {cards.length === 0 ? (
            <div className="text-center py-20 border border-line rounded-[4px] bg-surface px-6">
              <p className="eyebrow">Sonuç yok</p>
              <h2 className="font-heading text-[22px] font-semibold text-ink mt-2">
                Bu seçimlerle eşleşen parça bulamadık
              </h2>
              <p className="text-[12px] font-body text-muted mt-2">
                Filtreleri kaldırıp koleksiyonun tamamına göz atabilirsiniz.
              </p>
              <button
                onClick={() => router.push(pathname)}
                className="inline-flex items-center justify-center mt-6 bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {cards.map(({ product, optionCount }, i) => (
                  <div
                    key={product.id}
                    data-reveal
                    style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}
                  >
                    <ProductCardV2
                      product={product}
                      priority={i < 4}
                      optionCount={optionCount}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination — flex-wrap şart: 12 sayfalık numara şeridi tek
                  satırda 568px genişliğinde kalıyor ve dar ekranda ızgarayı
                  viewport dışına itiyordu. */}
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center gap-2 mt-12">
                  {/* Faz 11A: sayfa numaraları <button> + router.push idi —
                      arama motoru için tıklanabilir bağlantı değillerdi, yani
                      2. sayfadan sonraki ürünler taranamıyordu. Gerçek
                      <Link href="?sayfa=N"> oldu; davranış aynı, adres aynı. */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const params = new URLSearchParams(sp.toString())
                    params.set('sayfa', page.toString())
                    return (
                      <Link
                        key={page}
                        href={`${pathname}?${params.toString()}`}
                        scroll
                        // Faz 11A: 20 sayfalık listede her sayfa numarası ayrı
                        // bir RSC isteği açıyordu; müşteri en fazla birine
                        // tıklıyor. Bağlantı tarayıcı için görünür kalır
                        // (SEO değişmez), yalnız önden ısıtma kapanır.
                        prefetch={false}
                        aria-current={page === currentPage ? 'page' : undefined}
                        className={`flex h-10 w-10 items-center justify-center text-[12px] font-body transition-colors ${
                          page === currentPage
                            ? 'bg-ink text-bg'
                            : 'bg-surface-muted text-ink hover:bg-ink hover:text-bg'
                        }`}
                      >
                        {page}
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Yükleme iskeleti (Faz 11D denetimi).
 *
 * ÖLÇÜLEN KUSUR: Suspense fallback'i BOŞTU. Yavaş ağda kabuk (başlık+footer)
 * önce boyanıyor, liste stream edilince footer neredeyse tam sayfa boyu
 * aşağı itiliyordu — soğuk yüklemede CLS 0.83 (390px'te 0.88; "kötü" eşiği
 * 0.25). İskelet, gelecek içeriğin yerini baştan tutar; kayma sıfırlanır.
 */
function ListeIskeleti() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-12 lg:py-16" aria-hidden>
      <div className="animate-pulse">
        <div className="mb-8 border-b border-line pb-6">
          <div className="h-10 w-56 rounded bg-line/60" />
          <div className="mt-3 h-3 w-24 rounded bg-line/40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] rounded-[4px] bg-line/40" />
              <div className="mx-auto mt-3.5 h-3 w-3/4 rounded bg-line/40" />
              <div className="mx-auto mt-2 h-3 w-1/3 rounded bg-line/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProductsClient(props: ProductsClientProps) {
  return (
    <Suspense fallback={<ListeIskeleti />}>
      <ProductsInner {...props} />
    </Suspense>
  )
}
