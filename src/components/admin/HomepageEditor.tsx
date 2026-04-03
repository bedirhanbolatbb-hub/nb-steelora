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

const LS_KEY = 'admin_sections'

export default function HomepageEditor({ products, settings: initialSettings }: HomepageEditorProps) {
  const [settings, setSettings] = useState<Record<string, string[]>>(initialSettings)
  const [picker, setPicker] = useState<{ section: SectionKey; slot: number } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [heroSingleMode, setHeroSingleMode] = useState(false)
  const [singlePicker, setSinglePicker] = useState(false)
  const [singleSearch, setSingleSearch] = useState('')
  const [featuredOrder, setFeaturedOrder] = useState<string[]>([])
  const [orderSearch, setOrderSearch] = useState('')
  const [orderSaving, setOrderSaving] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) setOpenSections(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/admin/content')
      .then((r) => r.json())
      .then(({ data }) => {
        const singleRow = data?.find((r: any) => r.key === 'hero_single_mode')
        if (singleRow?.value === 'true') setHeroSingleMode(true)
        const orderRow = data?.find((r: any) => r.key === 'featured_order')
        if (orderRow?.value) {
          try { setFeaturedOrder(JSON.parse(orderRow.value)) } catch {}
        }
      })
  }, [])

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const getProduct = (id: string) => products.find((p) => p.id === id)
  const getImage = (section: string, slot = 0) => {
    const ids = settings[section] || []
    const p = getProduct(ids[slot])
    return p?.display_images?.[0] || p?.trendyol_images?.[0] || null
  }

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
    if (enabled) {
      const existingId = settings['hero_top']?.[0]
      if (existingId) {
        setSettings({ ...settings, hero_bottom_left: [existingId], hero_bottom_right: [existingId] })
      }
    }
  }

  const saveAll = async () => {
    setSaving(true)
    for (const [section, ids] of Object.entries(settings)) {
      await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, product_ids: ids }),
      })
    }
    await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hero_single_mode', value: heroSingleMode ? 'true' : 'false' }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const featuredIds = settings.featured || []
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
    return p.display_title?.toLowerCase().includes(q) || (p.trendyol_barcode || '').toLowerCase().includes(q)
  })

  const filteredSinglePicker = products.filter((p: any) => {
    if (!p.is_active) return false
    if (!singleSearch) return true
    const q = singleSearch.toLowerCase()
    return p.display_title?.toLowerCase().includes(q) || (p.trendyol_barcode || '').toLowerCase().includes(q)
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
          <div className="flex items-center justify-center h-full text-[8px] text-text-muted font-body uppercase tracking-wider">Boş</div>
        )}
        <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-[8px] font-body">✎</span>
        </div>
        {p && (
          <div className="absolute bottom-0 left-0 right-0 bg-dark/70 px-1 py-0.5">
            <p className="text-[7px] text-champagne truncate">{p.display_title}</p>
          </div>
        )}
      </div>
    )
  }

  const AccordionHeader = ({ sectionKey, label }: { sectionKey: string; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between px-2 py-1.5 bg-white hover:bg-champagne/50 transition-colors"
    >
      <span className="text-xs font-semibold font-body text-text-primary">{label}</span>
      <span className="text-text-muted text-[10px]">{openSections[sectionKey] ? '▲' : '▼'}</span>
    </button>
  )

  const inputCls = 'flex-1 px-2 py-1 border border-champagne-mid bg-white font-body text-xs text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-body text-xs font-semibold text-text-primary">Ana Sayfa Düzenleyici</h2>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-2 py-1 bg-gold text-white text-xs uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : saved ? 'Kaydedildi ✓' : 'Kaydet'}
        </button>
      </div>

      {/* ── Görsel Editör accordion ── */}
      <div className="border border-champagne-mid mb-2">
        <AccordionHeader sectionKey="editor" label="Görsel Editör" />
        {openSections['editor'] && (
          <div className="bg-white border-t border-champagne-mid p-2">
            {/* Tek Ürün toggle — outside the scaled area so it stays clickable at real size */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Görsel Önizleme</p>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <span className="text-[10px] font-body text-text-muted">Tek Ürün</span>
                <button
                  type="button"
                  onClick={() => toggleSingleMode(!heroSingleMode)}
                  className={`relative w-7 h-4 rounded-full transition-colors ${heroSingleMode ? 'bg-gold' : 'bg-champagne-mid'}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${heroSingleMode ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>

            {/* Scaled preview container */}
            <div className="overflow-hidden" style={{ height: '420px' }}>
              <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: '222%' }}>

                {/* Hero */}
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">Hero</p>
                <div className="grid grid-cols-2 gap-1 mb-3 max-h-[260px] overflow-hidden">
                  <div className="bg-champagne-dark p-4 flex flex-col justify-center min-h-[160px]">
                    <span className="text-[10px] text-gold uppercase tracking-widest font-body">Yeni Koleksiyon — 2026</span>
                    <p className="font-body text-xl text-text-primary font-light leading-tight mt-2">
                      Her anın <span className="italic text-gold">zarif</span> tanığı
                    </p>
                  </div>
                  {heroSingleMode ? (
                    <div
                      className="relative group cursor-pointer overflow-hidden bg-champagne-dark min-h-[160px]"
                      onClick={() => { setSinglePicker(true); setSingleSearch('') }}
                    >
                      {heroSingleImage ? (
                        <img src={heroSingleImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
                          <span className="text-2xl">+</span>
                          <span className="text-xs font-body uppercase">Ürün Seç</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/60 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-1">
                        <span className="text-white text-xs font-body">✎ Değiştir</span>
                        <span className="text-white/60 text-[10px] font-body">3 slota uygulanır</span>
                      </div>
                      {heroSingleProduct && (
                        <div className="absolute bottom-0 left-0 right-0 bg-dark/70 px-2 py-1">
                          <p className="text-[10px] text-champagne truncate">{heroSingleProduct.display_title}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-rows-2 grid-cols-2 gap-1">
                      <div className="col-span-2">
                        <Slot section="hero_top" aspectClass="aspect-[2/1]" />
                      </div>
                      <Slot section="hero_bottom_left" />
                      <Slot section="hero_bottom_right" />
                    </div>
                  )}
                </div>

                {/* Öne Çıkan */}
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">Öne Çıkan</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[0, 1, 2, 3].map((slot) => (
                    <div key={slot}>
                      <Slot section="featured" slot={slot} aspectClass="aspect-[3/4]" />
                      <p className="text-[10px] font-body text-text-primary mt-1 truncate">
                        {getProduct((settings.featured || [])[slot])?.display_title || '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Kategoriler */}
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">Kategoriler</p>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {(['category_kolye', 'category_kupe', 'category_yuzuk', 'category_bileklik', 'category_setler'] as const).map((key) => (
                    <div key={key}>
                      <Slot section={key} />
                      <p className="text-[10px] font-body text-text-primary mt-1 text-center">
                        {SECTIONS[key].label.replace('Kategori — ', '')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Yeni Gelenler */}
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">Yeni Gelenler</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((slot) => (
                    <div key={slot}>
                      <Slot section="new_arrivals" slot={slot} aspectClass="aspect-[3/4]" />
                      <p className="text-[10px] font-body text-text-primary mt-1 truncate">
                        {getProduct((settings.new_arrivals || [])[slot])?.display_title || '—'}
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Carousel Sırası accordion ── */}
      {orderedFeaturedIds.length > 0 && (
        <div className="border border-champagne-mid mb-2">
          <AccordionHeader sectionKey="carousel" label="Carousel Sırası" />
          {openSections['carousel'] && (
            <div className="bg-white border-t border-champagne-mid p-2">
              {/* Action buttons */}
              <div className="flex items-center justify-end gap-1 mb-2">
                <button onClick={shuffleOrder} className="px-2 py-1 border border-champagne-mid text-xs font-body text-text-muted hover:border-gold hover:text-gold transition-colors">
                  ⇌ Rastgele
                </button>
                <button onClick={saveOrder} disabled={orderSaving} className="px-2 py-1 bg-gold text-white text-xs font-body uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50">
                  {orderSaving ? 'Kaydediliyor...' : orderSaved ? 'Kaydedildi ✓' : 'Sırayı Kaydet'}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-2" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Ürün ekle — ad veya barkod..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className={inputCls}
                  />
                  {orderSearch && (
                    <button onClick={() => setOrderSearch('')} className="px-2 py-1 border border-champagne-mid text-xs font-body text-text-muted hover:border-gold hover:text-gold transition-colors">✕</button>
                  )}
                </div>
                {orderSearch && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 border border-champagne-mid bg-white max-h-48 overflow-y-auto z-10 shadow-md">
                    {filteredOrderProducts
                      .filter((p: any) => !orderedFeaturedIds.includes(p.id))
                      .slice(0, 20)
                      .map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => setFeaturedOrder([...orderedFeaturedIds, p.id])}
                          className="w-full flex items-center gap-2 px-2 py-1 hover:bg-champagne transition-colors text-left border-b border-champagne-mid/30"
                        >
                          <div className="w-6 h-6 bg-champagne-dark shrink-0 overflow-hidden">
                            {(p.display_images?.[0] || p.trendyol_images?.[0]) && (
                              <img src={p.display_images?.[0] || p.trendyol_images?.[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <p className="text-xs font-body truncate">{p.display_title}</p>
                          <span className="ml-auto text-[10px] font-body text-gold shrink-0">+ Ekle</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Ordered grid */}
              <div className="grid grid-cols-6 xl:grid-cols-8 gap-2">
                {orderedFeaturedIds.map((id, i) => {
                  const p = getProduct(id)
                  if (!p) return null
                  const img = p.display_images?.[0] || p.trendyol_images?.[0]
                  return (
                    <div key={id} className="flex flex-col items-center gap-1">
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded relative bg-champagne-dark">
                        {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                        <span className="absolute top-0.5 left-0.5 text-[8px] font-body text-white bg-dark-mid/60 px-0.5 rounded">{i + 1}</span>
                        <button
                          onClick={() => setFeaturedOrder((prev) => prev.filter((fid) => fid !== id))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-[9px] text-white bg-red-500/70 hover:bg-red-600 rounded transition-colors"
                        >✕</button>
                      </div>
                      <p className="text-[10px] font-body text-text-primary truncate max-w-[96px] text-center">{p.display_title}</p>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => moveOrder(i, -1)}
                          disabled={i === 0}
                          className="w-5 h-5 flex items-center justify-center border border-champagne-mid text-[9px] hover:border-gold hover:text-gold disabled:opacity-30 transition-colors"
                        >←</button>
                        <button
                          onClick={() => moveOrder(i, 1)}
                          disabled={i === orderedFeaturedIds.length - 1}
                          className="w-5 h-5 flex items-center justify-center border border-champagne-mid text-[9px] hover:border-gold hover:text-gold disabled:opacity-30 transition-colors"
                        >→</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Normal slot picker modal ── */}
      {picker && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-champagne-mid">
              <h3 className="text-xs font-semibold font-body">
                {SECTIONS[picker.section].label}
                {!SECTIONS[picker.section].single && ` — Slot ${picker.slot + 1}`}
              </h3>
              <button onClick={() => setPicker(null)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
            </div>
            <div className="px-3 py-1.5 border-b border-champagne-mid">
              <input
                type="text"
                placeholder="Ürün adı veya barkod ile ara..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-2 py-1 border border-champagne-mid bg-white font-body text-xs text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredPicker.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-champagne transition-colors text-left border-b border-champagne-mid/30"
                >
                  <div className="w-8 h-8 bg-champagne-dark shrink-0 overflow-hidden">
                    {(p.display_images?.[0] || p.trendyol_images?.[0]) && (
                      <img src={p.display_images?.[0] || p.trendyol_images?.[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body truncate">{p.display_title}</p>
                    <p className="text-[10px] text-text-muted font-body">
                      {p.trendyol_barcode || ''} · {p.trendyol_category} · {formatPrice(p.custom_price ?? p.display_price)}
                    </p>
                  </div>
                </button>
              ))}
              {filteredPicker.length === 0 && (
                <p className="p-3 text-center text-text-muted text-xs font-body">Ürün bulunamadı</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Single mode picker modal ── */}
      {singlePicker && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-champagne-mid">
              <div>
                <h3 className="text-xs font-semibold font-body">Tek Ürün — Hero</h3>
                <p className="text-[10px] font-body text-text-muted">Seçilen ürün 3 slota da uygulanır</p>
              </div>
              <button onClick={() => setSinglePicker(false)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
            </div>
            <div className="px-3 py-1.5 border-b border-champagne-mid">
              <input
                type="text"
                placeholder="Ürün adı veya barkod ile ara..."
                value={singleSearch}
                onChange={(e) => setSingleSearch(e.target.value)}
                className="w-full px-2 py-1 border border-champagne-mid bg-white font-body text-xs text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredSinglePicker.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => selectSingleProduct(p.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-champagne transition-colors text-left border-b border-champagne-mid/30 ${heroSingleProductId === p.id ? 'bg-gold/10' : ''}`}
                >
                  <div className="w-8 h-8 bg-champagne-dark shrink-0 overflow-hidden">
                    {(p.display_images?.[0] || p.trendyol_images?.[0]) && (
                      <img src={p.display_images?.[0] || p.trendyol_images?.[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body truncate">{p.display_title}</p>
                    <p className="text-[10px] text-text-muted font-body">
                      {p.trendyol_barcode || ''} · {p.trendyol_category} · {formatPrice(p.custom_price ?? p.display_price)}
                    </p>
                  </div>
                  {heroSingleProductId === p.id && (
                    <span className="text-gold text-[10px] font-body shrink-0">✓</span>
                  )}
                </button>
              ))}
              {filteredSinglePicker.length === 0 && (
                <p className="p-3 text-center text-text-muted text-xs font-body">Ürün bulunamadı</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
