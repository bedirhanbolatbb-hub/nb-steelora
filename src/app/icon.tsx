import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#2d1a1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
        }}
      >
        <div
          style={{
            color: '#c4768a',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -1,
            fontFamily: 'serif',
          }}
        >
          NB
        </div>
      </div>
    ),
    { ...size }
  )
}
