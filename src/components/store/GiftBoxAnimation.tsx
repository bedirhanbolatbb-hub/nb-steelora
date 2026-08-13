/**
 * Sipariş sonrası hediye kutusu mikro-animasyonu.
 * Saf SVG + CSS keyframes: JS yok, konfeti yok, bir kez oynar.
 * prefers-reduced-motion: reduce durumunda hareketsiz görünür (globals.css).
 */
export default function GiftBoxAnimation() {
  return (
    <svg
      viewBox="0 0 120 110"
      width="120"
      height="110"
      role="img"
      aria-label="Hediye kutusu"
      className="mx-auto"
    >
      {/* Parıltı */}
      <g className="gift-shine" style={{ transformOrigin: '60px 26px' }}>
        <path
          d="M60 12 L62.5 22 L72 24.5 L62.5 27 L60 37 L57.5 27 L48 24.5 L57.5 22 Z"
          fill="var(--accent)"
          opacity="0.9"
        />
      </g>

      {/* Kutu gövdesi */}
      <g className="gift-box">
        <rect x="26" y="46" width="68" height="50" rx="3" fill="var(--surface)" stroke="var(--line)" />
        <rect x="55" y="46" width="10" height="50" fill="var(--accent)" opacity="0.85" />
        <rect x="26" y="66" width="68" height="4" fill="var(--accent)" opacity="0.28" />
      </g>

      {/* Kapak + kurdele fiyongu */}
      <g className="gift-lid" style={{ transformOrigin: '60px 46px' }}>
        <rect x="20" y="34" width="80" height="14" rx="3" fill="var(--surface)" stroke="var(--line)" />
        <rect x="55" y="34" width="10" height="14" fill="var(--accent)" opacity="0.85" />
        <path
          d="M60 34 C52 30, 46 22, 52 20 C57 18.5, 59.5 27, 60 34 Z"
          fill="var(--accent)"
          opacity="0.9"
        />
        <path
          d="M60 34 C68 30, 74 22, 68 20 C63 18.5, 60.5 27, 60 34 Z"
          fill="var(--accent-deep)"
          opacity="0.9"
        />
      </g>
    </svg>
  )
}
