import type { Metadata } from 'next'

/**
 * İşlevsel sayfa — arama sonucunda yeri yok (Faz 11F kapanış denetimi).
 *
 * Sayfanın kendi başlığı/açıklaması olmadığı için ana sayfanın metnini birebir
 * tekrarlıyor ve index,follow ile taranıyordu; Search Console bunu "yinelenen
 * içerik, kullanıcı tarafından kurallı etiket seçilmedi" diye eliyor.
 *
 * metadata BURADA, layout'ta: page.tsx bir istemci bileşeni ('use client') ve
 * istemci bileşenleri metadata dışa aktaramaz.
 *
 * follow açık kalır — sayfadaki bağlantılar izlenmeye devam eder.
 */
export const metadata: Metadata = {
  title: 'Üye Ol',
  robots: { index: false, follow: true },
}

export default function KayitLayout({ children }: { children: React.ReactNode }) {
  return children
}
