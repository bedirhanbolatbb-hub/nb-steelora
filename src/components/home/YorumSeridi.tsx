import Link from 'next/link'
import { Star } from 'lucide-react'
import type { VitrinYorumu } from '@/lib/home/homeData'

/**
 * Gerçek yorum şeridi (Faz 11D).
 *
 * UYDURMA YORUM YOK: buraya yalnız panelden onaylanmış gerçek müşteri
 * yorumları düşer ve en az 3 onaylı yorum yoksa bölüm HİÇ render edilmez
 * (homeData eşiği). İlk yorumlar gelene kadar ana sayfada bu bölümün izi
 * bile yoktur — boş bölüm de sahte doluluk da basılmaz.
 */
export default function YorumSeridi({ yorumlar }: { yorumlar: VitrinYorumu[] }) {
  if (yorumlar.length < 3) return null

  return (
    <section className="bg-surface-muted/40">
      <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 text-center" data-reveal>
          <p className="eyebrow">Müşterilerimizden</p>
          <h2 className="mt-2 font-heading text-[30px] font-medium text-ink lg:text-[36px]">
            Gerçek yorumlar
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {yorumlar.slice(0, 6).map((y, i) => (
            <figure
              key={y.id}
              data-reveal
              style={{ '--reveal-delay': `${(i % 3) * 60}ms` } as React.CSSProperties}
              className="flex flex-col rounded-[4px] border border-line bg-bg p-5"
            >
              <div className="flex items-center gap-1" aria-label={`${y.puan} yıldız`}>
                {Array.from({ length: 5 }, (_, s) => (
                  <Star
                    key={s}
                    size={13}
                    className={s < y.puan ? 'fill-accent-deep text-accent-deep' : 'text-line'}
                    aria-hidden
                  />
                ))}
              </div>
              {y.baslik && (
                <p className="mt-2 font-body text-[13px] font-medium text-ink">{y.baslik}</p>
              )}
              <blockquote className="clamp-4 mt-1.5 flex-1 font-body text-[13px] leading-relaxed text-ink-soft">
                {y.metin}
              </blockquote>
              <figcaption className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <span className="font-body text-[12px] font-medium text-ink">{y.ad}</span>
                {y.dogrulanmis && (
                  <span className="rounded-[2px] border border-accent-line/50 px-1.5 py-0.5 font-body text-[9px] text-accent-deep">
                    Doğrulanmış alışveriş
                  </span>
                )}
                {y.urunSlug && (
                  <Link
                    href={`/urun/${y.urunSlug}`}
                    className="ml-auto font-body text-[11px] text-muted underline underline-offset-2 hover:text-accent-deep"
                  >
                    {y.urunAd}
                  </Link>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
