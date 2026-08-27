import Link from 'next/link'
import GiftBoxAnimation from '@/components/store/GiftBoxAnimation'
import SiparisNoKarti from '@/components/store/SiparisNoKarti'

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
      {/* Faz 11C: onay maili ulaşmazsa müşterinin elindeki tek kayıt bu
          ekran — numara büyük, kopyalanabilir, "not alın" uyarılı ve mail
          gelmezse tekrar gönderme düğmeli. */}
      {orderNumber && <SiparisNoKarti orderNumber={orderNumber} />}
      <p className="text-[12px] font-body text-muted mb-8">
        Sipariş onay e-postası kayıtlı adresinize gönderildi — birkaç dakika içinde
        gelmezse gereksiz (spam) klasörünü kontrol edin.
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
          className="inline-block border border-line text-ink-soft text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:border-accent-line hover:text-accent-deep transition-all"
        >
          Alışverişe Devam
        </Link>
      </div>
    </div>
  )
}
