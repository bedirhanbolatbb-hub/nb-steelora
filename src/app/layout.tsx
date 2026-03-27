import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'NB Steelora | Fine Jewellery',
    template: '%s | NB Steelora',
  },
  description: 'Premium Türk takı markası. Kolye, küpe, yüzük, bileklik ve setlerde zarafeti keşfedin.',
  keywords: ['takı', 'kolye', 'küpe', 'yüzük', 'bileklik', 'altın kaplama', 'premium takı', 'NB Steelora'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
