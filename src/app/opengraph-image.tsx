import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#1A1610',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            color: '#D4AF50',
            fontSize: 72,
            fontWeight: 300,
            letterSpacing: 24,
            fontFamily: 'serif',
          }}
        >
          NB STEELORA
        </div>
        <div
          style={{
            color: '#D4C5A0',
            fontSize: 24,
            letterSpacing: 12,
            fontFamily: 'serif',
          }}
        >
          FINE JEWELLERY
        </div>
        <div
          style={{
            width: 80,
            height: 1,
            background: '#D4AF50',
            marginTop: 8,
          }}
        />
        <div
          style={{
            color: '#9A8870',
            fontSize: 18,
            letterSpacing: 6,
            marginTop: 8,
          }}
        >
          nbsteelora.com
        </div>
      </div>
    ),
    { ...size }
  )
}
