import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function BasarisizPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle size={32} className="text-red-600" />
      </div>
      <h1 className="font-heading text-[32px] text-text-primary mb-3">
        Ödeme Başarısız
      </h1>
      <p className="text-[12px] font-body text-text-muted mb-8 leading-relaxed">
        Ödeme işlemi tamamlanamadı. Lütfen kart bilgilerinizi kontrol edip
        tekrar deneyin veya farklı bir kart kullanın.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/odeme"
          className="inline-block bg-gold text-white text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:bg-gold-light transition-all"
        >
          Tekrar Dene
        </Link>
        <Link
          href="/urunler"
          className="inline-block border border-champagne-mid text-text-secondary text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:border-gold hover:text-gold transition-all"
        >
          Alışverişe Dön
        </Link>
      </div>
    </div>
  )
}
