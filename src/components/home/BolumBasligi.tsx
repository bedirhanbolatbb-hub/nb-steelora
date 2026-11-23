import Link from 'next/link'

/**
 * Ana sayfa bölüm başlığı — TEK KALIP (24 Kas 2026 tasarım denetimi).
 *
 * Eskiden her bölüm ortalı bir üst etiket ("Keşfet", "Seçki", "Taze",
 * "Hikâyeler", "Günlük") + 30 px başlık basıyordu: etiketler bilgi taşımıyor,
 * her bölüm ~70 px fazladan yer tutuyor, "tümünü gör" bağlantıları telefonda
 * hiç görünmüyordu. Artık başlık sola yaslı, isteğe bağlı bağlantı aynı
 * satırın sağında ve telefonda da var (44 px dokunma alanı).
 */
export default function BolumBasligi({
  baslik,
  href,
  etiket = 'Tümü',
  aciklama,
  acik = false,
}: {
  baslik: string
  href?: string
  etiket?: string
  /** Başlığın altındaki tek satır (panelden gelen alt başlık). */
  aciklama?: string | null
  /** Koyu zemin üstünde açık yazı. */
  acik?: boolean
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 lg:mb-8" data-reveal>
      <div className="min-w-0">
        <h2
          className={`font-heading text-[24px] font-medium leading-tight lg:text-[32px] ${acik ? 'text-bg' : 'text-ink'}`}
        >
          {baslik}
        </h2>
        {aciklama && (
          <p className={`mt-1 font-body text-[14px] ${acik ? 'text-line/80' : 'text-ink-soft'}`}>{aciklama}</p>
        )}
      </div>
      {href && (
        <Link
          prefetch={false}
          href={href}
          className={`-my-2.5 flex min-h-[44px] shrink-0 items-center whitespace-nowrap font-body text-[14px] underline decoration-accent underline-offset-4 transition-colors ${
            acik ? 'text-bg hover:text-accent' : 'text-ink hover:text-accent-deep'
          }`}
        >
          {etiket}
        </Link>
      )}
    </div>
  )
}
