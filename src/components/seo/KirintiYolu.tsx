import Link from 'next/link'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo'

export type KirintiAdimi = { ad: string; path: string }

/**
 * Kırıntı yolu (Faz 11F kapanış).
 *
 * Görünür iz ile BreadcrumbList şeması AYNI listeden üretilir — biri
 * güncellenip diğeri unutulamaz. Ürün ve blog sayfalarında bu ikisi ayrı ayrı
 * yazılıydı ve belge sayfalarında hiç yoktu; şema ile ekranın eşleniği artık
 * yapısal olarak garanti.
 *
 * Son adım BULUNULAN sayfadır: bağlantı değil, düz metin olarak basılır
 * (kendine giden bir bağlantı gezinme değil, gürültüdür).
 */
export default function KirintiYolu({
  adimlar,
  className = 'mb-6',
}: {
  adimlar: KirintiAdimi[]
  className?: string
}) {
  if (adimlar.length < 2) return null
  const son = adimlar.length - 1

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(adimlar.map((a) => ({ name: a.ad, path: a.path })))} />
      <nav
        aria-label="breadcrumb"
        className={`flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-body text-muted ${className}`}
      >
        {adimlar.map((a, i) => (
          <span key={a.path} className="contents">
            {i > 0 && <span aria-hidden>/</span>}
            {i === son ? (
              <span
                aria-current="page"
                className="text-ink-soft normal-case tracking-normal truncate max-w-[240px]"
              >
                {a.ad}
              </span>
            ) : (
              <Link
                href={a.path}
                className="inline-block py-2.5 -my-2.5 hover:text-ink transition-colors"
              >
                {a.ad}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
