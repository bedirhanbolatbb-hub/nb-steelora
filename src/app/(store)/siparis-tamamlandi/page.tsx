import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function SiparisTamamlandiPage({
  searchParams,
}: {
  searchParams: { siparis?: string }
}) {
  const orderNumber = searchParams.siparis

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h1 className="font-heading text-[32px] font-light text-text-primary mb-3">
        Siparişiniz Alındı
      </h1>
      <p className="text-[13px] font-body text-text-secondary mb-4 leading-relaxed">
        Ödemeniz başarıyla tamamlandı. Siparişinizi en kısa sürede hazırlayıp kargoya vereceğiz.
      </p>
      {orderNumber && (
        <div className="bg-champagne border border-champagne-mid px-6 py-4 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] font-body text-text-muted mb-1">
            Sipariş Numarası
          </p>
          <p className="font-body text-[18px] font-medium text-gold">{orderNumber}</p>
        </div>
      )}
      <p className="text-[12px] font-body text-text-muted mb-8">
        Sipariş onay e-postası kayıtlı adresinize gönderildi.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/hesabim"
          className="inline-block bg-gold text-white text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:bg-gold-light transition-all"
        >
          Siparişlerim
        </Link>
        <Link
          href="/urunler"
          className="inline-block border border-champagne-mid text-text-secondary text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:border-gold hover:text-gold transition-all"
        >
          Alışverişe Devam
        </Link>
      </div>
    </div>
  )
}
