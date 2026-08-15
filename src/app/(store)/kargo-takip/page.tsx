import type { Metadata } from 'next'
import KargoTakipClient from './KargoTakipClient'

export const metadata: Metadata = {
  title: 'Kargo Takip',
  description: 'Sipariş numaranız ve e-postanızla ya da takip kodunuzla kargonuzun durumunu görün.',
}

export default async function KargoTakipPage({
  searchParams,
}: {
  searchParams: Promise<{ kod?: string; no?: string }>
}) {
  const sp = await searchParams
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <header className="mx-auto max-w-[560px] text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent">Sipariş takibi</p>
        <h1 className="mt-3 font-heading text-[34px] font-medium leading-[1.15] text-ink sm:text-[46px]">
          Kargonuz nerede?
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
          Sipariş numaranız ve sipariş sırasında kullandığınız e-posta ile sorgulayabilir, ya da
          size ilettiğimiz takip kodunu girebilirsiniz.
        </p>
      </header>

      <KargoTakipClient onTakipKodu={sp.kod ?? ''} onSiparisNo={sp.no ?? ''} />
    </div>
  )
}
