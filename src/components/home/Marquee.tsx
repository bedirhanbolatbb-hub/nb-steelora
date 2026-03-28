export default function Marquee() {
  const items = [
    'Ücretsiz Kargo',
    'Premium Çelik Takılar',
    'Güvenli Ödeme',
    'Kolay İade',
    'Özel Hediye Paketi',
  ]

  const content = items.map((item) => item + ' \u2022 ').join('')

  return (
    <div className="bg-dark py-3 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap flex">
        <span className="text-gold text-[10px] uppercase tracking-[0.2em] font-body">
          {content}{content}
        </span>
      </div>
    </div>
  )
}
