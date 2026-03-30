'use client'

import { useState } from 'react'
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

  const getProduct = (id: string) => products.find((p) => p.id === id)
  const getImage = (section: string, slot = 0) => {
    const ids = settings[section] || []
    const p = getProduct(ids[slot])
    return p?.display_images?.[0] || p?.trendyol_images?.[0] || null
  }

  const selectProduct = (productId: string) => {
    if (!picker) return
    const { section, slot } = picker
    const ids = [...(settings[section] || [])]
    ids[slot] = productId
    setSettings({ ...settings, [section]: ids })
    setPicker(null)
    setPickerSearch('')
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
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filteredPicker = products.filter((p: any) => {
    if (!p.is_active) return false
    if (!pickerSearch) return true
    const q = pickerSearch.toLowerCase()
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
        <p className="text-[9px] font-body text-gold uppercase tracking-widest mb-2">Hero Bölümü</p>
        <div className="grid grid-cols-2 gap-1 mb-6">
          <div className="bg-dark-mid p-6 flex flex-col justify-center">
            <span className="text-[8px] text-gold uppercase tracking-widest font-body">Yeni Koleksiyon — 2026</span>
            <p className="font-heading text-[24px] text-champagne font-light leading-tight mt-2">
              Her anın <span className="italic text-gold">zarif</span> tanığı
            </p>
          </div>
          <div className="grid grid-rows-2 grid-cols-2 gap-1">
            <div className="col-span-2">
              <Slot section="hero_top" aspectClass="aspect-[2/1]" />
            </div>
            <Slot section="hero_bottom_left" />
            <Slot section="hero_bottom_right" />
          </div>
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

      {/* ── Picker Modal ── */}
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
    </div>
  )
}
