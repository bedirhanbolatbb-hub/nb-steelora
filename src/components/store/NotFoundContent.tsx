import Link from 'next/link'
import { WHATSAPP_URL } from '@/lib/contact'
import { CATEGORIES } from '@/lib/catalog/categories'

/**
 * Markalı 404 içeriği. Hem kök not-found hem de mağaza içi not-found bunu kullanır.
 *
 * Faz 18: katalogda 88 pasif ürün var ve hepsinin eski adresi burada bitiyor.
 * Birebir karşılığı olan 4 tanesi kalıcı yönlendirmeyle kurtarıldı; kalanı
 * gerçekten kalktığı için 404 kalıyor. Ziyaretçiyi çıkmaz bir sayfada
 * bırakmamak adına kategori kapıları eklendi — kalkmış ürünlerin dağılımı da
 * (25 bileklik, 21 kolye, 12 küpe …) tam olarak bu kapılara denk düşüyor.
 */
export default function NotFoundContent() {
  return (
    <div className="max-w-xl mx-auto px-4 lg:px-8 py-16 lg:py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-heading text-[30px] lg:text-[40px] font-medium text-ink mt-3 leading-tight">
        Bu sayfayı bulamadık
      </h1>
      <p className="mt-4 font-body text-[15px] leading-relaxed text-ink-soft">
        Sayfa kaldırılmış ya da adres yanlış yazılmış olabilir. Aşağıdaki kategorilerden
        devam edebilirsiniz.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((k) => (
          <Link
            prefetch={false}
            key={k.slug}
            href={`/kategori/${k.slug}`}
            className="inline-flex min-h-[44px] items-center rounded-[4px] border border-line-strong px-4 font-body text-[14px] text-ink transition-colors hover:border-ink"
          >
            {k.title}
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          prefetch={false}
          href="/urunler"
          className="basis inline-flex min-h-[52px] w-full items-center justify-center rounded-[4px] bg-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep sm:w-auto"
        >
          Tüm Ürünler
        </Link>
        <Link
          prefetch={false}
          href="/"
          className="basis inline-flex min-h-[52px] w-full items-center justify-center rounded-[4px] border border-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-bg sm:w-auto"
        >
          Ana Sayfa
        </Link>
      </div>

      <p className="mt-10 font-body text-[14px] text-ink-soft">
        Belirli bir ürünü arıyorsanız adını{' '}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline decoration-accent underline-offset-4"
        >
          WhatsApp&apos;tan yazın
        </a>
        ; birlikte bulalım.
      </p>
    </div>
  )
}
