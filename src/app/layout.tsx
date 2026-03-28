import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'NB Steelora | Fine Jewellery',
    template: '%s | NB Steelora',
  },
  description: 'Premium takı markası. Orijinal sertifikalı ürünler, güvenli ödeme ve hızlı kargo ile Türkiye\'nin dört bir yanına teslimat.',
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
    description: 'Premium takı markası. Orijinal sertifikalı ürünler.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NB Steelora | Fine Jewellery',
    description: 'Premium takı markası. Orijinal sertifikalı ürünler.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="h-full antialiased">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
