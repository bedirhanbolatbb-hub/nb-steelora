'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle } from 'lucide-react'

function BasariliContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h1 className="font-heading text-[32px] text-text-primary mb-3">
        Siparişiniz Alındı!
      </h1>
      {orderNumber && (
        <p className="text-[13px] font-body text-text-secondary mb-2">
          Sipariş Numarası:{' '}
          <span className="text-gold font-medium">{orderNumber}</span>
        </p>
      )}
      <p className="text-[12px] font-body text-text-muted mb-8 leading-relaxed">
        Siparişiniz başarıyla oluşturuldu. Onay e-postası kısa süre içinde
        gönderilecektir. Teşekkür ederiz!
      </p>
      <Link
        href="/urunler"
        className="inline-block border border-gold text-gold text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:bg-gold hover:text-white transition-all"
      >
        Alışverişe Devam Et
      </Link>
    </div>
  )
}

export default function BasariliPage() {
  return (
    <Suspense>
      <BasariliContent />
    </Suspense>
  )
}
