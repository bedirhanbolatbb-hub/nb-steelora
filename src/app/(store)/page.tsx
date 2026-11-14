import type { Metadata } from 'next'
import AnaSayfa from '@/components/home/AnaSayfa'
import { ANA_SAYFA_ACIKLAMASI, ANA_SAYFA_BASLIGI, sayfaUstVerisi } from '@/lib/seo'

/**
 * Ana sayfanın kendi canonical'ı: apex→www yönlendirmesi ve ?utm_* gibi izleme
 * parametreleri aynı sayfayı çoğaltıyordu (Faz 11F kapanış denetimi).
 *
 * Kök layout'a KONULMAZ: alternates miras alınır ve canonical'ı olmayan her
 * sayfa (/giris, /sepet, /favorilerim …) kendini ana sayfa ilan ederdi.
 */
//
// Kasım 2026: başlık, açıklama ve paylaşım kartı da sayfanın kendisinde
// (sayfaUstVerisi → canonical '/' dahil). Önceden başlık kök layout'un
// "Fine Jewellery" varsayılanından geliyordu.
export const metadata: Metadata = sayfaUstVerisi({
  tamBaslik: ANA_SAYFA_BASLIGI,
  aciklama: ANA_SAYFA_ACIKLAMASI,
  yol: '/',
})

/**
 * Ana sayfa önbellekten verilir (1 saat; panel kaydı ve Trendyol senkronu
 * hemen tazeler — lib/cache/vitrin). 14 Kas 2026, ücretsiz plandaki sunucu
 * süresi sınırı. Gövde components/home/AnaSayfa'da; panel önizlemesi /onizleme'de.
 */
export const revalidate = 3600

export default function HomePage() {
  return <AnaSayfa onizleme={null} />
}
