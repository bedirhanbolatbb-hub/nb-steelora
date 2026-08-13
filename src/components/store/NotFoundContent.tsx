import Link from 'next/link'

/**
 * Markalı 404 içeriği. Hem kök not-found hem de mağaza içi not-found bunu kullanır.
 */
export default function NotFoundContent() {
  return (
    <div className="max-w-xl mx-auto px-4 lg:px-8 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-heading text-[34px] lg:text-[40px] font-semibold text-ink mt-3 leading-tight">
        Aradığınız parça burada değil
      </h1>
      <p className="text-[13px] font-body text-ink-soft mt-4 leading-relaxed">
        Bu sayfa kaldırılmış ya da adres yanlış yazılmış olabilir. Koleksiyonun tamamı
        birkaç adım ötede.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/urunler"
          className="inline-flex items-center bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
        >
          Koleksiyona Dön
        </Link>
        <Link
          href="/"
          className="inline-flex items-center border border-ink text-ink text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-ink hover:text-bg transition-colors"
        >
          Ana Sayfa
        </Link>
      </div>

      <p className="mt-10 text-[11px] font-body text-muted">
        Aradığınızı bulamadıysanız{' '}
        <a
          href="https://wa.me/905536552020"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-deep underline underline-offset-2"
        >
          WhatsApp&apos;tan yazın
        </a>
        , yardımcı olalım.
      </p>
    </div>
  )
}
