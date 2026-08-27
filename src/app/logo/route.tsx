import { ImageResponse } from 'next/og'

/**
 * Kare marka logosu — 512×512 (Faz 11F kapanış).
 *
 * Organization.logo ve Article.publisher.logo şimdiye kadar /opengraph-image'i
 * gösteriyordu: 1200×630 bir paylaşım kartı. Google bilgi panelinde ve satıcı
 * logosu yuvalarında bu kart kareye yakın kırpılıyor, geriye ya boş koyu zemin
 * ya kesik yazı kalıyordu. Paylaşım kartı og:image olarak DOĞRU; logo için
 * yanlıştı.
 *
 * Marka işareti icon.tsx'teki (32×32 favicon) kelime markasının aynısı —
 * yeni bir tasarım uydurulmadı, var olan işaret kare tuvalde ölçeklendi.
 *
 * BB panelden gerçek bir logo dosyası yüklerse (site-metinleri → Marka logosu)
 * Organization.logo ona döner; bu rota varsayılan olarak kalır.
 */
export const contentType = 'image/png'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#2A1E1E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            color: '#C89080',
            fontSize: 190,
            fontWeight: 700,
            letterSpacing: -8,
            fontFamily: 'serif',
            lineHeight: 1,
          }}
        >
          NB
        </div>
        <div style={{ width: 132, height: 1, background: '#C89080' }} />
        <div
          style={{
            color: '#F0E0D8',
            fontSize: 38,
            letterSpacing: 9,
            fontFamily: 'serif',
          }}
        >
          STEELORA
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        // İçerik koda bağlı; dağıtımlar arasında değişmez.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    }
  )
}
