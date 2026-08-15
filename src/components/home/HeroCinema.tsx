import Image from 'next/image'
import Link from 'next/link'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'

/**
 * Hero v2 ("Sessiz Atölye") — kolaj yerine tek full-bleed sinema karesi.
 * Kaynak: Kürasyon'daki hero_top ürününün ilk görseli. Görsel yoksa boş krem
 * kutu ASLA basılmaz: ivory zemin + büyük tipografi fallback'ine düşer.
 * Metinler site_content'ten (mevcut anahtarlar), CTA'lar değişmedi.
 */
export default function HeroCinema({
  c,
  image,
  imageHref,
}: {
  c: Record<string, string>
  image: string | null
  imageHref: string | null
}) {
  const baslik1 = c.hero_title_line1 || 'Her anın'
  const baslik2 = c.hero_title_line2 || 'zarif'
  const baslik3 = c.hero_title_line3 || 'tanığı'

  const metinBlogu = (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 w-full">
      <div className="max-w-xl">
        <span className={`eyebrow hero-line ${image ? 'text-accent' : ''}`}>
          {c.hero_badge || 'Yeni Koleksiyon — 2026'}
        </span>
        <h1
          className={`font-heading text-[42px] sm:text-[56px] lg:text-[68px] font-medium leading-[1.05] mt-4 hero-line ${
            image ? 'text-white' : 'text-ink'
          }`}
          style={{ '--hero-delay': '70ms' } as React.CSSProperties}
        >
          {baslik1} <span className={`italic ${image ? 'text-[#E5C990]' : 'text-accent-deep'}`}>{baslik2}</span> {baslik3}
        </h1>
        <p
          className={`text-[13px] lg:text-[14px] font-body leading-relaxed mt-5 max-w-md hero-line ${
            image ? 'text-white/85' : 'text-ink-soft'
          }`}
          style={{ '--hero-delay': '140ms' } as React.CSSProperties}
        >
          {c.hero_description || '316L medikal çelik. Kararmaz, paslanmaz, solmaz.'}
        </p>
        <div
          className="flex flex-wrap items-center gap-5 mt-8 hero-line"
          style={{ '--hero-delay': '210ms' } as React.CSSProperties}
        >
          <Link
            href="/urunler"
            className={`inline-flex items-center text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] transition-colors ${
              image
                ? 'bg-bg text-ink hover:bg-accent hover:text-white'
                : 'bg-ink text-bg hover:bg-accent-deep'
            }`}
          >
            {c.hero_cta || 'Koleksiyonu Keşfet'}
          </Link>
          <Link
            href="/#one-cikanlar"
            className={`text-[11px] uppercase tracking-[0.16em] font-body underline underline-offset-4 transition-colors ${
              image ? 'text-white/80 hover:text-white' : 'text-accent-deep hover:text-accent'
            }`}
          >
            Öne Çıkanlar →
          </Link>
        </div>
      </div>
    </div>
  )

  if (!image) {
    // Zarif fallback: ivory zemin + büyük tipografi
    return (
      <section className="bg-surface-muted border-b border-line flex items-center min-h-[60vh] py-20">
        {metinBlogu}
      </section>
    )
  }

  return (
    <section className="relative min-h-[85vh] lg:min-h-[75vh] flex items-end lg:items-center overflow-hidden">
      {imageHref ? (
        <Link href={imageHref} className="absolute inset-0" aria-label="Hero ürününe git">
          <Image
            src={image}
            alt=""
            fill
            priority
            quality={IMAGE_QUALITY}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            className="object-cover hero-media"
          />
        </Link>
      ) : (
        <Image
          src={image}
          alt=""
          fill
          priority
          quality={IMAGE_QUALITY}
          sizes="100vw"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          className="object-cover hero-media"
        />
      )}

      {/* Alttan koyu gradyan — metin okunurluğu */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/10" />

      <div className="relative w-full pb-16 pt-40 lg:py-24">{metinBlogu}</div>
    </section>
  )
}
