'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PButton, PCard, PInput, PTextarea } from '../_components/ui'
import { useToast } from '../_components/overlays'

/**
 * Anahtar → insan etiketi + açıklama. Bilinmeyen anahtarlar da düzenlenebilir
 * (etiket yerine anahtar adı basılır) — panel veri kaybettirmez.
 */
const ETIKETLER: Record<string, { etiket: string; not?: string; genis?: boolean }> = {
  marquee_text: { etiket: 'Kayan şerit (marquee)', not: 'Vitrinde birkaç dakikada güncellenir.', genis: true },
  promo_bar_text: { etiket: 'Promo çubuğu metni', not: 'Vitrinde birkaç dakikada güncellenir.' },
  promo_bar_emoji: { etiket: 'Promo çubuğu emojisi' },
  hero_badge: { etiket: 'Hero — eyebrow rozeti' },
  hero_title_line1: { etiket: 'Hero — başlık 1. satır' },
  hero_title_line2: { etiket: 'Hero — başlık 2. satır (italik)' },
  hero_title_line3: { etiket: 'Hero — başlık 3. satır' },
  hero_description: { etiket: 'Hero — açıklama', genis: true },
  hero_cta: { etiket: 'Hero — buton metni' },
  hero_single_mode: { etiket: 'Hero tek görsel modu', not: "'true' ya da 'false'" },
  categories_title: { etiket: 'Kategoriler bölüm başlığı' },
  featured_order: { etiket: 'Öne çıkanlar sıra anahtarı (teknik)' },
  instagram_url: { etiket: 'Instagram adresi', not: 'Boşsa vitrinde ikon ve şema alanı basılmaz.' },
  facebook_url: { etiket: 'Facebook adresi', not: 'Boşsa vitrinde ikon ve şema alanı basılmaz.' },
  x_url: { etiket: 'X (Twitter) adresi', not: 'Boşsa vitrinde ikon ve şema alanı basılmaz.' },
}

const GRUPLAR: { baslik: string; anahtarlar: string[] }[] = [
  { baslik: 'Duyurular', anahtarlar: ['marquee_text', 'promo_bar_text', 'promo_bar_emoji'] },
  {
    baslik: 'Hero',
    anahtarlar: ['hero_badge', 'hero_title_line1', 'hero_title_line2', 'hero_title_line3', 'hero_description', 'hero_cta', 'hero_single_mode'],
  },
  { baslik: 'Sosyal bağlantılar', anahtarlar: ['instagram_url', 'facebook_url', 'x_url'] },
  { baslik: 'Diğer', anahtarlar: [] },
]

export default function SiteMetinleriClient({
  metinler,
}: {
  metinler: { key: string; value: string }[]
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [degerler, setDegerler] = useState<Record<string, string>>(
    Object.fromEntries(metinler.map((m) => [m.key, m.value]))
  )
  const [kaydedilen, setKaydedilen] = useState<string | null>(null)

  const orijinal = Object.fromEntries(metinler.map((m) => [m.key, m.value]))
  const gruplu = new Set(GRUPLAR.flatMap((g) => g.anahtarlar))
  const digerleri = metinler.map((m) => m.key).filter((k) => !gruplu.has(k))

  const kaydet = async (key: string) => {
    setKaydedilen(key)
    try {
      const res = await fetch('/api/panel/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: degerler[key] ?? '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Kaydedildi — vitrin birkaç dakika içinde güncellenir', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydedilen(null)
  }

  const Alan = ({ anahtar }: { anahtar: string }) => {
    const meta = ETIKETLER[anahtar] ?? { etiket: anahtar }
    const degisti = (degerler[anahtar] ?? '') !== (orijinal[anahtar] ?? '')
    return (
      <div>
        <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">
          {meta.etiket} <code className="ml-1 text-[10px] text-[var(--p-muted)]">{anahtar}</code>
        </label>
        <div className="flex items-start gap-2">
          {meta.genis ? (
            <PTextarea
              rows={2}
              value={degerler[anahtar] ?? ''}
              onChange={(e) => setDegerler({ ...degerler, [anahtar]: e.target.value })}
            />
          ) : (
            <PInput
              value={degerler[anahtar] ?? ''}
              onChange={(e) => setDegerler({ ...degerler, [anahtar]: e.target.value })}
            />
          )}
          <PButton
            variant={degisti ? 'primary' : 'ghost'}
            disabled={!degisti || kaydedilen === anahtar}
            onClick={() => kaydet(anahtar)}
          >
            {kaydedilen === anahtar ? '…' : 'Kaydet'}
          </PButton>
        </div>
        {meta.not && <p className="mt-1 text-[11px] text-[var(--p-muted)]">{meta.not}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {GRUPLAR.map((g) => {
        const anahtarlar = g.baslik === 'Diğer' ? digerleri : g.anahtarlar.filter((k) => k in orijinal)
        if (anahtarlar.length === 0) return null
        return (
          <PCard key={g.baslik} title={g.baslik}>
            <div className="space-y-4">
              {anahtarlar.map((k) => (
                <Alan key={k} anahtar={k} />
              ))}
            </div>
          </PCard>
        )
      })}
    </div>
  )
}
