import Image from 'next/image'
import { IMAGE_QUALITY, isRemoteMedia } from '@/lib/images'

/**
 * Instagram duvarı (Faz 11D).
 *
 * API BAĞLI DEĞİL — bilinçli karar: Instagram Graph API token bakımı ve
 * uygulama onayı ister; bunun yerine BB kareleri PANELDEN yönetir (Kürasyon →
 * Instagram duvarı: görsel + gönderi bağlantısı, en çok 9). Kare yoksa bölüm
 * HİÇ render edilmez.
 */
export default function InstagramDuvari({
  kareler,
  profil,
}: {
  kareler: { image_url: string; link: string }[]
  profil?: string | null
}) {
  if (!kareler.length) return null

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-20">
      <div className="mb-8 text-center" data-reveal>
        <p className="eyebrow">Instagram</p>
        <h2 className="mt-2 font-heading text-[30px] font-medium text-ink lg:text-[36px]">
          @nbsteelora
        </h2>
        {profil && (
          <a
            href={profil}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 font-body text-[12px] text-accent-deep underline underline-offset-4 hover:text-ink"
          >
            Bizi takip edin →
          </a>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {kareler.map((k, i) => (
          <a
            key={`${k.link}-${i}`}
            href={k.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram gönderisi ${i + 1}`}
            className="group relative aspect-square overflow-hidden rounded-[4px] bg-surface-muted"
            data-reveal
            style={{ '--reveal-delay': `${(i % 3) * 50}ms` } as React.CSSProperties}
          >
            <Image
              src={k.image_url}
              unoptimized={isRemoteMedia(k.image_url)}
              alt=""
              fill
              sizes="(max-width: 1024px) 33vw, 450px"
              quality={IMAGE_QUALITY}
              className="object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.04]"
            />
          </a>
        ))}
      </div>
    </section>
  )
}
