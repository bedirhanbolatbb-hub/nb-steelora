import { getSiteContent } from '@/lib/supabase/content'

export default async function Marquee() {
  const c = await getSiteContent()
  const text = c.marquee_text || 'Ücretsiz Kargo • Premium Çelik Takılar • Güvenli Ödeme • Kolay İade • Özel Hediye Paketi'

  return (
    <div className="bg-dark py-3 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap flex">
        <span className="text-gold text-[10px] uppercase tracking-[0.2em] font-body">
          {text} &bull; {text} &bull;&nbsp;
        </span>
      </div>
    </div>
  )
}
