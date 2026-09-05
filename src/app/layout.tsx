import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

// latin-ext olmadan ğ/ş/ı/İ gibi karakterler fallback fonta düşer.
const display = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-display',
})

const sans = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'NB Steelora | Fine Jewellery',
    template: '%s | NB Steelora',
  },
  description: '316L çelik ve kaplama takı markası. Güvenli ödeme ve hızlı kargo ile Türkiye\'nin dört bir yanına teslimat.',
  keywords: ['takı', 'kolye', 'küpe', 'yüzük', 'bileklik', 'premium takı', 'NB Steelora'],
  authors: [{ name: 'NB Steelora' }],
  creator: 'NB Steelora',
  metadataBase: new URL('https://www.nbsteelora.com'),
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://www.nbsteelora.com',
    siteName: 'NB Steelora',
    title: 'NB Steelora | Fine Jewellery',
    description: '316L çelik ve kaplama takı markası. Güvenli ödeme ve hızlı kargo.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NB Steelora | Fine Jewellery',
    description: '316L çelik ve kaplama takı markası. Güvenli ödeme ve hızlı kargo.',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'KLeocfEgs-ztRnuoXebjx8HU8QvM5RF8HszV9tmjGdo',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`h-full antialiased ${display.variable} ${sans.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
