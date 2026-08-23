import Link from 'next/link'
import GiftBoxAnimation from '@/components/store/GiftBoxAnimation'

export default async function SiparisTamamlandiPage({
  searchParams,
}: {
  searchParams: Promise<{ siparis?: string }>
}) {
  const { siparis: orderNumber } = await searchParams

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="mb-6">
        <GiftBoxAnimation />
      </div>
      <h1 className="font-heading text-[34px] lg:text-[40px] font-medium text-ink mb-3">
        Siparişiniz Alındı
      </h1>
      <p className="text-[13px] font-body text-ink-soft mb-4 leading-relaxed">
        Ödemeniz başarıyla tamamlandı. Siparişinizi en kısa sürede hazırlayıp kargoya vereceğiz.
      </p>
      {orderNumber && (
        <div className="bg-surface border border-line rounded-[4px] px-6 py-4 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] font-body text-muted mb-1">
            Sipariş Numarası
          </p>
          <p className="price text-[18px] text-ink">{orderNumber}</p>
        </div>
      )}
      <p className="text-[12px] font-body text-muted mb-8">
        Sipariş onay e-postası kayıtlı adresinize gönderildi.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/hesabim"
          className="inline-block bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
        >
          Siparişlerim
        </Link>
        <Link
          href="/urunler"
          className="inline-block border border-line text-ink-soft text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:border-accent hover:text-accent-deep transition-all"
        >
          Alışverişe Devam
        </Link>
      </div>
    </div>
  )
}
