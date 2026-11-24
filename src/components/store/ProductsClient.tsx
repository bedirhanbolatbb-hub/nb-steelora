'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { FiyatKovasi } from '@/lib/catalog/fiyatKovalari'
import { useCallback, useEffect, useState, Suspense } from 'react'
import { Check, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import ProductCardV2 from './ProductCardV2'
import { kaydirmaKilidi } from '@/lib/ui/kaydirmaKilidi'
import type { Product } from '@/types'

const SIRALAMA_SECENEKLERI = [
  { value: '', label: 'Önerilen' },
  { value: 'yeni', label: 'En yeni' },
  { value: 'fiyat-artan', label: 'Fiyat: düşükten yükseğe' },
  { value: 'fiyat-azalan', label: 'Fiyat: yüksekten düşüğe' },
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
  /** Listede gerçekten bulunan malzemeler (24 Kas 2026); boşsa süzgeç basılmaz. */
  malzemeler?: { value: string; label: string }[]
  /** Listede gerçekten bulunan renk grupları (24 Kas 2026); boşsa süzgeç basılmaz. */
  renkler?: { value: string; label: string }[]
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

/**
 * Sayfa numaraları — 24 Kas 2026 tasarım denetimi.
 * Eskiden bütün numaralar basılıyordu: 12 sayfa telefonda iki satır tutuyor,
 * önceki/sonraki yoktu. Artık ilk, son ve bulunulan sayfanın komşuları;
 * aradaki boşluk "…". Her sayfa önceki/sonraki ile zincirleme taranabilir
 * kalır (bağlantılar gerçek <a>).
 */
function sayfaListesi(toplam: number, su: number): (number | 'bosluk')[] {
  if (toplam <= 5) return Array.from({ length: toplam }, (_, i) => i + 1)
  const sirali = [...new Set([1, su - 1, su, su + 1, toplam])]
    .filter((n) => n >= 1 && n <= toplam)
    .sort((a, b) => a - b)
  const liste: (number | 'bosluk')[] = []
  sirali.forEach((n, i) => {
    if (i > 0 && n - sirali[i - 1] > 1) liste.push('bosluk')
    liste.push(n)
  })
  return liste
}

/** Süzgeç satırı — seçili hâl sitenin her yerinde aynı: mürekkep + onay imi. */
function Secenek({
  secili,
  onClick,
  children,
}: {
  secili: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={secili}
      className={`flex min-h-[44px] w-full items-center justify-between gap-3 text-left font-body text-[15px] transition-colors lg:min-h-[36px] lg:text-[14px] ${
        secili ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      <span>{children}</span>
      {secili && <Check size={16} strokeWidth={1.75} className="shrink-0 text-ink" aria-hidden />}
    </button>
  )
}

const SUZGEC_BASLIGI = 'mb-1 font-body text-[12px] font-semibold uppercase tracking-[0.1em] text-ink'

function ProductsInner({
  cards,
  total,
  categories,
  fiyatAraliklari,
  malzemeler = [],
  renkler = [],
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
  // Süzgeç sayfası açıkken arkadaki liste kaymaz (ortak yardımcı).
  useEffect(() => kaydirmaKilidi(filtersOpen), [filtersOpen])

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
      const sorgu = params.toString()
      router.push(sorgu ? `${pathname}?${sorgu}` : pathname)
    },
    [sp, pathname, router]
  )

  const totalPages = Math.ceil(total / perPage)

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
  const qsMalzeme = sp.get('malzeme') || ''
  const qsRenk = sp.get('renk') || ''

  const priceLabel = (() => {
    if (qsMin && qsMax) return `${qsMin}–${qsMax} ₺`
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
    ...(qsMalzeme
      ? [
          {
            key: 'malzeme',
            label: malzemeler.find((m) => m.value === qsMalzeme)?.label ?? qsMalzeme,
            clear: { malzeme: '' },
          },
        ]
      : []),
    // Renk çipi yalnız seçenek gerçekten varsa basılır: renk verisi yokken
    // adreste kalan eski bir parametre listeyi süzmez, çipi de olmamalı.
    ...(qsRenk && renkler.some((r) => r.value === qsRenk)
      ? [
          {
            key: 'renk',
            label: renkler.find((r) => r.value === qsRenk)?.label ?? qsRenk,
            clear: { renk: '' },
          },
        ]
      : []),
    ...(priceLabel
      ? [{ key: 'fiyat', label: priceLabel, clear: { min_fiyat: '', max_fiyat: '' } }]
      : []),
  ]

  // Aynı filtre bloğu hem masaüstü kenar çubuğunda hem mobil sayfada kullanılır.
  // Kategori sayfasında tek kategori gelir: seçilecek bir şey olmadığı için
  // o bölüm basılmaz (eskiden hiçbir şey yapmayan "Tümü" satırı duruyordu).
  const filterPanel = (
    <div className="space-y-6">
      {categories.length > 1 && (
        <div>
          <h3 className={SUZGEC_BASLIGI}>Kategori</h3>
          <Secenek secili={!currentParams.kategori} onClick={() => updateParams({ kategori: '' })}>
            Tümü
          </Secenek>
          {categories.map((cat) => (
            <Secenek
              key={cat}
              secili={currentParams.kategori === cat}
              onClick={() => updateParams({ kategori: cat })}
            >
              {cat}
            </Secenek>
          ))}
        </div>
      )}

      {/* Malzeme (24 Kas 2026): yalnız listede gerçekten bulunanlar. */}
      {malzemeler.length > 0 && (
        <div>
          <h3 className={SUZGEC_BASLIGI}>Malzeme</h3>
          <Secenek secili={!currentParams.malzeme} onClick={() => updateParams({ malzeme: '' })}>
            Tümü
          </Secenek>
          {malzemeler.map((m) => (
            <Secenek
              key={m.value}
              secili={currentParams.malzeme === m.value}
              onClick={() => updateParams({ malzeme: m.value })}
            >
              {m.label}
            </Secenek>
          ))}
        </div>
      )}

      {/* Renk (24 Kas 2026): Trendyol'un renk bilgisinden; yalnız listede
          gerçekten bulunan gruplar. "Altın rengi" malzeme değil renktir. */}
      {renkler.length > 0 && (
        <div>
          <h3 className={SUZGEC_BASLIGI}>Renk</h3>
          <Secenek secili={!currentParams.renk} onClick={() => updateParams({ renk: '' })}>
            Tümü
          </Secenek>
          {renkler.map((r) => (
            <Secenek
              key={r.value}
              secili={currentParams.renk === r.value}
              onClick={() => updateParams({ renk: r.value })}
            >
              {r.label}
            </Secenek>
          ))}
        </div>
      )}

      {/* Fiyat aralığı — kovalar GÖSTERİLEN fiyattan türer (Faz 11A-FIX · F5).
          Kampanya varken liste fiyatından türeyen kovalar kartta yazan rakamla
          uyuşmuyordu; sınırlar sunucuda liste fiyatına geri çevriliyor. */}
      {fiyatAraliklari.length > 1 && (
        <div>
          <h3 className={SUZGEC_BASLIGI}>Fiyat</h3>
          {fiyatAraliklari.map((range) => (
            <Secenek
              key={range.label}
              secili={
                (currentParams.min_fiyat || '') === range.min &&
                (currentParams.max_fiyat || '') === range.max
              }
              onClick={() => updateParams({ min_fiyat: range.min, max_fiyat: range.max })}
            >
              {range.label}
            </Secenek>
          ))}
        </div>
      )}

      {/* Faz 11A-FIX (F5): "Sadece stokta olanlar" kutusu KALDIRILDI.
          Stok sıfıra düşen ürünü senkron zaten pasife çekiyor; kutu her zaman
          aynı listeyi veriyordu — müşteriye iş çıkarıp hiçbir şey değiştirmeyen
          bir filtreydi. */}
    </div>
  )

  const sayfaAdresi = (n: number) => {
    const params = new URLSearchParams(sp.toString())
    if (n <= 1) params.delete('sayfa')
    else params.set('sayfa', String(n))
    const sorgu = params.toString()
    return sorgu ? `${pathname}?${sorgu}` : pathname
  }
  const SAYFA_KUTUSU =
    'flex h-11 min-w-[44px] items-center justify-center rounded-[4px] px-2 font-body text-[14px] transition-colors'

  return (
    // Faz 36: mobilde ilk ürün satırı ekranın %40'ından sonra başlıyordu
    // (375×812: 48px üst boşluk + 38px başlık + tanıtım + kontroller). Liste
    // sayfasının işi ürün göstermek — mobil başlık sıkılaştırıldı, masaüstü
    // aynı kaldı.
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-4 pb-12 sm:pt-10 lg:py-14">
      {/* Kırıntı yolu sunucuda üretilip buraya geçirilir: JsonLd bir SUNUCU
          bileşeni (headers() ile nonce okuyor), istemci bileşeninin içinde
          çağrılamaz — ama prop olarak taşınabilir (Faz 11F son). */}
      {ustSerit}

      {/* Sayfa başı — 24 Kas 2026: başlık, tek cümle tanıtım; sayı ve sıralama
          bir alt satırda. Büyük harfli 11 px sayaç ve çift çizgi kalktı. */}
      <div className="mb-4 sm:mb-6">
        <h1 className="font-heading text-[28px] sm:text-[36px] lg:text-[44px] font-medium text-ink leading-tight">
          {title}
        </h1>
        {tanitim && (
          <p className="mt-2 max-w-2xl font-body text-[14px] leading-relaxed text-ink-soft line-clamp-2 sm:line-clamp-none">
            {tanitim}
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-line py-2.5 sm:mb-6">
        <p className="order-3 w-full font-body text-[13px] text-muted sm:order-1 sm:w-auto" aria-live="polite">
          {total} ürün
        </p>

        {/* Mobilde Filtrele ve Sıralama yan yana eşit iki düğme (44px). */}
        <div className="order-1 grid w-full grid-cols-2 gap-2 sm:order-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
          {/* Mobil filtre girişi — masaüstünde kenar çubuğu zaten görünür */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex h-11 items-center justify-center gap-2 rounded-[4px] border border-line-strong bg-white px-4 font-body text-[14px] font-medium text-ink transition-colors hover:border-ink"
          >
            <SlidersHorizontal size={16} strokeWidth={1.6} aria-hidden />
            Filtrele{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
          </button>

          {/* 16 px: iOS, 16 px'ten küçük alanlara dokununca sayfayı yakınlaştırır. */}
          <select
            aria-label="Sıralama"
            value={currentParams.siralama || ''}
            onChange={(e) => updateParams({ siralama: e.target.value })}
            className="h-11 w-full rounded-[4px] border border-line-strong bg-white px-3 font-body text-[16px] text-ink transition-colors focus:border-ink focus:outline-none sm:w-auto sm:text-[14px]"
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
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => updateParams(chip.clear)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[4px] border border-ink bg-surface-muted px-3 font-body text-[13px] text-ink transition-colors hover:bg-surface"
              aria-label={`${chip.label} filtresini kaldır`}
            >
              {chip.label}
              <X size={14} className="text-ink-soft" aria-hidden />
            </button>
          ))}
          <button
            onClick={() => router.push(pathname)}
            className="ml-1 flex min-h-[36px] items-center font-body text-[13px] text-ink underline decoration-accent underline-offset-4 transition-colors hover:text-accent-deep"
          >
            Temizle
          </button>
        </div>
      )}

      {/* Daraltma çipleri — kategori içi alt gruplar (ayrı menü maddesi değil) */}
      {chips && chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => updateParams({ tip: '' })}
            aria-pressed={!currentParams.tip}
            className={`min-h-[40px] rounded-[4px] border px-4 font-body text-[14px] transition-colors ${
              !currentParams.tip
                ? 'border-ink bg-surface-muted font-medium text-ink'
                : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            Tümü
          </button>
          {chips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => updateParams({ tip: currentParams.tip === chip.value ? '' : chip.value })}
              aria-pressed={currentParams.tip === chip.value}
              className={`min-h-[40px] rounded-[4px] border px-4 font-body text-[14px] transition-colors ${
                currentParams.tip === chip.value
                  ? 'border-ink bg-surface-muted font-medium text-ink'
                  : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobil süzgeç sayfası — masaüstü kenar çubuğuyla aynı filtreler.
          24 Kas 2026: başlık ve "ürünü göster" düğmesi sabit, yalnız ortası
          kayar (eskiden içerik 13 px taşıyor, düğme kaydırınca kayboluyordu). */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtrele">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[10px] bg-bg">
            <div className="flex shrink-0 items-center justify-between border-b border-line py-1.5 pl-5 pr-2">
              <span className="font-body text-[16px] font-medium text-ink">Filtrele</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
                aria-label="Kapat"
              >
                <X size={22} strokeWidth={1.6} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{filterPanel}</div>
            <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => setFiltersOpen(false)}
                className="basis flex min-h-[52px] w-full items-center justify-center rounded-[4px] bg-ink font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep"
              >
                {total} ürünü göster
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-10">
        {/* Sidebar (masaüstü) */}
        <aside className="w-52 shrink-0 hidden lg:block">{filterPanel}</aside>

        {/* Product Grid.
            min-w-0 şart: flex çocuğunun varsayılan min-width:auto'su, içindeki
            en geniş satırın (sayfa numaraları) altına inmesini engelliyordu ve
            ızgara dar ekranda 568px'te sabitlenip viewport dışına taşıyordu. */}
        <div className="flex-1 min-w-0">
          {cards.length === 0 ? (
            <div className="rounded-[4px] border border-line bg-surface px-6 py-16 text-center">
              <h2 className="font-heading text-[22px] font-medium text-ink">
                Bu seçimlerle eşleşen ürün bulamadık
              </h2>
              <p className="mt-2 font-body text-[14px] text-ink-soft">
                Filtreleri kaldırıp tüm ürünlere göz atabilirsiniz.
              </p>
              <button
                onClick={() => router.push(pathname)}
                className="basis mt-6 inline-flex min-h-[48px] items-center justify-center rounded-[4px] bg-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
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

              {/* Sayfalama — Faz 11A: numaralar gerçek <Link> (arama motoru
                  2. sayfadan sonrasını da tarar); önden ısıtma kapalı.
                  24 Kas 2026: önceki/sonraki eklendi, numaralar pencereli;
                  telefonda bulunulan sayfanın komşuları gizlenir, tek satır. */}
              {totalPages > 1 && (
                <nav aria-label="Sayfalar" className="mt-12 flex items-center justify-center gap-1">
                  {currentPage > 1 ? (
                    <Link
                      href={sayfaAdresi(currentPage - 1)}
                      scroll
                      prefetch={false}
                      rel="prev"
                      aria-label="Önceki sayfa"
                      className={`${SAYFA_KUTUSU} text-ink hover:bg-surface-muted`}
                    >
                      <ChevronLeft size={18} strokeWidth={1.6} aria-hidden />
                    </Link>
                  ) : (
                    <span aria-hidden className={`${SAYFA_KUTUSU} text-line-strong`}>
                      <ChevronLeft size={18} strokeWidth={1.6} />
                    </span>
                  )}
                  {sayfaListesi(totalPages, currentPage).map((n, i) =>
                    n === 'bosluk' ? (
                      <span key={`b${i}`} aria-hidden className="flex h-11 w-6 items-center justify-center font-body text-[14px] text-muted">
                        …
                      </span>
                    ) : (
                      <Link
                        key={n}
                        href={sayfaAdresi(n)}
                        scroll
                        prefetch={false}
                        aria-current={n === currentPage ? 'page' : undefined}
                        aria-label={`${n}. sayfa`}
                        className={`${SAYFA_KUTUSU} ${
                          n === currentPage
                            ? 'bg-ink font-medium text-white'
                            : 'text-ink hover:bg-surface-muted'
                        } ${
                          // Telefonda komşular gizli: "‹ 1 … 5 … 12 ›" tek satıra sığar.
                          Math.abs(n - currentPage) === 1 && n !== 1 && n !== totalPages ? 'hidden sm:flex' : ''
                        }`}
                      >
                        {n}
                      </Link>
                    )
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={sayfaAdresi(currentPage + 1)}
                      scroll
                      prefetch={false}
                      rel="next"
                      aria-label="Sonraki sayfa"
                      className={`${SAYFA_KUTUSU} text-ink hover:bg-surface-muted`}
                    >
                      <ChevronRight size={18} strokeWidth={1.6} aria-hidden />
                    </Link>
                  ) : (
                    <span aria-hidden className={`${SAYFA_KUTUSU} text-line-strong`}>
                      <ChevronRight size={18} strokeWidth={1.6} />
                    </span>
                  )}
                </nav>
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
              <div className="mt-3.5 h-3 w-3/4 rounded bg-line/40" />
              <div className="mt-2 h-3 w-1/3 rounded bg-line/30" />
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
