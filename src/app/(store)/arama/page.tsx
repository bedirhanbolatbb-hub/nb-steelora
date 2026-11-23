import type { Metadata } from 'next'
import AramaSonuclari from '@/components/store/AramaSonuclari'

/**
 * Arama sonuç sayfası (24 Kas 2026 tasarım denetimi).
 *
 * KUSUR: arama yalnız bir açılır pencereydi; sekiz satır gösteriyor, Enter'a
 * basınca hiçbir şey olmuyordu. Dokuzuncu sonucu görmenin, sonuçları kart
 * olarak karşılaştırmanın ya da aramayı paylaşmanın yolu yoktu.
 *
 * Sayfanın kendisi sunucuda veri OKUMAZ (kabuk durağan, sunucu süresi
 * harcamaz); sonuçlar tarayıcıdan /api/search ile gelir — pencereyle aynı
 * arama, aynı önbellek. Arama motoru dizinine alınmaz (noindex): sonsuz
 * sayıda sorgu adresi kataloğu çoğaltırdı.
 */
export const metadata: Metadata = {
  title: 'Arama',
  robots: { index: false, follow: true },
}

export default function AramaSayfasi() {
  return <AramaSonuclari />
}
