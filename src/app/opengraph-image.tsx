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
          background: '#2d1a1f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            color: '#c4768a',
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
            color: '#e0b8c4',
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
            background: '#c4768a',
            marginTop: 8,
          }}
        />
        <div
          style={{
            color: '#a07080',
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
