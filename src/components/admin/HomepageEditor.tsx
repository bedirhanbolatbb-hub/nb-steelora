'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'

interface HomepageEditorProps {
  products: any[]
  settings: Record<string, string[]>
}

const SECTIONS = {
  hero_top: { label: 'Hero — Üst Görsel', single: true },
  hero_bottom_left: { label: 'Hero — Alt Sol', single: true },
  hero_bottom_right: { label: 'Hero — Alt Sağ', single: true },
  featured: { label: 'Öne Çıkan Parçalar', single: false, count: 4 },
  new_arrivals: { label: 'Yeni Gelenler', single: false, count: 4 },
  category_kolye: { label: 'Kategori — Kolye', single: true },
  category_kupe: { label: 'Kategori — Küpe', single: true },
  category_yuzuk: { label: 'Kategori — Yüzük', single: true },
  category_bileklik: { label: 'Kategori — Bileklik', single: true },
  category_setler: { label: 'Kategori — Setler', single: true },
} as const

type SectionKey = keyof typeof SECTIONS

export default function HomepageEditor({ products, settings: initialSettings }: HomepageEditorProps) {
  const [settings, setSettings] = useState<Record<string, string[]>>(initialSettings)
  const [picker, setPicker] = useState<{ section: SectionKey; slot: number } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [heroSingleMode, setHeroSingleMode] = useState(false)
  const [singlePicker, setSinglePicker] = useState(false)
  const [singleSearch, setSingleSearch] = useState('')
  // Featured order state
  const [featuredOrder, setFeaturedOrder] = useState<string[]>([])
  const [orderSearch, setOrderSearch] = useState('')
  const [orderSaving, setOrderSaving] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)

  // Load hero_single_mode and featured_order from site_content on mount
  useEffect(() => {
    fetch('/api/admin/content')
      .then((r) => r.json())
      .then(({ data }) => {
        const singleRow = data?.find((r: any) => r.key === 'hero_single_mode')
        if (singleRow?.value === 'true') setHeroSingleMode(true)
        const orderRow = data?.find((r: any) => r.key === 'featured_order')
        if (orderRow?.value) {
          try { setFeaturedOrder(JSON.parse(orderRow.value)) } catch { /* ignore */ }
        }
      })
  }, [])

  const getProduct = (id: string) => products.find((p) => p.id === id)
  const getImage = (section: string, slot = 0) => {
    const ids = settings[section] || []
    const p = getProduct(ids[slot])
    return p?.display_images?.[0] || p?.trendyol_images?.[0] || null
  }

  // The product currently assigned to all 3 hero slots (single mode)
  const heroSingleProductId = settings['hero_top']?.[0] || null
  const heroSingleProduct = heroSingleProductId ? getProduct(heroSingleProductId) : null
  const heroSingleImage = heroSingleProduct
    ? heroSingleProduct.display_images?.[0] || heroSingleProduct.trendyol_images?.[0] || null
    : null

  const selectProduct = (productId: string) => {
    if (!picker) return
    const { section, slot } = picker
    const ids = [...(settings[section] || [])]
    ids[slot] = productId
    setSettings({ ...settings, [section]: ids })
    setPicker(null)
    setPickerSearch('')
  }

  const selectSingleProduct = (productId: string) => {
    setSettings({
      ...settings,
      hero_top: [productId],
      hero_bottom_left: [productId],
      hero_bottom_right: [productId],
    })
    setSinglePicker(false)
    setSingleSearch('')
  }

  const toggleSingleMode = (enabled: boolean) => {
    setHeroSingleMode(enabled)
    // When turning on: if there's already a selection in hero_top, propagate to others
    if (enabled) {
      const existingId = settings['hero_top']?.[0]
      if (existingId) {
        setSettings({
          ...settings,
          hero_bottom_left: [existingId],
          hero_bottom_right: [existingId],
        })
      }
    }
  }

  const saveAll = async () => {
    setSaving(true)
    // Save homepage section settings
    for (const [section, ids] of Object.entries(settings)) {
      await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, product_ids: ids }),
      })
    }
    // Save hero_single_mode to site_content
    await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hero_single_mode', value: heroSingleMode ? 'true' : 'false' }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Featured order helpers ────────────────────────────────────────────────
  const featuredIds = settings.featured || []

  // All IDs in display order: featuredOrder first, then any pinned IDs not yet listed
  const orderedFeaturedIds = [
    ...featuredOrder,
    ...featuredIds.filter((id) => !featuredOrder.includes(id)),
  ]

  const moveOrder = (index: number, dir: -1 | 1) => {
    const next = [...orderedFeaturedIds]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setFeaturedOrder(next)
  }

  const shuffleOrder = () => {
    const shuffled = [...orderedFeaturedIds]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setFeaturedOrder(shuffled)
  }

  const saveOrder = async () => {
    setOrderSaving(true)
    await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'featured_order', value: JSON.stringify(orderedFeaturedIds) }),
    })
    setFeaturedOrder(orderedFeaturedIds)
    setOrderSaving(false)
    setOrderSaved(true)
    setTimeout(() => setOrderSaved(false), 2000)
  }

  const filteredOrderProducts = products.filter((p: any) => {
    if (!p.is_active) return false
    if (!orderSearch) return true
    const q = orderSearch.toLowerCase()
    return p.display_title?.toLowerCase().includes(q) || (p.trendyol_barcode || '').toLowerCase().includes(q)
  })

  const filteredPicker = products.filter((p: any) => {
    if (!p.is_active) return false
    if (!pickerSearch) return true
    const q = pickerSearch.toLowerCase()
    return (
      p.display_title?.toLowerCase().includes(q) ||
      (p.trendyol_barcode || '').toLowerCase().includes(q)
    )
  })

  const filteredSinglePicker = products.filter((p: any) => {
    if (!p.is_active) return false
    if (!singleSearch) return true
    const q = singleSearch.toLowerCase()
    return (
      p.display_title?.toLowerCase().includes(q) ||
      (p.trendyol_barcode || '').toLowerCase().includes(q)
    )
  })

  const Slot = ({ section, slot = 0, className, aspectClass = 'aspect-square' }: { section: SectionKey; slot?: number; className?: string; aspectClass?: string }) => {
    const img = getImage(section, slot)
    const ids = settings[section] || []
    const p = getProduct(ids[slot])
    return (
      <div
        className={`relative group cursor-pointer overflow-hidden bg-champagne-dark ${aspectClass} ${className || ''}`}
        onClick={() => { setPicker({ section, slot }); setPickerSearch('') }}
      >
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-[9px] text-text-muted font-body uppercase tracking-wider">
            Boş
          </div>
        )}
        <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-[11px] font-body">✎ Değiştir</span>
        </div>
        {p && (
          <div className="absolute bottom-0 left-0 right-0 bg-dark/70 px-2 py-1">
            <p className="text-[8px] text-champagne truncate">{p.display_title}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-[24px] text-text-primary">Ana Sayfa Düzenleyici</h2>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-6 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : saved ? 'Kaydedildi ✓' : 'Tüm Değişiklikleri Kaydet'}
        </button>
      </div>

      {/* Preview at 70% scale */}
      <div className="bg-white border border-champagne-mid p-4 origin-top-left" style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '117.6%' }}>

        {/* ── Hero ── */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-body text-gold uppercase tracking-widest">Hero Bölümü</p>
          {/* Single mode toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[9px] font-body text-text-muted uppercase tracking-wider">Tek Ürün Modu</span>
            <button
              type="button"
              onClick={() => toggleSingleMode(!heroSingleMode)}
              className={`relative w-9 h-5 rounded-full transition-colors ${heroSingleMode ? 'bg-gold' : 'bg-champagne-mid'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${heroSingleMode ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1 mb-6">
          <div className="bg-dark-mid p-6 flex flex-col justify-center">
            <span className="text-[8px] text-gold uppercase tracking-widest font-body">Yeni Koleksiyon — 2026</span>
            <p className="font-heading text-[24px] text-champagne font-light leading-tight mt-2">
              Her anın <span className="italic text-gold">zarif</span> tanığı
            </p>
          </div>

          {heroSingleMode ? (
            /* Single product mode: one click area fills all 3 slots */
            <div
              className="relative group cursor-pointer overflow-hidden bg-champagne-dark"
              onClick={() => { setSinglePicker(true); setSingleSearch('') }}
            >
              {heroSingleImage ? (
                <img src={heroSingleImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
                  <span className="text-[20px]">+</span>
                  <span className="text-[9px] font-body uppercase tracking-wider">Ürün Seç</span>
                </div>
              )}
              <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/60 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-1">
                <span className="text-white text-[11px] font-body">✎ Değiştir</span>
                <span className="text-white/60 text-[9px] font-body">3 slota uygulanır</span>
              </div>
              {heroSingleProduct && (
                <div className="absolute bottom-0 left-0 right-0 bg-dark/70 px-2 py-1">
                  <p className="text-[8px] text-champagne truncate">{heroSingleProduct.display_title}</p>
                </div>
              )}
            </div>
          ) : (
            /* Normal mode: 3 separate slots */
            <div className="grid grid-rows-2 grid-cols-2 gap-1">
              <div className="col-span-2">
                <Slot section="hero_top" aspectClass="aspect-[2/1]" />
              </div>
              <Slot section="hero_bottom_left" />
              <Slot section="hero_bottom_right" />
            </div>
          )}
        </div>

        {/* ── Öne Çıkan ── */}
        <p className="text-[9px] font-body text-gold uppercase tracking-widest mb-2">Öne Çıkan Parçalar</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot}>
              <Slot section="featured" slot={slot} aspectClass="aspect-[3/4]" />
              <p className="text-[9px] font-body text-text-primary mt-1 truncate">
                {getProduct((settings.featured || [])[slot])?.display_title || '—'}
              </p>
            </div>
          ))}
        </div>

        {/* ── Kategoriler ── */}
        <p className="text-[9px] font-body text-gold uppercase tracking-widest mb-2">Kategoriler</p>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {(['category_kolye', 'category_kupe', 'category_yuzuk', 'category_bileklik', 'category_setler'] as const).map((key) => (
            <div key={key}>
              <Slot section={key} />
              <p className="text-[9px] font-body text-text-primary mt-1 text-center">
                {SECTIONS[key].label.replace('Kategori — ', '')}
              </p>
            </div>
          ))}
        </div>

        {/* ── Yeni Gelenler ── */}
        <p className="text-[9px] font-body text-gold uppercase tracking-widest mb-2">Yeni Gelenler</p>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot}>
              <Slot section="new_arrivals" slot={slot} aspectClass="aspect-[3/4]" />
              <p className="text-[9px] font-body text-text-primary mt-1 truncate">
                {getProduct((settings.new_arrivals || [])[slot])?.display_title || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Order Editor ── */}
      {orderedFeaturedIds.length > 0 && (
        <div className="mt-6 border border-champagne-mid bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-[16px] text-text-primary">Öne Çıkan — Carousel Sırası</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={shuffleOrder}
                className="px-3 py-1.5 border border-champagne-mid text-[11px] font-body text-text-muted hover:border-gold hover:text-gold transition-colors"
              >
                ⇌ Rastgele Sırala
              </button>
              <button
                onClick={saveOrder}
                disabled={orderSaving}
                className="px-4 py-1.5 bg-gold text-white text-[11px] font-body uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {orderSaving ? 'Kaydediliyor...' : orderSaved ? 'Kaydedildi ✓' : 'Sırayı Kaydet'}
              </button>
            </div>
          </div>

          {/* Ordered list */}
          <div className="divide-y divide-champagne-mid/30 mb-4">
            {orderedFeaturedIds.map((id, i) => {
              const p = getProduct(id)
              if (!p) return null
              const img = p.display_images?.[0] || p.trendyol_images?.[0]
              return (
                <div key={id} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-[10px] font-body text-text-muted text-right shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 bg-champagne-dark shrink-0 overflow-hidden">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="flex-1 text-[12px] font-body truncate">{p.display_title}</p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => moveOrder(i, -1)}
                      disabled={i === 0}
                      className="w-6 h-6 flex items-center justify-center border border-champagne-mid text-[10px] hover:border-gold hover:text-gold disabled:opacity-30 transition-colors"
                    >↑</button>
                    <button
                      onClick={() => moveOrder(i, 1)}
                      disabled={i === orderedFeaturedIds.length - 1}
                      className="w-6 h-6 flex items-center justify-center border border-champagne-mid text-[10px] hover:border-gold hover:text-gold disabled:opacity-30 transition-colors"
                    >↓</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Search to add unlisted products */}
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Listeye ürün ekle — adı veya barkod ile ara..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
              />
              {orderSearch && (
                <button onClick={() => setOrderSearch('')} className="px-3 py-2 border border-champagne-mid text-[11px] font-body text-text-muted hover:border-gold hover:text-gold transition-colors">✕</button>
              )}
            </div>
            {orderSearch && (
              <div className="absolute bottom-full left-0 right-0 mb-1 border border-champagne-mid bg-white max-h-64 overflow-y-auto z-10 shadow-md">
                {filteredOrderProducts
                  .filter((p: any) => !orderedFeaturedIds.includes(p.id))
                  .slice(0, 20)
                  .map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setFeaturedOrder([...orderedFeaturedIds, p.id])}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-champagne transition-colors text-left border-b border-champagne-mid/30"
                    >
                      <div className="w-8 h-8 bg-champagne-dark shrink-0 overflow-hidden">
                        {(p.display_images?.[0] || p.trendyol_images?.[0]) && (
                          <img src={p.display_images?.[0] || p.trendyol_images?.[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <p className="text-[12px] font-body truncate">{p.display_title}</p>
                      <span className="ml-auto text-[10px] font-body text-gold shrink-0">+ Ekle</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Normal slot picker modal ── */}
      {picker && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-champagne-mid">
              <h3 className="font-heading text-[18px]">
                {SECTIONS[picker.section].label}
                {!SECTIONS[picker.section].single && ` — Slot ${picker.slot + 1}`}
              </h3>
              <button onClick={() => setPicker(null)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <div className="px-4 py-2 border-b border-champagne-mid">
              <input
                type="text"
                placeholder="Ürün adı veya barkod ile ara..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredPicker.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-champagne transition-colors text-left border-b border-champagne-mid/30"
                >
                  <div className="w-12 h-12 bg-champagne-dark shrink-0 overflow-hidden">
                    {(p.display_images?.[0] || p.trendyol_images?.[0]) && (
                      <img src={p.display_images?.[0] || p.trendyol_images?.[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-body truncate">{p.display_title}</p>
                    <p className="text-[10px] text-text-muted font-body">
                      {p.trendyol_barcode || ''} · {p.trendyol_category} · {formatPrice(p.custom_price ?? p.display_price)}
                    </p>
                  </div>
                </button>
              ))}
              {filteredPicker.length === 0 && (
                <p className="p-4 text-center text-text-muted text-[12px] font-body">Ürün bulunamadı</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Single mode picker modal ── */}
      {singlePicker && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-champagne-mid">
              <div>
                <h3 className="font-heading text-[18px]">Tek Ürün — Hero</h3>
                <p className="text-[10px] font-body text-text-muted mt-0.5">Seçilen ürün 3 slota da uygulanır</p>
              </div>
              <button onClick={() => setSinglePicker(false)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <div className="px-4 py-2 border-b border-champagne-mid">
              <input
                type="text"
                placeholder="Ürün adı veya barkod ile ara..."
                value={singleSearch}
                onChange={(e) => setSingleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredSinglePicker.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => selectSingleProduct(p.id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-champagne transition-colors text-left border-b border-champagne-mid/30 ${heroSingleProductId === p.id ? 'bg-gold/10' : ''}`}
                >
                  <div className="w-12 h-12 bg-champagne-dark shrink-0 overflow-hidden">
                    {(p.display_images?.[0] || p.trendyol_images?.[0]) && (
                      <img src={p.display_images?.[0] || p.trendyol_images?.[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-body truncate">{p.display_title}</p>
                    <p className="text-[10px] text-text-muted font-body">
                      {p.trendyol_barcode || ''} · {p.trendyol_category} · {formatPrice(p.custom_price ?? p.display_price)}
                    </p>
                  </div>
                  {heroSingleProductId === p.id && (
                    <span className="text-gold text-[10px] font-body shrink-0">✓ Seçili</span>
                  )}
                </button>
              ))}
              {filteredSinglePicker.length === 0 && (
                <p className="p-4 text-center text-text-muted text-[12px] font-body">Ürün bulunamadı</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
