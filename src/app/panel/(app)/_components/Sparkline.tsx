/**
 * Kütüphanesiz SVG çizgi grafik (sunucu bileşeni — istemciye JS eklemez).
 * Değerler soldan sağa eski→yeni; alan dolgusu ve son gün noktasıyla.
 */
export default function Sparkline({
  values,
  width = 560,
  height = 64,
}: {
  values: number[]
  width?: number
  height?: number
}) {
  if (values.length < 2) return null

  const max = Math.max(...values, 1)
  const pad = 4
  const stepX = (width - pad * 2) / (values.length - 1)
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2)

  const points = values.map((v, i) => `${(pad + i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
  const area = `${pad},${height - pad} ${points.join(' ')} ${(width - pad).toFixed(1)},${height - pad}`
  const [lastX, lastY] = points[points.length - 1].split(',')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full"
      role="img"
      aria-label="Son 30 günün günlük ciro eğrisi"
      preserveAspectRatio="none"
    >
      <polygon points={area} fill="var(--p-accent-line)" opacity="0.12" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--p-accent-line)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--p-accent-deep)" />
    </svg>
  )
}
