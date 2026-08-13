import { getSiteContent } from '@/lib/supabase/content'

export default async function Marquee() {
  const c = await getSiteContent()
  const text = c.marquee_text || 'Ücretsiz Kargo • Premium Çelik Takılar • Güvenli Ödeme • Kolay İade • Özel Hediye Paketi'

  // Şerit iki ÖZDEŞ kopyadan oluşur ve rayın genişliği içeriğe eşitlenir (w-max).
  // Eskiden tek span vardı ve ray, ebeveyn genişliğinde kalıyordu; animasyondaki
  // -50% dar ekranda 195px'e denk düşüp metni ortasından kesiyordu.
  const piece = `${text} • `

  return (
    <div className="bg-line overflow-hidden">
      <div className="animate-marquee flex w-max whitespace-nowrap py-3.5">
        {[0, 1].map((i) => (
          <span
            key={i}
            aria-hidden={i === 1}
            className="text-ink text-[11px] leading-[1.5] uppercase tracking-[0.18em] font-body pr-2"
          >
            {piece}
          </span>
        ))}
      </div>
    </div>
  )
}
