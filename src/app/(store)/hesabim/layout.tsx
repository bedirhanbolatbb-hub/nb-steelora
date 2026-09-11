import type { Metadata } from 'next'

/**
 * İşlevsel sayfa — arama sonucunda yeri yok (Faz 31 denetimi).
 *
 * ÖLÇÜLEN KUSUR (11 Eyl, canlı): bu sayfanın kendi başlığı YOKTU, ana
 * sayfanın başlığını ("NB Steelora | Fine Jewellery") birebir tekrarlıyordu
 * ve index,follow ile taranabilir durumdaydı. Üyeye özel sayfa; arama
 * sonucunda çıkması hem anlamsız hem "yinelenen içerik" işareti.
 *
 * follow açık kalır — sayfadaki bağlantılar izlenmeye devam eder.
 */
export const metadata: Metadata = {
  title: 'Hesabım',
  robots: { index: false, follow: true },
}

export default function Duzen({ children }: { children: React.ReactNode }) {
  return children
}
