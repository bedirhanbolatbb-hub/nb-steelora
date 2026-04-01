'use client'

import { useState, useEffect, useRef } from 'react'

const CONTENT_LABELS: Record<string, string> = {
  hero_badge: 'Hero Rozet',
  hero_title_line1: 'Hero Başlık 1. Satır',
  hero_title_line2: 'Hero Başlık 2. Satır (italik)',
  hero_title_line3: 'Hero Başlık 3. Satır',
  hero_description: 'Hero Açıklama',
  hero_cta: 'Hero Buton Yazısı',
  marquee_text: 'Kayan Yazı',
  promo_bar_text: 'Promosyon Çubuğu',
  promo_bar_emoji: 'Promosyon Emoji',
  featured_title: 'Öne Çıkan Başlık',
  featured_subtitle: 'Öne Çıkan Alt Başlık',
  new_arrivals_title: 'Yeni Gelenler Başlık',
  new_arrivals_subtitle: 'Yeni Gelenler Alt Başlık',
  categories_title: 'Kategoriler Başlık',
}

const KEY_ORDER = Object.keys(CONTENT_LABELS)

export default function ContentEditor() {
  const [content, setContent] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetch('/api/admin/content')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          for (const row of data) map[row.key] = row.value
          setContent(map)
        }
        setLoading(false)
      })
  }, [])

  const handleChange = (key: string, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }))
    setSaved((prev) => ({ ...prev, [key]: false }))

    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      setSaving((prev) => ({ ...prev, [key]: true }))
      await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      setSaving((prev) => ({ ...prev, [key]: false }))
      setSaved((prev) => ({ ...prev, [key]: true }))
    }, 600)
  }

  if (loading) {
    return <p className="text-text-muted font-body text-sm">Yükleniyor...</p>
  }

  return (
    <div>
      <h2 className="font-heading text-[24px] text-text-primary mb-2">İçerik Yönetimi</h2>
      <p className="text-[11px] font-body text-text-muted mb-8">Değişiklikler otomatik kaydedilir.</p>
      <div className="bg-white divide-y divide-champagne-mid/30">
        {KEY_ORDER.map((key) => (
          <div key={key} className="flex items-center gap-4 px-4 py-3">
            <label className="w-52 shrink-0 text-[12px] font-body text-text-muted">
              {CONTENT_LABELS[key]}
            </label>
            <input
              type="text"
              value={content[key] ?? ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={`(${CONTENT_LABELS[key]})`}
              className="flex-1 px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted/50 focus:border-gold focus:outline-none transition-colors"
            />
            <span className="w-16 text-right text-[10px] font-body shrink-0">
              {saving[key] && <span className="text-text-muted">kaydediliyor…</span>}
              {!saving[key] && saved[key] && <span className="text-green-600">✓ kaydedildi</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
